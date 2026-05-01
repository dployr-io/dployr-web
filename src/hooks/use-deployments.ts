// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { usePagination } from "@/hooks/use-standardized-pagination";
import { useClusterId } from "@/hooks/use-cluster-id";
import type { ApiDeployment, ApiSuccessResponse } from "@/types";

export interface DeploymentWithInstance extends ApiDeployment {
  _instanceName: string | null;
  _instanceId: string | null;
}

export function useDeployments(filterInstanceName?: string | null) {
  const clusterId = useClusterId();

  const { data: httpDeployments, isLoading } = useQuery<ApiDeployment[]>({
    queryKey: ["deployments", clusterId],
    queryFn: async () => {
      const response = await axios.get<ApiSuccessResponse<{ deployments?: ApiDeployment[] }>>(
        `${import.meta.env.VITE_BASE_URL}/v1/deployments`,
        { params: { clusterId }, withCredentials: true }
      );
      return response.data.data?.deployments ?? [];
    },
    enabled: !!clusterId,
    staleTime: 30 * 1000,
  });

  const allDeployments = useMemo((): DeploymentWithInstance[] => {
    return (httpDeployments ?? [])
      .map(d => ({ ...d, _instanceName: null, _instanceId: null }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [httpDeployments]);

  const deployments = useMemo(() => {
    if (!filterInstanceName || filterInstanceName === "all") return allDeployments;
    return allDeployments.filter(d => d._instanceName === filterInstanceName);
  }, [allDeployments, filterInstanceName]);

  const pagination = usePagination(deployments);

  const selectedDeployment = useMemo(() => {
    const pathSegments = window.location.pathname.split("/");
    const deploymentsIndex = pathSegments.indexOf("deployments");
    const id = deploymentsIndex >= 0 ? pathSegments[deploymentsIndex + 1] : null;
    if (!id) return null;
    return allDeployments.find(d => d.id === id) || null;
  }, [allDeployments]);

  const selectedInstanceName = selectedDeployment?._instanceName ?? null;

  return {
    deployments,
    allDeployments,
    selectedDeployment,
    selectedInstanceName,
    isLoading,
    isConnected: true,
    ...pagination,
    paginatedDeployments: pagination.paginatedItems,
  };
}
