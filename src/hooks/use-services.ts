// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { useInstanceStatus } from "./use-instance-status";

export function useServices() {
  const { update } = useInstanceStatus();
  const { isConnected, error: streamError } = useInstanceStream();

  const pathSegments = window.location.pathname.split("/");
  const id = pathSegments[pathSegments.indexOf("services") + 1];
  const services = update?.workloads?.services || [];
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
