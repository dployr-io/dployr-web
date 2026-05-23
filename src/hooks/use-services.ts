// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useInstances } from "@/hooks/use-instances";
import { usePagination } from "@/hooks/use-standardized-pagination";
import type { NormalizedService } from "@/types";

export interface ServiceWithInstance extends NormalizedService {
  _instanceName: string;
  _instanceId: string;
}

export function useServices(instanceTag?: string | null, pageOptions?: { externalPage?: number; onPageChange?: (page: number) => void }) {
  const { instances, isLoading: isInstancesLoading } = useInstances();

  const serviceQueries = useQueries({
    queries: instances.map(instance => ({
      queryKey: ["instance", instance.tag, "services"] as const,
      enabled: false,
      initialData: [] as NormalizedService[],
      queryFn: (): NormalizedService[] => [],
    })),
  });

  const allServices = useMemo(() => {
    const services: ServiceWithInstance[] = [];

    instances.forEach((instance, i) => {
      const instanceServices = serviceQueries[i]?.data ?? [];
      for (const service of instanceServices) {
        services.push({
          ...service,
          _instanceName: instance.tag,
          _instanceId: instance.id,
        });
      }
    });

    return services.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [instances, serviceQueries]);

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
    return allServices.find(s => s.name === id) || null;
  }, [allServices]);

  const selectedInstanceName = selectedService?._instanceName;

  return {
    services,
    allServices,
    selectedService,
    selectedInstanceName,
    isLoading: false,
    isInstancesLoading,
    isConnected: true,
    error: null,
    ...pagination,
    paginatedServices: pagination.paginatedItems,
  };
}