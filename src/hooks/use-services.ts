// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useInstances } from "@/hooks/use-instances";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { usePagination } from "@/hooks/use-standardized-pagination";
import type { NormalizedInstanceData, NormalizedService } from "@/types";

export interface ServiceWithInstance extends NormalizedService {
  _instanceName: string;
  _instanceId: string;
}

export function useServices(filterInstanceName?: string | null) {
  const queryClient = useQueryClient();
  const { instances } = useInstances();
  const { isConnected, error: streamError } = useInstanceStream();

  // Aggregate services from all instances in the query cache
  const allServices = useMemo(() => {
    const services: ServiceWithInstance[] = [];

    for (const instance of instances) {
      const instanceData = queryClient.getQueryData<NormalizedInstanceData>(
        ["instance-status", instance.tag]
      );

      if (instanceData?.workloads?.services) {
        for (const service of instanceData.workloads.services) {
          services.push({
            ...service,
            _instanceName: instance.tag,
            _instanceId: instance.id,
          });
        }
      }
    }

    // Sort by updatedAt descending (most recently updated first)
    return services.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [instances, queryClient]);

  // Filter by instance if specified
  const services = useMemo(() => {
    if (!filterInstanceName || filterInstanceName === "all") {
      return allServices;
    }
    return allServices.filter(s => s._instanceName === filterInstanceName);
  }, [allServices, filterInstanceName]);

  // Use standardized pagination
  const pagination = usePagination(services);

  // Get selected service from URL
  const selectedService = useMemo(() => {
    const pathSegments = window.location.pathname.split("/");
    const servicesIndex = pathSegments.indexOf("services");
    const id = servicesIndex >= 0 ? pathSegments[servicesIndex + 1] : null;
    
    if (!id) return null;
    return allServices.find(s => s.id === id) || null;
  }, [allServices]);

  const selectedInstanceName = selectedService?._instanceName;

  const isLoading = !isConnected && allServices.length === 0;

  return {
    // Data
    services,
    allServices,
    selectedService,
    selectedInstanceName,
    isLoading,
    isConnected,
    error: streamError,
    ...pagination,
    paginatedServices: pagination.paginatedItems,
  };
}
