// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useMemo } from "react";
import { useWebSocketOperation } from "./use-websocket-operation";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import type { InstanceStream, ProxyApps } from "@/types";
import type {
  ProxyRestartResponse,
  ProxyAddResponse,
  ProxyRemoveResponse,
  ProxyApp,
} from "@/types/proxy";

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

  const instanceTags = useMemo(() => {
    const cachedQueries = queryClient.getQueryCache().findAll({ queryKey: ['instance-status'] });
    return cachedQueries
      .map(query => {
        const key = query.queryKey as readonly [string, string];
        return key[1];
      })
      .filter((tag): tag is string => Boolean(tag));
  }, [queryClient]);

  const instanceQueries = useQueries({
    queries: instanceTags.map(tag => ({
      queryKey: ['instance-status', tag],
      queryFn: async () => null,
      enabled: false,
      staleTime: 0,
      gcTime: 1000 * 60 * 30,
    })),
  });

  // Get proxy apps for the selected instance
  const apps = useMemo((): ProxyApps | null => {
    if (!instanceTag) return null;
    
    const queryIndex = instanceTags.indexOf(instanceTag);
    if (queryIndex === -1) return null;

    const query = instanceQueries[queryIndex];
    const data = query?.data as InstanceStream | null | undefined;
    const update = data?.update as any;
    
    const proxyApps: ProxyApps = {};
    update?.proxies.forEach((proxy: ProxyApp) => {
      if (proxy.domain) {
        proxyApps[proxy.domain] = proxy;
      }
    });
    
    return Object.keys(proxyApps).length > 0 ? proxyApps : null;
  }, [instanceTag, instanceTags, instanceQueries]);

  const isLoading = !isConnected && !apps;
  const status: "running" | "stopped" | "error" | "unknown" = apps ? "running" : "unknown";

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
    // State (read from instance stream cache)
    apps,
    isLoading,
    status,
    error: streamError,
    isConnected,

    // Operations
    restart,
    addService,
    removeService,
  };
}

// Re-export types for convenience
export type { ProxyApp, ProxyApps } from "@/types";