// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import { useInstanceStream } from "./use-instance-stream";
import { useUrlState } from "./use-url-state";
import { ulid } from "ulid";

const DEPLOYMENT_ERRORS = {
  MISSING_PARAMS: "Instance ID is required for deployment.",
  NOT_CONNECTED: "WebSocket is not connected",
  SEND_FAILED: "Failed to send deployment request",
  BLUEPRINT_NOT_FOUND: "Service blueprint not found",
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
    (instanceName: string, payload: DeploymentPayload): DeploymentResult => {
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

      // Validate instance Name
      if (!instanceName) {
        setAppError({
          appError: {
            message: DEPLOYMENT_ERRORS.MISSING_PARAMS,
            helpLink: "",
          },
        });
        return { success: false, error: DEPLOYMENT_ERRORS.MISSING_PARAMS };
      }

      // Send deployment request
      const sent = sendJson({
        kind: "deploy",
        instanceId: instanceName,
        payload,
        requestId: ulid(),
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
  };
}

export { DEPLOYMENT_ERRORS };
