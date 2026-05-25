// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAppAlert } from "@/contexts/app-alert-context";

export interface ServiceUpdatePayload {
  instanceName: string;
  /** Full replacement for env vars. Omit to leave unchanged. */
  env_vars?: Record<string, string>;
  /** New/updated secrets (non-empty values only). Omit to leave unchanged. */
  secrets?: Record<string, string>;
  /** Existing secret keys whose values are unchanged (must be preserved). */
  keep_secret_keys?: string[];
  description?: string | null;
  run_cmd?: string | null;
  build_cmd?: string | null;
  port?: number | null;
  working_dir?: string | null;
  static_dir?: string | null;
  image?: string | null;
  domain?: string | null;
  runtime?: string | null;
  version?: string | null;
  remote_url?: string | null;
  remote_branch?: string | null;
  health_check?: string | null;
}

export function useServiceUpdate(serviceId: string | null) {
  const queryClient = useQueryClient();
  const { setError: setAppError, setNotification } = useAppAlert();

  return useMutation({
    mutationFn: async (payload: ServiceUpdatePayload) => {
      const { data } = await axios.patch(`${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}`, payload, { withCredentials: true });
      return data;
    },
    onSuccess: (_, payload) => {
      if (payload.env_vars !== undefined) {
        queryClient.invalidateQueries({ queryKey: ["service-envs", serviceId] });
      }
      if (payload.secrets !== undefined || (payload.keep_secret_keys?.length ?? 0) > 0) {
        queryClient.invalidateQueries({ queryKey: ["service-secrets", serviceId] });
      }
      setNotification({ message: "Service updated — redeploying now", helpLink: "" });
    },
    onError: (err: any) => {
      setAppError({ message: getApiErrorMessage(err, "Failed to update service"), helpLink: "" });
    },
  });
}
