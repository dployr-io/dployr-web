// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import axios from "axios";

export function useInstanceOperations() {
  const installVersion = useCallback(
    async (
      instanceName: string,
      clusterId: string,
      version?: string
    ): Promise<{ taskId: string; status: string; message: string }> => {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${encodeURIComponent(instanceName)}/system/install`,
        { version },
        { params: { clusterId }, withCredentials: true }
      );
      return response.data.data;
    },
    []
  );

  const rebootInstance = useCallback(
    async (
      instanceName: string,
      clusterId: string,
      force?: boolean
    ): Promise<{ taskId: string; status: string; message: string }> => {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${encodeURIComponent(instanceName)}/system/reboot`,
        { force },
        { params: { clusterId }, withCredentials: true }
      );
      return response.data.data;
    },
    []
  );

  const restartInstance = useCallback(
    async (
      instanceName: string,
      clusterId: string,
      force?: boolean
    ): Promise<{ taskId: string; status: string; message: string }> => {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${encodeURIComponent(instanceName)}/system/restart`,
        { force },
        { params: { clusterId }, withCredentials: true }
      );
      return response.data.data;
    },
    []
  );

  const rotateToken = useCallback(
    async (instanceName: string, token: string): Promise<{ token: string }> => {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/instances/${encodeURIComponent(instanceName)}/tokens/rotate`,
        { token },
        { withCredentials: true }
      );
      return response.data.data;
    },
    []
  );

  return {
    isConnected: true,
    installVersion,
    rebootInstance,
    restartInstance,
    rotateToken,
  };
}
