// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { useUrlState } from "./use-url-state";
import { useClusterId } from "./use-cluster-id";
import type { ApiSuccessResponse } from "@/types";
import type { DeploymentDraft } from "./use-deployment-draft";

const DEPLOYMENT_ERRORS = {
  MISSING_PARAMS: "Instance name is required for deployment.",
  SEND_FAILED: "Failed to send deployment request",
  BLUEPRINT_NOT_FOUND: "Service blueprint not found",
} as const;

interface DeploymentResult {
  success: boolean;
  error?: string;
  status?: number;
  deployment?: any;
  taskId?: string;
  serviceId?: string;
}

export function useDeployment() {
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();
  const clusterId = useClusterId();
  const queryClient = useQueryClient();

  const deploy = useCallback(
    async (instanceName: string, payload: Partial<Omit<DeploymentDraft, "id" | "updatedAt">>): Promise<DeploymentResult> => {
      if (!instanceName) {
        const error = DEPLOYMENT_ERRORS.MISSING_PARAMS;
        setAppError({ appError: { message: error, helpLink: "" } });
        return { success: false, error };
      }

      try {
        const response = await axios.post<ApiSuccessResponse<{ deployment: any; taskId: string }>>(
          `${import.meta.env.VITE_BASE_URL}/v1/deployments`,
          { instanceName, payload },
          { withCredentials: true, params: { clusterId } }
        );

        queryClient.invalidateQueries({ queryKey: ["deployments", clusterId] });
        queryClient.invalidateQueries({ queryKey: ["services", clusterId] });

        const data = response.data.data;
        return { success: true, deployment: data?.deployment, taskId: data?.taskId };
      } catch (err: any) {
        const status = err?.response?.status as number | undefined;
        const errorData = err?.response?.data?.error;
        const message = (typeof errorData === "string" ? errorData : errorData?.message) ?? err?.message ?? DEPLOYMENT_ERRORS.SEND_FAILED;
        const helpLink = errorData?.helpLink ?? "";

        setAppError({ appError: { message, helpLink } });
        return { success: false, error: message, status, serviceId: errorData?.serviceId };
      }
    },
    [setAppError, clusterId, queryClient]
  );

  return { deploy };
}

export { DEPLOYMENT_ERRORS };
