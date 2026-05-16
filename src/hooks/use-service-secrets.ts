// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiSuccessResponse } from "@/types";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAppAlert } from "@/contexts/app-alert-context";

interface ServiceSecretMeta {
  id: string;
  serviceId: string;
  key: string;
  createdAt: number;
  updatedAt: number;
}

/** GET /v1/services/:id/secrets returns keys only — values are always masked. */
export function useServiceSecrets(serviceId: string | null) {
  const queryClient = useQueryClient();
  const { setError: setAppError } = useAppAlert();

  const { data: secrets, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["service-secrets", serviceId],
    queryFn: async () => {
      const response = await axios.get<ApiSuccessResponse<{ secrets: ServiceSecretMeta[] }>>(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/secrets`,
        { withCredentials: true }
      );
      // Backend returns metadata only — no plaintext values. Map keys to empty
      // strings so the editor can display existing key names in masked fields.
      return Object.fromEntries((response.data.data?.secrets ?? []).map((s) => [s.key, ""]));
    },
    enabled: !!serviceId,
    staleTime: 30 * 1000,
  });

  const setSecrets = useMutation({
    mutationFn: async (newSecrets: Record<string, string>) => {
      // Skip entries with empty values — they represent existing keys whose
      // values were not changed by the user (we never receive plaintext back).
      const toWrite = Object.fromEntries(Object.entries(newSecrets).filter(([, v]) => v !== ""));
      if (Object.keys(toWrite).length === 0) return;
      await axios.put(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/secrets`,
        { secrets: toWrite },
        { withCredentials: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-secrets", serviceId] });
    },
    onError: (err: any) => {
      const message = getApiErrorMessage(err, "Failed to update secrets");
      setAppError({ message, helpLink: "" });
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
      const message = getApiErrorMessage(err, "Failed to delete secret");
      setAppError({ message, helpLink: "" });
    },
  });

  return {
    secrets: secrets ?? {},
    isLoading,
    setSecrets,
    deleteSecret,
  };
}
