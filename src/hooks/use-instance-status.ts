// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Deployment, InstanceStream } from "@/types";
import { useEffect, useId, useState } from "react";
import { useInstanceStream, type StreamMessage } from "@/hooks/use-instance-stream";

export interface MetricDataPoint {
  timestamp: number;
  cpuPercent?: number;
  memoryUsedMB?: number;
  memoryTotalMB?: number;
  memoryPercent?: number;
  diskUsedGB?: number;
  diskTotalGB?: number;
}

export function useInstanceStatus(instanceId?: string) {
  const subscriberId = useId();
  const { isConnected, error: streamError, sendJson, subscribe, unsubscribe } = useInstanceStream();
  const [status, setStatus] = useState<InstanceStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugEvents, setDebugEvents] = useState<string[]>([]);

  useEffect(() => {
    if (!instanceId) {
      setStatus(null);
      setError(null);
      setDebugEvents([]);
      return;
    }

    // Subscribe to updates
    const handleMessage = (message: StreamMessage) => {
      if (message.kind !== "update") {
        return;
      }

      try {
        const data = message as unknown as InstanceStream;
        setStatus(data);

        // Extract metrics for time-series
        const metrics = data?.update?.status as any;
        const system = metrics?.debug?.system as any;

        if (system) {
          let totalDiskUsed = 0;
          let totalDiskSize = 0;
          if (Array.isArray(system?.disks)) {
            system.disks.forEach((d: any) => {
              const used = typeof d?.used_bytes === "number" ? d.used_bytes : 0;
              const total = typeof d?.size_bytes === "number" ? d.size_bytes : 0;
              totalDiskUsed += used;
              totalDiskSize += total;
            });
          }
        }
      } catch (parseError) {
        setError((parseError as Error).message || "Failed to parse status message");
        setDebugEvents(prev => [...prev, `error: parse failed - ${(parseError as Error).message ?? "unknown"}`]);
      }
    };

    subscribe(subscriberId, handleMessage);

    // Send subscribe message when connected
    if (isConnected) {
      sendJson({ kind: "client_subscribe" });
    }

    return () => {
      unsubscribe(subscriberId);
    };
  }, [instanceId, isConnected, subscriberId, subscribe, unsubscribe, sendJson]);

  // Extract deployments from status update
  const deployments: Deployment[] = (status?.update as any)?.deployments || [];

  return {
    status,
    deployments,
    isConnected,
    error: error || streamError,
    debugEvents,
  };
}