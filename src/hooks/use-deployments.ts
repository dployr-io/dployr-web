// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Deployment } from "@/types";
import { useEffect, useId, useState } from "react";
import { useInstanceStream, type StreamMessage } from "@/hooks/use-instance-stream";

export function useDeployments() {
  const subscriberId = useId();
  const { isConnected, error: streamError, sendJson, subscribe, unsubscribe } = useInstanceStream();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get deployment ID from URL
  const pathSegments = window.location.pathname.split("/");
  const id = pathSegments[pathSegments.indexOf("deployments") + 1];

  useEffect(() => {
    const handleMessage = (message: StreamMessage) => {
      if (message.kind !== "update") {
        return;
      }

      try {
        const data = message as any;
        const streamDeployments: Deployment[] = data?.update?.deployments || [];
        setDeployments(streamDeployments);
        setIsLoading(false);
      } catch (parseError) {
        setError((parseError as Error).message || "Failed to parse deployments");
        setIsLoading(false);
      }
    };

    subscribe(subscriberId, handleMessage);

    if (isConnected) {
      sendJson({ kind: "client_subscribe" });
    }

    return () => {
      unsubscribe(subscriberId);
    };
  }, [isConnected, subscriberId, subscribe, unsubscribe, sendJson]);

  const selectedDeployment = id ? deployments?.find(deployment => deployment.id === id) || null : null;
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
    deployments,
    paginatedDeployments,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    isLoading,
    isConnected,
    error: error || streamError,

    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
}
