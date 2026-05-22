// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAppAlert } from "@/contexts/app-alert-context";

export function useServiceStop(serviceId: string | null) {
  const { setError: setAppError, setNotification } = useAppAlert();

  const stop = useMutation({
    mutationFn: async () => {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/stop`,
        {},
        { withCredentials: true }
      );
    },
    onSuccess: () => setNotification({ message: "Your service will shut down shortly", helpLink: "" }),
    onError: (err: any) => setAppError({ message: getApiErrorMessage(err, "Failed to stop service"), helpLink: "" }),
  });

  const start = useMutation({
    mutationFn: async () => {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/start`,
        {},
        { withCredentials: true }
      );
    },
    onSuccess: () => setNotification({ message: "Your service will wake up shortly", helpLink: "" }),
    onError: (err: any) => setAppError({ message: getApiErrorMessage(err, "Failed to start service"), helpLink: "" }),
  });

  return { stop, start };
}
