// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useEffect, useRef, useId } from "react";
import { useInstanceStream } from "./use-instance-stream";
import { ulid } from "ulid";

export interface ProcessInfo {
  pid: number;
  user: string;
  priority: number;
  nice: number;
  virtual_memory_bytes: number;
  resident_memory_bytes: number;
  shared_memory_bytes: number;
  state: string;
  cpu_percent: number;
  memory_percent: number;
  cpu_time: string;
  command: string;
}

export interface MetricsSnapshot {
  seq: number;
  timestamp: number;
  data: {
    cpu?: {
      count: number;
      user_percent: number;
      system_percent: number;
      idle_percent: number;
      iowait_percent: number;
      load_average?: {
        one_minute: number;
        five_minute: number;
        fifteen_minute: number;
      };
    };
    memory?: {
      total_bytes: number;
      used_bytes: number;
      free_bytes: number;
      available_bytes: number;
      buffer_cache_bytes: number;
    };
    swap?: {
      total_bytes: number;
      used_bytes: number;
      free_bytes: number;
      available_bytes: number;
    };
    disks?: Array<{
      filesystem: string;
      mount_point: string;
      total_bytes: number;
      used_bytes: number;
      available_bytes: number;
    }>;
    list?: ProcessInfo[];
  };
}

export function useMetricsHistory(instanceId: string, intervalMs: number = 30000) {
  const subscriberId = useId();
  const { sendJson, subscribe, unsubscribe, isConnected } = useInstanceStream();
  const [snapshots, setSnapshots] = useState<MetricsSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRequestRef = useRef<string | null>(null);

  const fetchHistory = useCallback((startTime?: number, endTime?: number) => {
    if (!isConnected || !instanceId) {
      setError("WebSocket not connected or no instance ID");
      return;
    }

    setIsLoading(true);
    setError(null);
    const requestId = ulid();
    pendingRequestRef.current = requestId;

    sendJson({
      kind: "process_history",
      requestId,
      instanceId,
      startTime,
      endTime,
    });
  }, [instanceId, isConnected, sendJson]);

  // Auto-fetch at regular intervals
  useEffect(() => {
    if (!instanceId || !isConnected) {
      return;
    }
    
    const doFetch = () => {
      if (!isConnected || !instanceId) return;
      
      setIsLoading(true);
      setError(null);
      const requestId = ulid();
      pendingRequestRef.current = requestId;

      sendJson({
        kind: "process_history",
        requestId,
        instanceId,
        startTime: Date.now() - 60 * 60 * 1000,
        endTime: Date.now(),
      });
    };

    // Initial fetch
    doFetch();

    // Set up interval for regular fetches
    let interval: NodeJS.Timeout | null = null;
    if (intervalMs > 0) {
      interval = setInterval(doFetch, intervalMs);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [instanceId, isConnected, intervalMs, sendJson]);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.kind === "process_history_response" && message.requestId === pendingRequestRef.current) {
        // Extract metrics from process history snapshots
        // The data can come in different formats:
        // - v1.1: snapshot.data.resources.cpu/memory
        // - v1: snapshot.data.cpu/memory directly
        // - process_history: may have process list in snapshot.data.list
        const metricsSnapshots: MetricsSnapshot[] = (message.data?.snapshots ?? [])
          .map((snapshot: any) => {
            // Try v1.1 format first (resources nested)
            const resources = snapshot.data?.resources;
            // Fall back to v1 format (direct properties)
            const cpu = resources?.cpu || snapshot.data?.cpu || snapshot.cpu;
            const memory = resources?.memory || snapshot.data?.memory || snapshot.memory;
            const swap = resources?.swap || snapshot.data?.swap || snapshot.swap;
            const disks = resources?.disks || snapshot.data?.disks || snapshot.disks;
            const list = snapshot.data?.list;
            
            return {
              seq: snapshot.seq,
              timestamp: snapshot.timestamp,
              data: { cpu, memory, swap, disks, list },
            };
          })
          .filter((s: MetricsSnapshot) => s.data.cpu || s.data.memory || s.data.list);

        setSnapshots(metricsSnapshots);
        setIsLoading(false);
        pendingRequestRef.current = null;
      }

      // Also handle metrics_history_response if the server supports it
      if (message.kind === "metrics_history_response" && message.requestId === pendingRequestRef.current) {
        const metricsSnapshots: MetricsSnapshot[] = (message.data?.snapshots ?? []).map((snapshot: any) => ({
          seq: snapshot.seq,
          timestamp: snapshot.timestamp,
          data: {
            cpu: snapshot.data?.cpu || snapshot.cpu,
            memory: snapshot.data?.memory || snapshot.memory,
            swap: snapshot.data?.swap || snapshot.swap,
            disks: snapshot.data?.disks || snapshot.disks,
            list: snapshot.data?.list,
          },
        }));
        
        setSnapshots(metricsSnapshots);
        setIsLoading(false);
        pendingRequestRef.current = null;
      }

      if (message.kind === "error" && message.requestId === pendingRequestRef.current) {
        setError(message.message || "Failed to fetch metrics history");
        setIsLoading(false);
        pendingRequestRef.current = null;
      }
    };

    subscribe(subscriberId, handleMessage);

    return () => {
      unsubscribe(subscriberId);
    };
  }, [subscriberId, subscribe, unsubscribe]);

  return { snapshots, fetchHistory, isLoading, error };
}
