// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import { useInstanceStream } from "./use-instance-stream";
import { useUrlState } from "./use-url-state";

export const DEPLOYMENT_ERRORS = {
  NOT_CONNECTED: "Not connected to deployment service. Please try again.",
  SEND_FAILED: "Failed to send deployment request. Please try again.",
  BLUEPRINT_NOT_FOUND: "Service blueprint not found. Unable to update service.",
  INVALID_PAYLOAD: "Invalid deployment payload. Please check your inputs.",
} as const;

interface DeploymentPayload {
  [key: string]: any;
}

interface DeploymentResult {
  success: boolean;
  error?: string;
}

/**
 * Shared hook for handling deployment operations across the application.
 */
export function useDeployment() {
  const { sendJson, isConnected: wsConnected } = useInstanceStream();
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();

  const deploy = useCallback(
    (instanceId: string, payload: DeploymentPayload): DeploymentResult => {
      // Validate WebSocket connection
      if (!wsConnected) {
        setAppError({
          appError: {
            message: DEPLOYMENT_ERRORS.NOT_CONNECTED,
            helpLink: "",
          },
        });
        return { success: false, error: DEPLOYMENT_ERRORS.NOT_CONNECTED };
      }

      // Validate instance ID
      if (!instanceId) {
        setAppError({
          appError: {
            message: "Instance ID is required for deployment.",
            helpLink: "",
          },
        });
        return { success: false, error: "Instance ID is required" };
      }

      // Send deployment request
      const sent = sendJson({
        kind: "deploy",
        instanceId,
        payload,
      });

      if (!sent) {
        setAppError({
          appError: {
            message: DEPLOYMENT_ERRORS.SEND_FAILED,
            helpLink: "",
          },
        });
        return { success: false, error: DEPLOYMENT_ERRORS.SEND_FAILED };
      }

      return { success: true };
    },
    [wsConnected, sendJson, setAppError]
  );

  return {
    deploy,
    isConnected: wsConnected,
    DEPLOYMENT_ERRORS,
  };
}
