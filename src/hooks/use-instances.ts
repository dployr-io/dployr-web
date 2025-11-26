import { useState } from "react";
import type { Instance, InstanceStatus, Log, LogLevel } from "@/types";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUrlState } from "@/hooks/use-url-state";
import { useClusterId } from "@/hooks/use-cluster-id";


export function useInstances() {
  const queryClient = useQueryClient();
  const { useAppError } = useUrlState();
  const [, setError] = useAppError();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const clusterId = useClusterId();

  const { data, isLoading: isLoadingInstances } = useQuery<Instance[]>({
    queryKey: ["instances", clusterId],
    queryFn: async (): Promise<Instance[]> => {
      if (!clusterId) return [];

      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/instances`, {
          params: { clusterId },
          withCredentials: true,
        });

        const data = response?.data?.data;
        return Array.isArray(data)
          ? (data as any[]).map(item => ({
              id: item.bootstrapId,
              clusterId: item.clusterId,
              instanceId: item.instanceId ?? null,
              address: item.address,
              tag: item.tag,
              publicKey: item.publicKey ?? "",
              status: (item.status ?? "stopped") as InstanceStatus,
              cpuCount: item.cpuCount ?? 0,
              memorySizeMb: item.memorySizeMb ?? 0,
              resources: {
                cpu: item.resources?.cpu ?? 0,
                memory: item.resources?.memory ?? 0,
                disk: item.resources?.disk ?? 0,
              },
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            }))
          : [];
      } catch (error) {
        console.error((error as Error).message || "An unknown error occurred while retrieving instances");
        return [];
      }
    },
    enabled: !!clusterId,
    staleTime: 5 * 60 * 1000,
  });


  const instances: Instance[] = data ?? [];


  const totalPages = Math.ceil(instances.length / itemsPerPage) || 1;
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedInstances = instances.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const addInstance = useMutation({
    mutationFn: async ({ address, tag, publicKey }: { address: string; tag: string; publicKey: string; }): Promise<void> => {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/instances`,
        { clusterId, address, tag, publicKey },
        {
          withCredentials: true,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances", clusterId] });
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || error?.message || "An error occurred while adding instance.";

      const helpLink = error?.response?.data?.error.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  function getLogs(instanceId: string) {
    const { data: logs = [], isLoading: isLoadingLogs } = useQuery<Log[]>({
      queryKey: ["instance", instanceId],
      queryFn: async () => {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/v1/instances/${instanceId}/logs`,
          { withCredentials: true }
        );

        return response.data.data.map((item: any) => ({
          id: item.id,
          timestamp: new Date(item.ts),
          level: item.level as LogLevel,
          message: item.message,
          instanceId: item.instanceId,
          address: item.address,
        }));
      },
      enabled: !!instanceId,
    });

    return {
      logs,
      isLoadingLogs,
    };
  }

  const getInstanceLogs = (instanceId: string) => {
    queryClient.prefetchQuery({ queryKey: ["instance", instanceId] });
  };

  return {
    instances,
    paginatedInstances,
    currentPage: safePage,
    totalPages,
    startIndex,
    endIndex,
    isLoading: isLoadingInstances,
    addInstance,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    getLogs,
    getInstanceLogs,
  };
}
