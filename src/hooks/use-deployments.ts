// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Deployment, InstanceStream } from "@/types";
import { useCallback, useMemo, useRef, useState } from "react";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { useQueryClient, useQueries, useQuery } from "@tanstack/react-query";
import { useClusterId } from "@/hooks/use-cluster-id";
import { ulid } from "ulid";

export function useDeployments(instanceName?: string | null) {
  const queryClient = useQueryClient();
  const clusterId = useClusterId();
  const { isConnected, sendJson, subscribe, unsubscribe, error: streamError } = useInstanceStream();
  const subscriberId = useRef(`deployments-${Math.random().toString(36).substring(2, 9)}`).current;

  const pathSegments = window.location.pathname.split("/");
  const id = pathSegments[pathSegments.indexOf("deployments") + 1];

  const { data: deploymentListData = [] } = useQuery<Deployment[]>({
    queryKey: ["deployments", clusterId, instanceName],
    queryFn: async () => {
      if (!isConnected) {
        return [];
      }

      if (!instanceName) {
        console.error("No instance name provided");
        return [];
      }

      return new Promise<Deployment[]>((resolve) => {
        const requestId = ulid();
        const timeoutId = setTimeout(() => {
          unsubscribe(subscriberId);
          resolve([]);
        }, 10000);

        const handler = (message: any) => {
          
          if (message.kind === "task_response" && message.requestId === requestId) {
            clearTimeout(timeoutId);
            unsubscribe(subscriberId);
            
            if (message.success && message.data && Array.isArray(message.data)) {
              const deployments = message.data.map((item: any) => ({
                id: item.id,
                config: item.config,
                status: item.status,
                created_at: item.created_at,
                updated_at: item.updated_at,
              }));
              resolve(deployments);
            } else {
              resolve([]);
            }
          }
        };

        subscribe(subscriberId, handler);
        
        sendJson({
          kind: "deployment_list",
          requestId,
          instanceName: instanceName,
        });
      });
    },
    enabled: !!clusterId && isConnected && !!instanceName,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const instanceNames = useMemo(() => {
    const cachedQueries = queryClient.getQueryCache().findAll({ queryKey: ['instance-status'] });
    return cachedQueries
      .map(query => {
        const key = query.queryKey as readonly [string, string];
        return key[1];
      })
      .filter((name): name is string => Boolean(name));
  }, [queryClient]);

  const instanceQueries = useQueries({
    queries: instanceNames.map(instanceName => ({
      queryKey: ['instance-status', instanceName],
      queryFn: async () => null,
      enabled: false,
      staleTime: 0,
      gcTime: 1000 * 60 * 30,
    })),
  });

  // Merge data
  const deployments = useMemo(() => {
    const instanceDeployments = instanceQueries.flatMap((query, index) => {
      const data = query.data as InstanceStream | null | undefined;
      const update = data?.update as any;
      const deployments = update?.deployments as Deployment[] | undefined;
      const instanceName = instanceNames[index];
      
      return (deployments || []).map(deployment => ({
        ...deployment,
        _instanceName: instanceName,
      }));
    });

    const deploymentMap = new Map<string, Deployment>();

    instanceDeployments.forEach(deployment => {
      deploymentMap.set(deployment.id, deployment);
    });
    
    deploymentListData.forEach(deployment => {
      const merged = {
        ...deployment,
        _instanceName: instanceName,
      };
      deploymentMap.set(deployment.id, merged as Deployment);
    });

    return Array.from(deploymentMap.values());
  }, [instanceQueries, instanceNames, deploymentListData]);

  const isLoading = !isConnected && deployments.length === 0;

  const selectedDeployment = id ? deployments?.find(deployment => deployment.id === id) || null : null;
  const selectedInstanceName = selectedDeployment ? (selectedDeployment as any)._instanceName : undefined;
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

  const refetchDeploymentList = useCallback(() => {
    return queryClient.invalidateQueries({ 
      queryKey: ["deployments", clusterId, instanceName] 
    });
  }, [queryClient, clusterId, instanceName]);

  return {
    selectedDeployment,
    selectedInstanceName,
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
    refetchDeploymentList,
  };
}
