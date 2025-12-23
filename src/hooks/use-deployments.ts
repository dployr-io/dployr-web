// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Deployment, InstanceStream } from "@/types";
import { useMemo, useState } from "react";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { useQueryClient, useQueries } from "@tanstack/react-query";

export function useDeployments() {
  const queryClient = useQueryClient();
  const { isConnected, error: streamError } = useInstanceStream();

  const pathSegments = window.location.pathname.split("/");
  const id = pathSegments[pathSegments.indexOf("deployments") + 1];

  const instanceIds = useMemo(() => {
    const cachedQueries = queryClient.getQueryCache().findAll({ queryKey: ['instance-status'] });
    return cachedQueries
      .map(query => {
        const key = query.queryKey as readonly [string, string];
        return key[1];
      })
      .filter((id): id is string => Boolean(id));
  }, [queryClient]);

  const instanceQueries = useQueries({
    queries: instanceIds.map(instanceId => ({
      queryKey: ['instance-status', instanceId],
      queryFn: async () => null,
      enabled: false,
      staleTime: 0,
      gcTime: 1000 * 60 * 30,
    })),
  });

  const deployments = useMemo(() => {
    return instanceQueries.flatMap((query, index) => {
      const data = query.data as InstanceStream | null | undefined;
      const update = data?.update as any;
      const deployments = update?.deployments as Deployment[] | undefined;
      const instanceId = instanceIds[index];
      
      return (deployments || []).map(deployment => ({
        ...deployment,
        _instanceId: instanceId,
      }));
    });
  }, [instanceQueries, instanceIds]);

  const isLoading = !isConnected && deployments.length === 0;

  const selectedDeployment = id ? deployments?.find(deployment => deployment.id === id) || null : null;
  const selectedInstanceId = selectedDeployment ? (selectedDeployment as any)._instanceId : undefined;
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil((deployments?.length ?? 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDeployments = Array.isArray(deployments) ? deployments.slice(startIndex, endIndex) : [];

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return {
    selectedDeployment,
    selectedInstanceId,
    deployments,
    paginatedDeployments,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    isLoading,
    isConnected,
    error: streamError,

    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
}
