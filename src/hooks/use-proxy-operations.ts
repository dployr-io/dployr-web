// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import { useWebSocketOperation } from "./use-websocket-operation";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import type {
  ProxyRestartResponse,
  ProxyAddResponse,
  ProxyRemoveResponse,
} from "@/types/proxy";
import { useQueryClient } from "@tanstack/react-query";
import type { NormalizedInstanceData } from "@/types";

interface UseProxyOperationsOptions {
  timeout?: number;
}

/**
 * Hook for proxy operations
 * Reads proxy apps from instance stream cache (like services/deployments)
 * Provides operations: restart, add, remove
 */
export function useProxyOperations(instanceTag?: string, options: UseProxyOperationsOptions = {}) {
  const { timeout = 30000 } = options;
  const { sendOperation, isConnected } = useWebSocketOperation({ timeout });
  const { error: streamError } = useInstanceStream();
  const queryClient = useQueryClient();

  // Get proxy apps for the specific selected instance
  const apps = instanceTag 
    ? queryClient.getQueryData<NormalizedInstanceData>(["instance-status", instanceTag])?.proxy?.routes
    : undefined;

  // Restart proxy
  const restart = useCallback(
    async (instanceName: string, clusterId: string, force = false): Promise<ProxyRestartResponse["data"]> => {
      const response = await sendOperation({
        kind: "proxy_restart",
        instanceName,
        clusterId,
        force,
      }) as unknown as ProxyRestartResponse;

      return response.data;
    },
    [sendOperation]
  );

  // Add service to proxy
  const addService = useCallback(
    async (
      instanceName: string,
      clusterId: string,
      serviceName: string,
      upstream: string,
      options?: { domain?: string; root?: string; template?: string }
    ): Promise<ProxyAddResponse["data"]> => {
      const response = await sendOperation({
        kind: "proxy_add",
        instanceName,
        clusterId,
        serviceName,
        upstream,
        ...options,
      }) as unknown as ProxyAddResponse;

      return response.data;
    },
    [sendOperation]
  );

  // Remove service from proxy
  const removeService = useCallback(
    async (instanceName: string, clusterId: string, serviceName: string): Promise<ProxyRemoveResponse["data"]> => {
      const response = await sendOperation({
        kind: "proxy_remove",
        instanceName,
        clusterId,
        serviceName,
      }) as unknown as ProxyRemoveResponse;

      return response.data;
    },
    [sendOperation]
  );

  return {
    apps,
    status: "running" as "unknown" | "error" | "stopped" | "running",
    isLoading: false, // Since we're reading from cache, no loading state
    error: streamError,
    isConnected,
    restart,
    addService,
    removeService,
  };
}