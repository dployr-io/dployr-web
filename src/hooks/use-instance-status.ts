import type { InstanceStream } from "@/types";
import { useEffect, useRef, useState } from "react";
import { useClusterId } from "@/hooks/use-cluster-id";

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
  const clusterId = useClusterId();
  const [status, setStatus] = useState<InstanceStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugEvents, setDebugEvents] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!instanceId || !clusterId) {
      setStatus(null);
      setIsConnected(false);
      setError(null);
      setDebugEvents([]);
      return;
    }

    const base = import.meta.env.VITE_BASE_URL || "";
    const wsBase = base.replace(/^http/i, "ws");
    const url = `${wsBase}/v1/instances/${encodeURIComponent(instanceId)}/stream?clusterId=${encodeURIComponent(
      clusterId,
    )}`;

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setError(null);
        try {
          socket.send(JSON.stringify({ kind: "client_subscribe" }));
        } catch (sendError) {
          setError((sendError as Error).message || "Failed to subscribe to instance status");
        }
      };

      socket.onmessage = event => {
        try {
          const data = JSON.parse(event.data as string) as InstanceStream;
          setStatus(data);

          // Extract metrics for time-series
          const metrics = data?.update?.status as any;
          const system = metrics?.debug?.system as any;

          if (system) {
            const memUsed = typeof system?.mem_used_bytes === "number" ? system.mem_used_bytes / 1024 / 1024 : undefined;
            const memTotal = typeof system?.mem_total_bytes === "number" ? system.mem_total_bytes / 1024 / 1024 : undefined;
            const memPercent = memUsed && memTotal ? (memUsed / memTotal) * 100 : undefined;

            // Calculate total disk usage
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

            const dataPoint: MetricDataPoint = {
              timestamp: Date.now(),
              memoryUsedMB: memUsed,
              memoryTotalMB: memTotal,
              memoryPercent: memPercent,
              diskUsedGB: totalDiskUsed > 0 ? totalDiskUsed / 1024 / 1024 / 1024 : undefined,
              diskTotalGB: totalDiskSize > 0 ? totalDiskSize / 1024 / 1024 / 1024 : undefined,
            };

          }
        } catch (parseError) {
          setError((parseError as Error).message || "Failed to parse status message");
          setDebugEvents(prev => [...prev, `error: parse failed - ${(parseError as Error).message ?? "unknown"}`]);
        }
      };

      socket.onerror = () => {
        setIsConnected(false);
        setError("An error occurred while streaming instance status");
      };

      socket.onclose = evt => {
        setIsConnected(false);
      };
    } catch (connectError) {
      setError((connectError as Error).message || "Failed to connect to instance status stream");
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [instanceId, clusterId]);

  return {
    status,
    isConnected,
    error,
    debugEvents,
  };
}