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
  name?: string;
}

/**
 * Hook for handling service removal operations.
 */
export function useServiceRemove() {
  const { sendJson, isConnected: wsConnected } = useInstanceStream();
  const { useAppError, useAppNotification } = useUrlState();
  const [, setAppError] = useAppError();
  const [, setAppNotification] = useAppNotification();

  const removeService = useCallback(
    (name: string, requestId: string): ServiceRemoveResult => {
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
      if (!name || !requestId) {
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
        name,
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

      setAppNotification({
        appNotification: {
          message: `Service ${name} sent for removal`,
          link: "",
        },
      });

      return { success: true, name };
    },
    [wsConnected, sendJson, setAppError, setAppNotification]
  );

  return {
    handleRemoveService: removeService,
    isConnected: wsConnected,
  };
}

export { SERVICE_REMOVE_ERRORS };
