// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import axios from "axios";
import { useClusterId } from "./use-cluster-id";
import { useInstanceStream } from "./use-instance-stream";
import type { ApiSuccessResponse } from "@/types";
import type { DeploymentDraft } from "./use-deployment-draft";
import { getApiErrorHelpLink, getApiErrorMessage } from "@/lib/api-error";
import { useAppAlert } from "@/contexts/app-alert-context";

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
  const { setError: setAppError } = useAppAlert();
  const clusterId = useClusterId();
  const { sendJson } = useInstanceStream();

  const deploy = useCallback(
    async (instanceName: string, payload: Partial<Omit<DeploymentDraft, "id" | "updatedAt">>): Promise<DeploymentResult> => {
      if (!instanceName) {
        const error = DEPLOYMENT_ERRORS.MISSING_PARAMS;
        setAppError({ message: error });
        return { success: false, error };
      }

      try {
        const response = await axios.post<ApiSuccessResponse<{ deployment: any; taskId: string }>>(
          `${import.meta.env.VITE_BASE_URL}/v1/deployments`,
          { instanceName, payload },
          { withCredentials: true, params: { clusterId } }
        );

        sendJson({ kind: "heartbeat", versions: { [instanceName]: { workloads: 0 } } });

        const data = response.data.data;
        return { success: true, deployment: data?.deployment, taskId: data?.taskId };
      } catch (err: any) {
        const status = err?.response?.status as number | undefined;
        const errorData = err?.response?.data?.error;
        const message = getApiErrorMessage(err, DEPLOYMENT_ERRORS.SEND_FAILED);
        const helpLink = getApiErrorHelpLink(err);

        setAppError({ message, helpLink });
        const serviceId = errorData && typeof errorData !== "string" ? errorData.serviceId : undefined;
        return { success: false, error: message, status, serviceId };
      }
    },
    [setAppError, clusterId, sendJson]
  );

  return { deploy };
}

export { DEPLOYMENT_ERRORS };
