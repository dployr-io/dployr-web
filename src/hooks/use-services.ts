// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInstances } from "@/hooks/use-instances";
import { usePagination } from "@/hooks/use-standardized-pagination";
import { useClusterId } from "@/hooks/use-cluster-id";
import type { ApiService, NormalizedInstanceData, NormalizedService } from "@/types";

export interface ServiceWithInstance extends NormalizedService {
  _instanceName: string;
  _instanceId: string;
  deploymentId: string | null;
  clusterId: string;
}

export function useServices(instanceTag?: string | null, pageOptions?: { externalPage?: number; onPageChange?: (page: number) => void }) {
  const queryClient = useQueryClient();
  const { instances } = useInstances();
  const clusterId = useClusterId();

  const { data: httpServices, isLoading } = useQuery<ApiService[]>({
    queryKey: ["services", clusterId],
    queryFn: async (): Promise<ApiService[]> => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/v1/services`,
          { params: { clusterId }, withCredentials: true }
        );
        const data = response?.data?.data?.items;
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error((error as Error).message || "An unknown error occurred while retrieving services");
        return [];
      }
    },
    enabled: !!clusterId,
    staleTime: 30 * 1000,
  });

  // Enrich each HTTP service with WS instance data (for rich fields + _instanceName)
  const allServices = useMemo(() => {
    const services: ServiceWithInstance[] = [];

    for (const httpService of httpServices ?? []) {
      let wsService: NormalizedService | undefined;
      let instanceName = "";
      let instanceId = "";

      for (const instance of instances) {
        const instanceData = queryClient.getQueryData<NormalizedInstanceData>(
          ["instance-status", instance.tag]
        );
        const match = instanceData?.workloads?.services?.find(s => s.id === httpService.id);
        if (match) {
          wsService = match;
          instanceName = instance.tag;
          instanceId = instance.id;
          break;
        }
      }

      services.push({
        // WS data (rich fields) takes precedence; fall back to HTTP defaults
        id: httpService.id,
        name: wsService?.name ?? httpService.name,
        description: wsService?.description ?? null,
        source: wsService?.source ?? null,
        runtime: wsService?.runtime ?? { type: httpService.type, version: null },
        remote: wsService?.remote ?? null,
        runCmd: wsService?.runCmd ?? null,
        buildCmd: wsService?.buildCmd ?? null,
        port: wsService?.port ?? null,
        workingDir: wsService?.workingDir ?? null,
        envVars: wsService?.envVars ?? null,
        secrets: wsService?.secrets ?? null,
        createdAt: wsService?.createdAt ?? String(httpService.createdAt),
        updatedAt: wsService?.updatedAt ?? String(httpService.updatedAt),
        // ServiceWithInstance extras
        _instanceName: instanceName,
        _instanceId: instanceId,
        deploymentId: httpService.deploymentId,
        clusterId: httpService.clusterId,
      });
    }

    return services.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [httpServices, instances, queryClient]);

  const services = useMemo(() => {
    if (!instanceTag || instanceTag === "all") return allServices;
    return allServices.filter(s => s._instanceName === instanceTag);
  }, [allServices, instanceTag]);

  const pagination = usePagination(services, pageOptions);

  const selectedService = useMemo(() => {
    const pathSegments = window.location.pathname.split("/");
    const servicesIndex = pathSegments.indexOf("services");
    const id = servicesIndex >= 0 ? pathSegments[servicesIndex + 1] : null;
    if (!id) return null;
    return allServices.find(s => s.id === id) || null;
  }, [allServices]);

  const selectedInstanceName = selectedService?._instanceName;

  return {
    services,
    allServices,
    selectedService,
    selectedInstanceName,
    isLoading,
    isConnected: true,
    error: null,
    ...pagination,
    paginatedServices: pagination.paginatedItems,
  };
}