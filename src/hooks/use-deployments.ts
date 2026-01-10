// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useInstances } from "@/hooks/use-instances";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { usePagination } from "@/hooks/use-standardized-pagination";
import type { NormalizedInstanceData, NormalizedDeployment } from "@/types";

export interface DeploymentWithInstance extends NormalizedDeployment {
  _instanceName: string;
  _instanceId: string;
}

export function useDeployments(filterInstanceName?: string | null) {
  const queryClient = useQueryClient();
  const { instances } = useInstances();
  const { isConnected } = useInstanceStream();

  // Aggregate deployments from all instances in the query cache
  const allDeployments = useMemo(() => {
    const deployments: DeploymentWithInstance[] = [];

    for (const instance of instances) {
      const instanceData = queryClient.getQueryData<NormalizedInstanceData>(
        ["instance-status", instance.tag]
      );

      if (instanceData?.workloads?.deployments) {
        for (const deployment of instanceData.workloads.deployments) {
          deployments.push({
            ...deployment,
            _instanceName: instance.tag,
            _instanceId: instance.id,
          });
        }
      }
    }

    // Sort by createdAt descending (newest first)
    return deployments.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [instances, queryClient]);

  // Filter by instance if specified
  const deployments = useMemo(() => {
    if (!filterInstanceName || filterInstanceName === "all") {
      return allDeployments;
    }
    return allDeployments.filter(d => d._instanceName === filterInstanceName);
  }, [allDeployments, filterInstanceName]);

  // Use standardized pagination
  const pagination = usePagination(deployments);

  // Get selected deployment from URL
  const selectedDeployment = useMemo(() => {
    const pathSegments = window.location.pathname.split("/");
    const deploymentsIndex = pathSegments.indexOf("deployments");
    const id = deploymentsIndex >= 0 ? pathSegments[deploymentsIndex + 1] : null;
    
    if (!id) return null;
    return allDeployments.find(d => d.id === id) || null;
  }, [allDeployments]);

  const selectedInstanceName = selectedDeployment?._instanceName;

  // Loading state: not connected AND no deployments cached
  const isLoading = !isConnected && allDeployments.length === 0;

  return {
    // Data
    deployments,
    allDeployments,
    selectedDeployment,
    selectedInstanceName,
    isLoading,
    isConnected,
    // Pagination (spread from standardized hook)
    ...pagination,
    paginatedDeployments: pagination.paginatedItems,
  };
}
