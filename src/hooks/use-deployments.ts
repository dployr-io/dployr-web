// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { useInstanceStatus } from "@/hooks/use-instance-status";

export function useDeployments(instanceName?: string | null) {
  const { update } = useInstanceStatus();
  const deployments = update?.workloads?.deployments || [];
  
  const id = window.location.pathname.split("/")[2];
  const selectedDeployment = deployments?.find(deployment => deployment.id === id) || null;
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

  return {
    selectedDeployment,
    selectedInstanceName,
    deployments,
    paginatedDeployments,
    currentPage,
    totalPages,
    startIndex,
    endIndex,

    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
}
