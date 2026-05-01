// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiSuccessResponse } from "@/types";
import { useUrlState } from "./use-url-state";

export function useServiceEnvs(serviceId: string | null) {
  const queryClient = useQueryClient();
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();

  const { data: envs, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["service-envs", serviceId],
    queryFn: async () => {
      const response = await axios.get<ApiSuccessResponse<{ envs: Record<string, string> }>>(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/envs`,
        { withCredentials: true }
      );
      return response.data.data?.envs ?? {};
    },
    enabled: !!serviceId,
    staleTime: 30 * 1000,
  });

  const setEnvs = useMutation({
    mutationFn: async (newEnvs: Record<string, string>) => {
      await axios.put(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/envs`,
        { envs: newEnvs },
        { withCredentials: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-envs", serviceId] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || err?.message || "Failed to update environment variables";
      setAppError({ appError: { message, helpLink: "" } });
    },
  });

  const deleteEnv = useMutation({
    mutationFn: async (key: string) => {
      await axios.delete(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/envs/${encodeURIComponent(key)}`,
        { withCredentials: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-envs", serviceId] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || err?.message || "Failed to delete environment variable";
      setAppError({ appError: { message, helpLink: "" } });
    },
  });

  return {
    envs: envs ?? {},
    isLoading,
    setEnvs,
    deleteEnv,
  };
}