// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Log, LogLevel, LogStreamMode, LogType } from "@/types";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useClusterId } from "@/hooks/use-cluster-id";

export function useInstanceLogs(
  instanceId?: string,
  logType?: LogType,
  initialMode?: LogStreamMode,
) {
  const clusterId = useClusterId();
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | LogLevel>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [lastOffset, setLastOffset] = useState(0);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 5;
  const logCounterRef = useRef(0);
  const logBufferRef = useRef<Log[]>([]);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastOffsetRef = useRef(0);

  // Flush buffered logs to state
  const flushLogs = useCallback(() => {
    if (logBufferRef.current.length > 0) {
      setLogs(prev => [...prev, ...logBufferRef.current]);
      logBufferRef.current = [];
    }
  }, []);

  const connect = useCallback(() => {
    if (!instanceId || !clusterId || !logType) return;

    const base = import.meta.env.VITE_BASE_URL || "";
    const wsBase = base.replace(/^http/i, "ws");
    const url = `${wsBase}/v1/instances/${encodeURIComponent(instanceId)}/stream?clusterId=${encodeURIComponent(clusterId)}`;

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setError(null);
        retriesRef.current = 0;
        
        // Subscribe with logType and last known offset
        socket.send(
          JSON.stringify({
            kind: "log_subscribe",
            path: logType,
            startOffset: lastOffsetRef.current,
          }),
        );
      };

      socket.onmessage = event => {
        try {
          const data = JSON.parse(event.data as string);

          if (data.kind === "log_subscribed") {
            setCurrentStreamId(data.streamId);
            console.log(`Subscribed to ${data.path}, streamId: ${data.streamId}`);
          }

          if (data.kind === "log_chunk" && Array.isArray(data.entries)) {
            const entries = data.entries as any[];
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

            // Buffer logs instead of immediate state update
            logBufferRef.current.push(...newLogs);

            if (typeof data.offset === "number") {
              setLastOffset(data.offset + entries.length);
            }
            
            // Schedule flush if not already scheduled
            if (!flushTimerRef.current) {
              flushTimerRef.current = setTimeout(() => {
                flushLogs();
                flushTimerRef.current = null;
              }, 100); // 100ms batching window
            }
          }

          if (data.kind === "error") {
            setError(data.message);
          }
        } catch (parseError) {
          setError((parseError as Error).message || "Failed to parse log message");
        }
      };

      socket.onerror = () => {
        setIsConnected(false);
        setError("WebSocket error occurred");
      };

      socket.onclose = () => {
        setIsConnected(false);
        
        // Auto-reconnect with exponential backoff
        if (retriesRef.current < maxRetries) {
          const attempt = retriesRef.current + 1;
          const delay = attempt <= 3
            ? 1000
            : Math.min(1000 * Math.pow(2, attempt - 3), 10000);
          retriesRef.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${retriesRef.current}/${maxRetries})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError("Connection lost. Max retries exceeded.");
        }
      };
    } catch (connectError) {
      setError((connectError as Error).message || "Failed to connect to log stream");
      setIsConnected(false);
    }
  }, [instanceId, clusterId, logType]);

  useEffect(() => {
    lastOffsetRef.current = lastOffset;
  }, [lastOffset]);

  useEffect(() => {
    if (!instanceId || !logType || !initialMode) return;

    connect();

    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushLogs(); // Flush any remaining logs on cleanup
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [instanceId, logType, initialMode, connect, flushLogs]);

  // Defer filtering to avoid blocking on heavy updates
  const deferredLogs = useDeferredValue(logs);
  
  // Filter logs based on level and search query
  const filteredLogs = useMemo(() => {
    let filtered = deferredLogs;

    if (selectedLevel !== "ALL") {
      filtered = filtered.filter(log => log.level === selectedLevel);
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
    selectedLevel,
    searchQuery,
    logsEndRef,
    isConnected,
    error,
    currentStreamId,
    lastOffset,
    setSelectedLevel,
    setSearchQuery,
  };
}
