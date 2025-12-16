// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Log, LogLevel, LogStreamMode, LogType } from "@/types";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { useInstanceStream, type StreamMessage } from "@/hooks/use-instance-stream";
import type { LogTimeRange } from "@/components/log-time-selector";

export function useInstanceLogs(
  instanceId?: string,
  logType?: LogType,
  initialMode?: LogStreamMode,
  timeRange: LogTimeRange = "live",
  selectedLevel: "ALL" | LogLevel = "ALL",
) {
  const subscriberId = useId();
  const { isConnected, error: streamError, sendJson, subscribe, unsubscribe } = useInstanceStream();
  const [logs, setLogs] = useState<Log[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [lastOffset, setLastOffset] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const logCounterRef = useRef(0);
  const logBufferRef = useRef<Log[]>([]);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastOffsetRef = useRef(0);
  const hasSubscribedRef = useRef(false);

  // Flush buffered logs to state
  const flushLogs = useCallback(() => {
    if (logBufferRef.current.length > 0) {
      setLogs(prev => [...prev, ...logBufferRef.current]);
      logBufferRef.current = [];
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((message: StreamMessage) => {
    try {
      if (message.kind === "log_subscribed") {
        setCurrentStreamId(message.streamId as string);
        console.log(`Subscribed to ${message.path}, streamId: ${message.streamId}`);
      }

      if (message.kind === "log_chunk" && Array.isArray(message.entries)) {
        const entries = message.entries as any[];
        const newLogs: Log[] = entries.map((entry: any) => {
          const { msg, level, time, ...rest } = entry || {};
          const metadata: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(rest || {})) {
            if (value !== undefined && value !== null) {
              metadata[key] = value;
            }
          }

          return {
            id: `log-${logCounterRef.current++}`,
            message: msg ?? "",
            level: level?.toUpperCase() || "INFO",
            timestamp: new Date(time),
            ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
          };
        });

        // Buffer logs 
        logBufferRef.current.push(...newLogs);

        if (typeof message.offset === "number") {
          setLastOffset((message.offset as number) + entries.length);
        }
        
        if (!flushTimerRef.current) {
          flushTimerRef.current = setTimeout(() => {
            flushLogs();
            flushTimerRef.current = null;
          }, 100); // 100ms batching window
        }
      }

      if (message.kind === "error") {
        setError(message.message as string);
      }
    } catch (parseError) {
      setError((parseError as Error).message || "Failed to parse log message");
    }
  }, [flushLogs]);

  useEffect(() => {
    lastOffsetRef.current = lastOffset;
  }, [lastOffset]);

  // Start streaming logs on-demand
  const startStreaming = useCallback((fromOffset?: number) => {
    if (!instanceId || !logType) return;

    if (!isStreaming) {
      subscribe(subscriberId, handleMessage);
      setIsStreaming(true);
    }

    if (isConnected) {
      const startOffset = fromOffset ?? (timeRange === "live" ? lastOffsetRef.current : 0);
      
      sendJson({
        kind: "log_subscribe",
        path: logType,
        startOffset,
        instanceId,
      });
      hasSubscribedRef.current = true;
    }
  }, [instanceId, logType, isStreaming, isConnected, timeRange, subscriberId, subscribe, handleMessage, sendJson]);

  // Stop streaming logs
  const stopStreaming = useCallback(() => {
    if (currentStreamId && isConnected) {
      sendJson({
        kind: "log_unsubscribe",
        streamId: currentStreamId,
      });
    }
    
    unsubscribe(subscriberId);
    hasSubscribedRef.current = false;
    setIsStreaming(false);
    setCurrentStreamId(null);
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushLogs();
    }
  }, [subscriberId, unsubscribe, flushLogs, currentStreamId, isConnected, sendJson]);

  const restartStream = useCallback((newTimeRange?: LogTimeRange) => {
    if (!instanceId || !logType || !isConnected) return;

    const effectiveRange = newTimeRange ?? timeRange;
    const isHistorical = effectiveRange !== "live";

    // Unsubscribe from current stream on server
    if (currentStreamId) {
      sendJson({
        kind: "log_unsubscribe",
        streamId: currentStreamId,
      });
      setCurrentStreamId(null);
    }

    // Clear logs when switching to historical mode (need fresh fetch from beginning)
    // Also clear when switching between different historical ranges
    if (isHistorical) {
      setLogs([]);
      logBufferRef.current = [];
      logCounterRef.current = 0;
      setLastOffset(0);
      lastOffsetRef.current = 0;
    }

    // Ensure we're subscribed to message handlers
    if (!isStreaming) {
      subscribe(subscriberId, handleMessage);
      setIsStreaming(true);
    }
    
    // For historical ranges, start from beginning (0) to get all logs for filtering
    // For live, continue from current offset to follow new logs
    const startOffset = isHistorical ? 0 : lastOffsetRef.current;
    
    console.log(`[restartStream] Sending log_subscribe: path=${logType}, startOffset=${startOffset}, isHistorical=${isHistorical}`);
    
    sendJson({
      kind: "log_subscribe",
      path: logType,
      startOffset,
      instanceId,
    });
    hasSubscribedRef.current = true;
  }, [instanceId, logType, isConnected, isStreaming, currentStreamId, timeRange, sendJson, subscribe, subscriberId, handleMessage]);

  // Send log_subscribe when connection becomes available while streaming
  useEffect(() => {
    if (!isConnected || !instanceId || !logType || !isStreaming || hasSubscribedRef.current) return;

    sendJson({
      kind: "log_subscribe",
      path: logType,
      startOffset: lastOffsetRef.current,
      instanceId,
      lastOffset,
    });
    hasSubscribedRef.current = true;
  }, [isConnected, instanceId, logType, isStreaming, lastOffset, sendJson]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isStreaming) {
        unsubscribe(subscriberId);
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
        }
      }
    };
  }, [isStreaming, subscriberId, unsubscribe]);

  // Defer filtering to avoid blocking on heavy updates
  const deferredLogs = useDeferredValue(logs);
  
  // Log level hierarchy (from least to most severe)
  const logLevelHierarchy = ["DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY"] as const;
  
  // Filter logs based on level (selected level and above/more severe) and search query
  const filteredLogs = useMemo(() => {
    let filtered = deferredLogs;

    if (selectedLevel !== "ALL") {
      const selectedLevelIndex = logLevelHierarchy.indexOf(selectedLevel as any);
      filtered = filtered.filter(log => {
        if (!log.level) return false;
        const logLevelIndex = logLevelHierarchy.indexOf(log.level as any);
        // Include logs at selected level and above (more severe)
        return logLevelIndex >= selectedLevelIndex;
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return filtered;
  }, [deferredLogs, selectedLevel, searchQuery]);

  // Auto-scroll to bottom when new logs arrive (only if already at bottom)
  useEffect(() => {
    if (initialMode !== "tail") return;
    
    // Only auto-scroll if we're already near the bottom (within 100px)
    const container = logsEndRef.current?.parentElement;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    if (isNearBottom) {
      logsEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [filteredLogs, initialMode]);

  return {
    logs: deferredLogs,
    filteredLogs,
    searchQuery,
    logsEndRef,
    isConnected,
    isStreaming,
    error: error || streamError,
    currentStreamId,
    lastOffset,
    setSearchQuery,
    startStreaming,
    stopStreaming,
    restartStream,
  };
}
