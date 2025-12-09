// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import type { ApiSuccessResponse, Instance, InstanceStatus, PaginatedData, PaginationMeta } from "@/types";
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

  const { data, isLoading: isLoadingInstances } = useQuery<PaginatedData<Instance>>({
    queryKey: ["instances", clusterId, currentPage, itemsPerPage],
    queryFn: async (): Promise<PaginatedData<Instance>> => {
      if (!clusterId) {
        return {
          items: [],
          pagination: {
            page: currentPage,
            pageSize: itemsPerPage,
            totalItems: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          } satisfies PaginationMeta,
        };
      }

      try {
        const response = await axios.get<ApiSuccessResponse<PaginatedData<any>>>(`${import.meta.env.VITE_BASE_URL}/v1/instances`, {
          params: { clusterId, page: currentPage, pageSize: itemsPerPage },
          withCredentials: true,
        });

        const payload = response?.data?.data;
        const items = Array.isArray(payload?.items)
          ? payload!.items.map(item => ({
              id: item.id ?? item.bootstrapId,
              address: item.address,
              publicKey: item.metadata?.clientCert?.pem ?? "",
              tag: item.tag,
              resources: item.resources ?? {
                cpu: 0,
                memory: 0,
                disk: 0,
              },
              cpuCount: item.cpuCount ?? 0,
              memorySizeMb: item.memorySizeMb ?? 0,
              status: (item.status ?? "stopped") as InstanceStatus,
              metadata: item.metadata ?? {},
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            })) as Instance[]
          : [];

        const pagination: PaginationMeta = payload?.pagination ?? {
          page: currentPage,
          pageSize: itemsPerPage,
          totalItems: items.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        };

        return { items, pagination };
      } catch (error) {
        console.error((error as Error).message || "An unknown error occurred while retrieving instances");
        return {
          items: [],
          pagination: {
            page: currentPage,
            pageSize: itemsPerPage,
            totalItems: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          } satisfies PaginationMeta,
        };
      }
    },
    enabled: !!clusterId,
    staleTime: 5 * 60 * 1000,
  });

  const instances: Instance[] = data?.items ?? [];
  const totalPages = data?.pagination?.totalPages || 1;
  const safePage = data?.pagination?.page || currentPage;
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedInstances = instances;

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
    mutationFn: async ({ address, tag, publicKey }: { address: string; tag: string; publicKey: string; }): Promise<ApiSuccessResponse<any>> => {
      const response = await axios.post<ApiSuccessResponse<any>>(
        `${import.meta.env.VITE_BASE_URL}/v1/instances`,
        { clusterId, address, tag, publicKey },
        {
          withCredentials: true,
        }
      );

      return response.data;
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

  const deleteInstance = useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      await axios.delete(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${id}`,
        {
          params: { clusterId },
          withCredentials: true,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances", clusterId] });
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage =
        typeof errorData === "string"
          ? errorData
          : errorData?.message || error?.message || "An error occurred while deleting instance.";

      const helpLink = error?.response?.data?.error.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  const rotateInstanceToken = useMutation({
    mutationFn: async ({ id, token }: { id: string; token: string }): Promise<void> => {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${id}/tokens/rotate`,
        { token },
        {
          withCredentials: true,
        },
      );
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage =
        typeof errorData === "string"
          ? errorData
          : errorData?.message || error?.message || "An error occurred while rotating bootstrap token.";

      const helpLink = error?.response?.data?.error.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  const updateInstance = useMutation({
    mutationFn: async ({ id, address, tag, publicKey }: { id: string; address: string; tag: string; publicKey: string }): Promise<void> => {
      await axios.patch(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${id}`,
        { clusterId, address, tag, publicKey },
        {
          withCredentials: true,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instances", clusterId] });
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage =
        typeof errorData === "string"
          ? errorData
          : errorData?.message || error?.message || "An error occurred while updating instance.";

      const helpLink = error?.response?.data?.error.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  const installVersion = useMutation({
    mutationFn: async ({ id, version }: { id: string; version?: string }): Promise<ApiSuccessResponse<any>> => {
      const response = await axios.post<ApiSuccessResponse<any>>(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${id}/system/install`,
        version ? { version } : {},
        {
          params: { clusterId },
          withCredentials: true,
        },
      );
      return response.data;
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage =
        typeof errorData === "string"
          ? errorData
          : errorData?.message || error?.message || "An error occurred while installing version.";

      const helpLink = error?.response?.data?.error.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  const restartInstance = useMutation({
    mutationFn: async ({ id, force }: { id: string; force?: boolean }): Promise<ApiSuccessResponse<any>> => {
      const response = await axios.post<ApiSuccessResponse<any>>(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${id}/system/restart`,
        force ? { force } : {},
        {
          params: { clusterId },
          withCredentials: true,
        },
      );
      return response.data;
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage =
        typeof errorData === "string"
          ? errorData
          : errorData?.message || error?.message || "An error occurred while restarting instance.";

      const helpLink = error?.response?.data?.error.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  const rebootInstance = useMutation({
    mutationFn: async ({ id, force }: { id: string; force?: boolean }): Promise<ApiSuccessResponse<any>> => {
      const response = await axios.post<ApiSuccessResponse<any>>(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${id}/system/reboot`,
        force ? { force } : {},
        {
          params: { clusterId },
          withCredentials: true,
        },
      );
      return response.data;
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage =
        typeof errorData === "string"
          ? errorData
          : errorData?.message || error?.message || "An error occurred while rebooting instance.";

      const helpLink = error?.response?.data?.error.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  return {
    instances,
    paginatedInstances,
    currentPage: safePage,
    totalPages,
    startIndex,
    endIndex,
    isLoading: isLoadingInstances,
    addInstance,
    updateInstance,
    rotateInstanceToken,
    deleteInstance,
    installVersion,
    restartInstance,
    rebootInstance,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
}
