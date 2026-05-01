// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import axios from "axios";
import { useUrlState } from "./use-url-state";

interface ServiceRemoveResult {
  success: boolean;
  error?: string;
}

export function useServiceRemove() {
  const { useAppError, useAppNotification } = useUrlState();
  const [, setAppError] = useAppError();
  const [, setAppNotification] = useAppNotification();

  const removeService = useCallback(
    async (serviceId: string): Promise<ServiceRemoveResult> => {
      if (!serviceId) {
        const error = "Service ID is required for removal.";
        setAppError({ appError: { message: error, helpLink: "" } });
        return { success: false, error };
      }

      try {
        await axios.delete(
          `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}`,
          { withCredentials: true }
        );

        setAppNotification({
          appNotification: { message: "Service removed successfully", link: "" },
        });

        return { success: true };
      } catch (err: any) {
        const errorData = err?.response?.data?.error;
        const message = errorData?.message || err?.message || "Failed to remove service";
        const helpLink = errorData?.helpLink || "";

        setAppError({ appError: { message, helpLink } });
        return { success: false, error: message };
      }
    },
    [setAppError, setAppNotification]
  );

  return { handleRemoveService: removeService };
}
