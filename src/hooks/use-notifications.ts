// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClusterId } from "@/hooks/use-cluster-id";
import { useAppAlert } from "@/contexts/app-alert-context";
import { getApiErrorMessage, getApiErrorHelpLink } from "@/lib/api-error";
import type { ApiSuccessResponse } from "@/types";

export interface NotificationsConfig {
  clusterId: string;
  enabled: boolean;
  slackWebhookUrl: string | null;
  discordWebhookUrl: string | null;
  createdAt?: number;
  updatedAt?: number;
}

export interface NotificationsUpsertPayload {
  enabled: boolean;
  slackWebhookUrl?: string | null;
  discordWebhookUrl?: string | null;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const clusterId = useClusterId();
  const { setError } = useAppAlert();

  const queryKey = ["notifications", clusterId];

  const { data: notifications, isLoading } = useQuery<NotificationsConfig | null>({
    queryKey,
    queryFn: async (): Promise<NotificationsConfig | null> => {
      if (!clusterId) return null;
      try {
        const response = await axios.get<ApiSuccessResponse<{ notifications: NotificationsConfig }>>(
          `${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/notifications`,
          { withCredentials: true },
        );
        return response.data.data.notifications;
      } catch {
        return null;
      }
    },
    enabled: Boolean(clusterId),
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: NotificationsUpsertPayload) => {
      if (!clusterId) throw new Error("Missing clusterId");
      const response = await axios.put<ApiSuccessResponse<{ notifications: NotificationsConfig }>>(
        `${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/notifications`,
        payload,
        { withCredentials: true },
      );
      return response.data.data.notifications;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => {
      const message = getApiErrorMessage(error, "Failed to save notification config.");
      const helpLink = getApiErrorHelpLink(error);
      setError({ message, helpLink });
    },
  });

  return {
    notifications: notifications ?? null,
    isLoading,
    saveNotifications: upsertMutation.mutate,
    saveNotificationsAsync: upsertMutation.mutateAsync,
    isSaving: upsertMutation.isPending,
  };
}
