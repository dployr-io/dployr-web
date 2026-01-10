// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { NormalizedInstanceData } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInstanceStream } from "@/hooks/use-instance-stream";

export function useInstanceStatus(instanceName?: string) {
  const queryClient = useQueryClient();
  const { isConnected, error: streamError } = useInstanceStream();

  // Use useQuery to subscribe to cache changes and trigger re-renders
  // Data comes from WebSocket via setQueryData at the provider level
  const { data: update } = useQuery<NormalizedInstanceData | null>({
    queryKey: ["instance-status", instanceName],
    queryFn: () => queryClient.getQueryData<NormalizedInstanceData>(["instance-status", instanceName]) ?? null,
    enabled: !!instanceName,
    staleTime: 0, 
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    update,
    isConnected,
    error: streamError,
    debugEvents: [],
  };
}