// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import axios from "axios";
import { getApiErrorHelpLink, getApiErrorMessage } from "@/lib/api-error";
import { useAppAlert } from "@/contexts/app-alert-context";

interface ServiceRemoveResult {
  success: boolean;
  error?: string;
}

export function useServiceRemove() {
  const { setError: setAppError, setNotification: setAppNotification } = useAppAlert();

  const removeService = useCallback(
    async (serviceId: string): Promise<ServiceRemoveResult> => {
      if (!serviceId) {
        const error = "Service ID is required for removal.";
        setAppError({ message: error, helpLink: "" });
        return { success: false, error };
      }

      try {
        await axios.delete(
          `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}`,
          { withCredentials: true }
        );

        setAppNotification({ message: "Service removed successfully", helpLink: "" });

        return { success: true };
      } catch (err: any) {
        const message = getApiErrorMessage(err, "Failed to remove service");
        const helpLink = getApiErrorHelpLink(err);

        setAppError({ message, helpLink });
        return { success: false, error: message };
      }
    },
    [setAppError, setAppNotification]
  );

  return { handleRemoveService: removeService };
}
