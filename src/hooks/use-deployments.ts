// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePagination } from "@/hooks/use-standardized-pagination";
import { useClusterId } from "@/hooks/use-cluster-id";
import { useInstances } from "@/hooks/use-instances";
import type { ApiDeployment, NormalizedInstanceData } from "@/types";

export interface DeploymentWithInstance extends ApiDeployment {
  _instanceName: string | null;
  _instanceId: string | null;
}

export function useDeployments(filterInstanceName?: string | null, pageOptions?: { externalPage?: number; onPageChange?: (page: number) => void }) {
  const clusterId = useClusterId();
  const queryClient = useQueryClient();
  const { instances } = useInstances();

  const { data: httpDeployments, isLoading } = useQuery<ApiDeployment[]>({
    queryKey: ["deployments", clusterId],
    queryFn: async (): Promise<ApiDeployment[]> => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/v1/deployments`,
          { params: { clusterId }, withCredentials: true }
        );
        const data = response?.data?.data?.items;
        
        return Array.isArray(data) ? data.map((d: any) => ({
          ...d,
          createdAt: typeof d.createdAt === 'string' ? parseInt(d.createdAt, 10) : d.createdAt,
          finishedAt: d.finishedAt ? (typeof d.finishedAt === 'string' ? parseInt(d.finishedAt, 10) : d.finishedAt) : null,
        })) as ApiDeployment[] : [];
      } catch (error) {
        console.error((error as Error).message || "An unknown error occurred while retrieving deployments");
        return [];
      }
    },
    enabled: !!clusterId,
    staleTime: 30 * 1000,
  });

  const allDeployments = useMemo((): DeploymentWithInstance[] => {
    return (httpDeployments ?? [])
      .map(d => {
        let instanceName: string | null = null;
        for (const instance of instances) {
          const status = queryClient.getQueryData<NormalizedInstanceData>(["instance-status", instance.tag]);
          const match = status?.workloads?.deployments?.find((wd: any) => wd.id === d.id);
          if (match) {
            instanceName = instance.tag;
            break;
          }
        }
        return { ...d, _instanceName: instanceName, _instanceId: null };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [httpDeployments, instances, queryClient]);

  const deployments = useMemo(() => {
    if (!filterInstanceName || filterInstanceName === "all") return allDeployments;
    return allDeployments.filter(d => d._instanceName === filterInstanceName);
  }, [allDeployments, filterInstanceName]);

  const pagination = usePagination(deployments, pageOptions);

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
