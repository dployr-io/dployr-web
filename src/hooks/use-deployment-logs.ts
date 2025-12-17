// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Log, LogLevel } from "@/types";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { LogTimeRange } from "@/components/log-time-selector";
import { parseLogEntries, filterLogs, resetLogState, isNearBottom, type LogStreamMode } from "@/lib/log-utils";

export function useDeploymentLogs(
  deploymentId?: string,
  initialMode: LogStreamMode = "tail",
  timeRange: LogTimeRange = "live",
  selectedLevel: "ALL" | LogLevel = "ALL",
) {
  const streamId = useId();
  const [logs, setLogs] = useState<Log[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const logCounterRef = useRef(0);
  const logBufferRef = useRef<Log[]>([]);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modeRef = useRef<LogStreamMode>(initialMode);

  // Build WebSocket URL
  const wsUrl = useMemo(() => {
    if (!deploymentId) return undefined;
    const base = import.meta.env.VITE_BASE_URL || "";
    const wsBase = base.replace(/^http/i, "ws");
    return `${wsBase}/logs/stream`;
  }, [deploymentId]);

  // Flush buffered logs to state
  const flushLogs = useCallback(() => {
    if (logBufferRef.current.length > 0) {
      setLogs(prev => [...prev, ...logBufferRef.current]);
      logBufferRef.current = [];
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data as string);

      if (message.kind === "log_subscribed") {
        console.log(`Subscribed to deployment logs: ${message.streamId}`);
        setIsStreaming(true);
      }

      if (message.kind === "log_chunk" && Array.isArray(message.entries)) {
        const entries = message.entries as any[];
        const newLogs = parseLogEntries(entries, logCounterRef);
        logBufferRef.current.push(...newLogs);

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
  }, [flushLogs]);

  const handleOpen = useCallback((socket: WebSocket) => {
    if (!deploymentId) return;

    // Send subscription message
    const subscribeMessage = {
      kind: "log_stream",
      path: deploymentId,
      streamId: streamId,
      mode: modeRef.current,
      startFrom: modeRef.current === "tail" ? -1 : 0,
    };

    socket.send(JSON.stringify(subscribeMessage));
    setIsStreaming(true);
  }, [deploymentId, streamId]);

  const handleClose = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const handleError = useCallback(() => {
    setError("WebSocket connection error");
    setIsStreaming(false);
  }, []);

  const { isConnected, sendJson, connect, disconnect } = useWebSocket({
    url: wsUrl,
    enabled: !!deploymentId,
    onOpen: handleOpen,
    onMessage: handleMessage,
    onClose: handleClose,
    onError: handleError,
  });

  // Start streaming logs
  const startStreaming = useCallback(() => {
    if (!deploymentId) return;
    connect();
  }, [deploymentId, connect]);

  // Stop streaming logs
  const stopStreaming = useCallback(() => {
    if (isConnected) {
      sendJson({
        kind: "log_unsubscribe",
        streamId: streamId,
      });
    }
    disconnect();
    setIsStreaming(false);

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushLogs();
    }
  }, [isConnected, sendJson, streamId, disconnect, flushLogs]);

  // Restart stream with new parameters
  const restartStream = useCallback((newTimeRange?: LogTimeRange) => {
    if (!deploymentId || !isConnected) return;

    const effectiveRange = newTimeRange ?? timeRange;
    const isHistorical = effectiveRange !== "live";
    modeRef.current = isHistorical ? "historical" : "tail";

    if (isHistorical) {
      resetLogState(setLogs, logBufferRef, logCounterRef);
    }

    // Send new subscription
    sendJson({
      kind: "log_stream",
      path: deploymentId,
      streamId: streamId,
      mode: modeRef.current,
      startFrom: isHistorical ? 0 : -1,
    });
  }, [deploymentId, isConnected, timeRange, sendJson, streamId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }
    };
  }, []);

  const deferredLogs = useDeferredValue(logs);
  const filteredLogs = useMemo(
    () => filterLogs(deferredLogs, selectedLevel, searchQuery),
    [deferredLogs, selectedLevel, searchQuery]
  );

  useEffect(() => {
    if (modeRef.current !== "tail") return;
    const container = logsEndRef.current?.parentElement;
    if (!container) return;
    if (isNearBottom(container)) {
      logsEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [filteredLogs]);

  return {
    logs: deferredLogs,
    filteredLogs,
    searchQuery,
    logsEndRef,
    isConnected,
    isStreaming,
    error,
    setSearchQuery,
    startStreaming,
    stopStreaming,
    restartStream,
  };
}
