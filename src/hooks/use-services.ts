// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useInstances } from "@/hooks/use-instances";
import { usePagination } from "@/hooks/use-standardized-pagination";
import type { NormalizedDeployment, NormalizedService } from "@/types";

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

  const deploymentQueries = useQueries({
    queries: instances.map(instance => ({
      queryKey: ["instance", instance.tag, "deployments"] as const,
      enabled: false,
      initialData: [] as NormalizedDeployment[],
      queryFn: (): NormalizedDeployment[] => [],
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

      // Synthesize ghost rows for in-flight deployments with no matching service yet
      const serviceNames = new Set(instanceServices.map(s => s.name));
      const instanceDeployments = deploymentQueries[i]?.data ?? [];
      for (const dep of instanceDeployments) {
        if ((dep.status === "pending" || dep.status === "running") && !serviceNames.has(dep.name)) {
          services.push({
            id: dep.id,
            name: dep.name,
            description: dep.description,
            source: dep.source,
            type: undefined,
            runtime: dep.runtime,
            remote: dep.remote,
            runCmd: dep.runCmd,
            buildCmd: dep.buildCmd,
            port: dep.port,
            workingDir: dep.workingDir,
            envVars: dep.envVars,
            secrets: dep.secrets,
            createdAt: dep.createdAt,
            updatedAt: dep.updatedAt,
            status: "deploying",
            _instanceName: instance.tag,
            _instanceId: instance.id,
          });
        }
      }
    });

    return services.sort((a, b) => {
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [instances, serviceQueries, deploymentQueries]);

  // Rank for deduplication: running beats deploying beats everything else
  const statusRank = (s: ServiceWithInstance) =>
    s.status === "running" ? 2 : s.status === "deploying" ? 1 : 0;

  const dedupedServices = useMemo(() => {
    const seen = new Map<string, ServiceWithInstance>();
    for (const service of allServices) {
      const existing = seen.get(service.name);
      if (!existing) {
        seen.set(service.name, service);
      } else if (
        statusRank(service) > statusRank(existing) ||
        (statusRank(service) === statusRank(existing) &&
          new Date(service.updatedAt || 0) > new Date(existing.updatedAt || 0))
      ) {
        seen.set(service.name, service);
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }, [allServices]);

  const services = useMemo(() => {
    if (instanceTag && instanceTag !== "all") {
      return allServices.filter(s => s._instanceName === instanceTag);
    }
    return dedupedServices;
  }, [allServices, dedupedServices, instanceTag]);

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