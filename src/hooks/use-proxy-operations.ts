// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useMemo } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import type { NormalizedInstanceData, NormalizedProxyRoute } from "@/types";
import { useInstances } from "./use-instances";

export function useProxyOperations(_instanceTag?: string) {
  const queryClient = useQueryClient();
  const { instances } = useInstances();

  const apps = useMemo(() => {
    const proxyApps: NormalizedProxyRoute[] = [];

    for (const instance of instances) {
      const instanceData = queryClient.getQueryData<NormalizedInstanceData>(
        ["instance-status", instance.tag]
      );

      if (instanceData?.proxy?.routes) {
        for (const route of instanceData.proxy.routes) {
          proxyApps.push(route);
        }
      }
    }

    return proxyApps;
  }, [instances, queryClient]);

  const restart = useCallback(
    async (instanceName: string, clusterId: string, force = false) => {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/proxy/node/restart`,
        { instanceName, force },
        { params: { clusterId }, withCredentials: true }
      );
      return response.data.data as { taskId: string; message: string };
    },
    []
  );

  const addService = useCallback(
    async (
      instanceName: string,
      clusterId: string,
      serviceName: string,
      upstream: string,
      options?: { domain?: string; root?: string; template?: string }
    ) => {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/proxy/node/routes`,
        { instanceName, serviceName, upstream, ...options },
        { params: { clusterId }, withCredentials: true }
      );
      return response.data.data as { taskId: string; message: string };
    },
    []
  );

  const removeService = useCallback(
    async (instanceName: string, clusterId: string, serviceName: string) => {
      const response = await axios.delete(
        `${import.meta.env.VITE_BASE_URL}/v1/proxy/node/routes/${encodeURIComponent(serviceName)}`,
        { params: { instanceName, clusterId }, withCredentials: true }
      );
      return response.data.data as { taskId: string; message: string };
    },
    []
  );

  return {
    apps,
    status: "running" as "unknown" | "error" | "stopped" | "running",
    isLoading: false,
    error: null,
    isConnected: true,
    restart,
    addService,
    removeService,
  };
}
