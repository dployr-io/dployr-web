// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { usePagination } from "@/hooks/use-standardized-pagination";
import { useInstances } from "@/hooks/use-instances";
import type { NormalizedDeployment } from "@/types";

export interface DeploymentWithInstance extends NormalizedDeployment {
  _instanceName: string;
  _instanceId: string;
}

export function useDeployments(filterInstanceName?: string | null, pageOptions?: { externalPage?: number; onPageChange?: (page: number) => void }) {
  const { instances } = useInstances();

  const deploymentQueries = useQueries({
    queries: instances.map(instance => ({
      queryKey: ["instance", instance.tag, "deployments"] as const,
      enabled: false,
      initialData: [] as NormalizedDeployment[],
      queryFn: (): NormalizedDeployment[] => [],
    })),
  });

  const allDeployments = useMemo((): DeploymentWithInstance[] => {
    const deployments: DeploymentWithInstance[] = [];

    instances.forEach((instance, i) => {
      const instanceDeployments = deploymentQueries[i]?.data ?? [];
      for (const deployment of instanceDeployments) {
        deployments.push({
          ...deployment,
          _instanceName: instance.tag,
          _instanceId: instance.id,
        } as DeploymentWithInstance);
      }
    });

    return deployments.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [instances, deploymentQueries]);

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
    isLoading: false,
    isConnected: true,
    ...pagination,
    paginatedDeployments: pagination.paginatedItems,
  };
}
