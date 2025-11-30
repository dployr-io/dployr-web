// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Log, LogLevel, LogStreamMode, LogType } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClusterId } from "@/hooks/use-cluster-id";
import axios from "axios";

export function useInstanceLogs(
  instanceId?: string,
  logType?: LogType,
  initialMode?: LogStreamMode,
) {
  const clusterId = useClusterId();
  const [logs, setLogs] = useState<Log[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | LogLevel>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [lastOffset, setLastOffset] = useState(0);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 5;
  const logCounterRef = useRef(0);

  const requestLogs = useCallback(async (
    mode: LogStreamMode,
    startFrom: number,
    limit?: number
  ) => {
    if (!instanceId || !logType || !clusterId) return;

    try {
      setIsStreaming(true);
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${instanceId}/logs/stream`,
        {
          logType,
          mode,
          startFrom: startFrom || 100,
          limit: limit || (mode === "historical" ? 1000 : undefined),
        },
        { params: { clusterId }, withCredentials: true }
      );
      
      console.log(`Requested ${mode} logs from offset ${startFrom || 100}`);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to request logs");
    } finally {
      setIsStreaming(false);
    }
  }, [instanceId, logType, clusterId]);

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
            logType,
            startOffset: lastOffset,
          }),
        );
      };

      socket.onmessage = event => {
        try {
          const data = JSON.parse(event.data as string);

          if (data.kind === "log_subscribed") {
            setCurrentStreamId(data.streamId);
            console.log(`Subscribed to ${data.logType}, streamId: ${data.streamId}`);
          }

          if (data.kind === "log_chunk" && Array.isArray(data.entries)) {
            const newLogs: Log[] = data.entries.map((entry: any) => ({
              id: `log-${logCounterRef.current++}`,
              message: entry.msg,
              level: entry.level?.toUpperCase() || "INFO",
              timestamp: new Date(entry.time),
            }));
            setLogs(prev => [...prev, ...newLogs]);
            setLastOffset(data.offset + data.entries.length);
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
          const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 10000);
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
  }, [instanceId, clusterId, logType, lastOffset]);

  useEffect(() => {
    if (!instanceId || !logType || !initialMode) return;

    connect();

    // Backfill ~100 historical entries
    const run = async () => await requestLogs(initialMode, 100, 100);

    void run();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [instanceId, logType, initialMode, lastOffset, connect, requestLogs]);

  // Change mode (e.g., tail → historical)
  const changeMode = useCallback((
    newMode: LogStreamMode,
    startFrom?: number,
    limit?: number
  ) => {
    if (newMode === "historical") {
      // Clear logs when explicitly requesting a specific range
      if (typeof startFrom === "number") {
        setLogs([]);
        setLastOffset(startFrom);
      }
      requestLogs("historical", startFrom || lastOffset, limit);
      return;
    }

    requestLogs(newMode, startFrom || lastOffset, limit);
  }, [lastOffset, requestLogs]);

  // Fill gap after reconnection
  const fillGap = useCallback(async () => {
    if (lastOffset > 0) {
      await requestLogs("historical", lastOffset, 1000);
    }
  }, [lastOffset, requestLogs]);

  // Filter logs based on level and search query
  useEffect(() => {
    let filtered = logs;

    if (selectedLevel !== "ALL") {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    setFilteredLogs(filtered);
  }, [logs, selectedLevel, searchQuery]);

  // Auto-scroll to bottom when new logs arrive (tail/live mode only)
  useEffect(() => {
    if (initialMode !== "tail") return;
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredLogs, initialMode]);

  return {
    logs,
    filteredLogs,
    selectedLevel,
    searchQuery,
    logsEndRef,
    isConnected,
    isStreaming,
    error,
    currentStreamId,
    lastOffset,
    changeMode,
    fillGap,
    requestLogs,
    setSelectedLevel,
    setSearchQuery,
  };
}
