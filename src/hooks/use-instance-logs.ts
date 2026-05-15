// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Log, LogLevel, LogStreamMode, LogTimeRange } from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { parseLogEntries, filterLogs, isNearBottom, sortLogsByTimestamp, mergeSortedLogs } from "@/lib/log-utils";
import { ulid } from "ulid";

interface UseLogsOptions {
  instanceName?: string;
  path: string; // Can be LogType ("app" | "install") or deployment ID
  initialMode?: LogStreamMode;
  duration?: LogTimeRange;
  selectedLevel?: "ALL" | LogLevel;
}

export function useLogs({ instanceName, path, initialMode, duration = "live", selectedLevel = "ALL" }: UseLogsOptions) {
  const subscriberIdRef = useRef<string>(ulid());
  const subscriberId = subscriberIdRef.current;
  const { isConnected, error: streamError, sendJson, subscribe, unsubscribe } = useInstanceStream();
  const [logs, setLogs] = useState<Log[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [lastOffset, setLastOffset] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const logCounterRef = useRef(0);
  const logBufferRef = useRef<Log[]>([]);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastOffsetRef = useRef(0);
  const hasSubscribedRef = useRef(false);

  const flushLogs = useCallback(() => {
    if (logBufferRef.current.length > 0) {
      const sortedBuffer = sortLogsByTimestamp([...logBufferRef.current]);

      setLogs(prev => mergeSortedLogs(prev, sortedBuffer));

      logBufferRef.current = [];
    }
  }, []);

  const handleMessage = useCallback(
    (message: any) => {
      try {
        if (message.kind === "log_subscribed") {
          setCurrentStreamId(message.streamId as string);
          console.log(`Subscribed to ${message.path}, streamId: ${message.streamId}`);
        }

        if (message.kind === "log_chunk" && Array.isArray(message.entries)) {
          const entries = message.entries as any[];
          const newLogs = parseLogEntries(entries, logCounterRef);
          logBufferRef.current.push(...newLogs);

          if (typeof message.offset === "number") {
            setLastOffset((message.offset as number) + entries.length);
          }

          if (!flushTimerRef.current) {
            flushTimerRef.current = setTimeout(() => {
              flushLogs();
              flushTimerRef.current = null;
            }, 100);
          }
        }

        if (message.kind === "error") {
          setError(message.message as string);
        }
      } catch (parseError) {
        setError((parseError as Error).message || "Failed to parse log message");
      }
    },
    [flushLogs]
  );

  useEffect(() => {
    lastOffsetRef.current = lastOffset;
  }, [lastOffset]);

  const sendSubscribe = useCallback(
    (startOffset: number) => {
      if (!path || !isConnected) return false;

      const payload: any = {
        kind: "log_subscribe",
        streamId: subscriberId,
        path,
        startOffset,
        duration,
      };

      if (instanceName) {
        payload.instanceName = instanceName;
      }

      sendJson(payload);
      hasSubscribedRef.current = true;
      return true;
    },
    [instanceName, path, isConnected, duration, sendJson]
  );

  // Start streaming logs on-demand
  const startStreaming = useCallback(
    (fromOffset?: number) => {
      if (!path) return;

      // Use ref to avoid isStreaming state in deps — prevents the feedback loop where
      // setIsStreaming(true) causes startStreaming to get a new ref, re-triggering the
      // useStandardizedLogs effect and sending a duplicate log_subscribe to the server.
      if (!isStreamingRef.current) {
        isStreamingRef.current = true;
        subscribe(subscriberId, handleMessage);
        setIsStreaming(true);
      }

      if (!hasSubscribedRef.current) {
        const startOffset = fromOffset ?? (duration === "live" ? lastOffsetRef.current : 0);
        sendSubscribe(startOffset);
      }
    },
    [path, duration, subscriberId, subscribe, handleMessage, sendSubscribe]
  );

  // Stop streaming logs
  const stopStreaming = useCallback(() => {
    if (path && isConnected) {
      sendJson({
        kind: "log_unsubscribe",
        path,
        requestId: ulid(),
      });
    }

    unsubscribe(subscriberId);
    hasSubscribedRef.current = false;
    isStreamingRef.current = false;
    setIsStreaming(false);
    setCurrentStreamId(null);
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushLogs();
    }
  }, [subscriberId, unsubscribe, flushLogs, path, isConnected, sendJson]);

  // Clear logs and resubscribe when duration filter changes
  useEffect(() => {
    if (!isStreaming) return;

    // Clear existing logs when switching time windows
    setLogs([]);
    logBufferRef.current = [];
    setLastOffset(0);
    lastOffsetRef.current = 0;

    // Unsubscribe from current stream
    if (path && isConnected && hasSubscribedRef.current) {
      sendJson({
        kind: "log_unsubscribe",
        path,
        requestId: ulid(),
      });
      hasSubscribedRef.current = false;
    }

    // Resubscribe with new duration
    const startOffset = duration === "live" ? 0 : 0;
    sendSubscribe(startOffset);
  }, [duration, path, isConnected, sendSubscribe]);

  // Auto-resubscribe when connection becomes available while streaming
  useEffect(() => {
    if (!isConnected || !path || !isStreaming || hasSubscribedRef.current) return;
    sendSubscribe(lastOffsetRef.current);
  }, [isConnected, path, isStreaming, sendSubscribe]);

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

  const filteredLogs = useMemo(() => filterLogs(logs, selectedLevel, searchQuery), [logs, selectedLevel, searchQuery]);

  useEffect(() => {
    if (initialMode !== "tail") return;
    const container = logsEndRef.current?.parentElement;
    if (!container) return;
    if (isNearBottom(container)) {
      logsEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [logs, initialMode]);

  return {
    logs,
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
  };
}
