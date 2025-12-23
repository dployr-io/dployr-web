// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Deployment, InstanceStream } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInstanceStream } from "@/hooks/use-instance-stream";

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
  const queryClient = useQueryClient();
  const { isConnected, error: streamError } = useInstanceStream();

  // Use useQuery to subscribe to cache changes and trigger re-renders
  // Data comes from WebSocket via setQueryData at the provider level
  const { data: status } = useQuery<InstanceStream | null>({
    queryKey: ["instance-status", instanceId],
    queryFn: () => queryClient.getQueryData<InstanceStream>(["instance-status", instanceId]) ?? null,
    enabled: !!instanceId,
    staleTime: 0, 
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Extract deployments from status update
  const deployments: Deployment[] = (status?.update as any)?.deployments || [];

  return {
    status,
    deployments,
    isConnected,
    error: streamError,
    debugEvents: [],
  };
}