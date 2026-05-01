// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiSuccessResponse } from "@/types";
import { useUrlState } from "./use-url-state";

/** GET /v1/services/:id/secrets returns keys only — values are always masked. */
export function useServiceSecrets(serviceId: string | null) {
  const queryClient = useQueryClient();
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();

  const { data: secrets, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["service-secrets", serviceId],
    queryFn: async () => {
      const response = await axios.get<ApiSuccessResponse<{ secrets: Record<string, string> }>>(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/secrets`,
        { withCredentials: true }
      );
      return response.data.data?.secrets ?? {};
    },
    enabled: !!serviceId,
    staleTime: 30 * 1000,
  });

  const setSecrets = useMutation({
    mutationFn: async (newSecrets: Record<string, string>) => {
      await axios.put(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/secrets`,
        { secrets: newSecrets },
        { withCredentials: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-secrets", serviceId] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || err?.message || "Failed to update secrets";
      setAppError({ appError: { message, helpLink: "" } });
    },
  });

  const deleteSecret = useMutation({
    mutationFn: async (key: string) => {
      await axios.delete(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/secrets/${encodeURIComponent(key)}`,
        { withCredentials: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-secrets", serviceId] });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.error?.message || err?.message || "Failed to delete secret";
      setAppError({ appError: { message, helpLink: "" } });
    },
  });

  return {
    secrets: secrets ?? {},
    isLoading,
    setSecrets,
    deleteSecret,
  };
}