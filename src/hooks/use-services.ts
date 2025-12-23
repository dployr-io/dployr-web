// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { InstanceStream, Service } from "@/types";
import { useMemo, useState } from "react";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { useQueryClient, useQueries } from "@tanstack/react-query";

export function useServices() {
  const queryClient = useQueryClient();
  const { isConnected, error: streamError } = useInstanceStream();

  const pathSegments = window.location.pathname.split("/");
  const id = pathSegments[pathSegments.indexOf("services") + 1];

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

  const services = useMemo(() => {
    return instanceQueries.flatMap(query => {
      const data = query.data as InstanceStream | null | undefined;
      const update = data?.update as any;
      const instanceId = update?.instance_id;
      const services = update?.services as Service[] | undefined;
      
      return (services || []).map(svc => ({
        ...svc,
        _instanceId: instanceId, 
      }));
    });
  }, [instanceQueries]);

  const isLoading = !isConnected && services.length === 0;

  const selectedService = id ? services?.find(service => service.id === id) || null : null;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil((services?.length ?? 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServices = Array.isArray(services) ? services.slice(startIndex, endIndex) : [];

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
    selectedService,
    services,
    paginatedServices,
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
