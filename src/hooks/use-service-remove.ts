// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import { useInstanceStream } from "./use-instance-stream";
import { useUrlState } from "./use-url-state";

const SERVICE_REMOVE_ERRORS = {
  NOT_CONNECTED: "WebSocket is not connected",
  SEND_FAILED: "Failed to send service removal request",
  MISSING_PARAMS: "Missing required parameters",
} as const;

interface ServiceRemoveResult {
  success: boolean;
  error?: string;
}

/**
 * Hook for handling service removal operations.
 */
export function useServiceRemove() {
  const { sendJson, isConnected: wsConnected } = useInstanceStream();
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();

  const removeService = useCallback(
    (serviceId: string, requestId: string): ServiceRemoveResult => {
      // Validate WebSocket connection
      if (!wsConnected) {
        setAppError({
          appError: {
            message: SERVICE_REMOVE_ERRORS.NOT_CONNECTED,
            helpLink: "",
          },
        });
        return { success: false, error: SERVICE_REMOVE_ERRORS.NOT_CONNECTED };
      }

      // Validate required parameters
      if (!serviceId || !requestId) {
        setAppError({
          appError: {
            message: "Service ID, and Request ID are required for service removal.",
            helpLink: "",
          },
        });
        return { success: false, error: SERVICE_REMOVE_ERRORS.MISSING_PARAMS };
      }

      // Send service removal request
      const sent = sendJson({
        kind: "service_remove",
        serviceId,
        requestId,
      });

      if (!sent) {
        setAppError({
          appError: {
            message: SERVICE_REMOVE_ERRORS.SEND_FAILED,
            helpLink: "",
          },
        });
        return { success: false, error: SERVICE_REMOVE_ERRORS.SEND_FAILED };
      }

      return { success: true };
    },
    [wsConnected, sendJson, setAppError]
  );

  return {
    handleRemoveService: removeService,
    isConnected: wsConnected,
  };
}

export { SERVICE_REMOVE_ERRORS };
