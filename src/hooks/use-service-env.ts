// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiSuccessResponse, NormalizedService } from "@/types";
import { DEPLOYMENT_ERRORS } from "./use-deployment";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAppAlert } from "@/contexts/app-alert-context";

export function useServiceEnv(service: NormalizedService | null) {
  const queryClient = useQueryClient();
  const { setError: setAppError } = useAppAlert();

  const serviceId = service?.id ?? null;

  const { data: fetchedEnvs } = useQuery<Record<string, string>>({
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

  // Prefer HTTP-fetched envs; fall back to WS cache while loading
  const config: Record<string, string | number | boolean> = fetchedEnvs ?? (service?.envVars as Record<string, string | number | boolean> | null) ?? {};

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleEdit = useCallback((key: string) => {
    setEditingKey(key);
    setEditValue(String(config[key] || ""));
  }, [config]);

  const handleSave = useCallback(async (key: string) => {
    if (!service) {
      setAppError({ message: DEPLOYMENT_ERRORS.BLUEPRINT_NOT_FOUND, helpLink: "" });
      return;
    }

    const updatedEnvs = { ...(fetchedEnvs ?? {}), [key]: editValue };

    try {
      await axios.put(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${service.id}/envs`,
        { envs: updatedEnvs },
        { withCredentials: true }
      );
      queryClient.invalidateQueries({ queryKey: ["service-envs", service.id] });
      setEditingKey(null);
      setEditValue("");
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Failed to save environment variable");
      setAppError({ message, helpLink: "" });
    }
  }, [service, fetchedEnvs, editValue, queryClient, setAppError]);

  const handleCancel = useCallback(() => {
    setEditingKey(null);
    setEditValue("");
  }, []);

  const handleKeyboardPress = useCallback((e: React.KeyboardEvent, key: string) => {
    if (e.key === "Enter") handleSave(key);
    else if (e.key === "Escape") handleCancel();
  }, [handleSave, handleCancel]);

  return {
    config,
    editingKey,
    editValue,
    setEditValue,
    handleEdit,
    handleSave,
    handleKeyboardPress,
    handleCancel,
  };
}
