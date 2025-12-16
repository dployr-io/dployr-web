// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Remote } from "@/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useClusterId } from "./use-cluster-id";

export type RemoteProvider = "github" | "gitlab" | "bitbucket";

export interface ProviderRemotes {
  provider: RemoteProvider;
  remotes: Remote[];
  error?: string;
}

interface RemotesResponse {
  success: boolean;
  message?: string;
  data: {
    remotes: ProviderRemotes[];
  };
}

export function useRemotes() {
  const clusterId = useClusterId();
  
  const { data, isLoading, error } = useQuery<RemotesResponse>({
    queryKey: ["remotes", clusterId],
    queryFn: async () => {
      if (!clusterId) {
        return { success: true, data: { remotes: [] } };
      }
      const response = await axios.get<RemotesResponse>(
        `${import.meta.env.VITE_BASE_URL}/v1/integrations/remotes?clusterId=${clusterId}`,
        {
          withCredentials: true,
        }
      );
      return response.data;
    },
    enabled: !!clusterId,
    staleTime: 60 * 1000, // Every minute
  });

  const allRemotes = data?.data?.remotes?.flatMap((p) => p.remotes) || [];

  const remotesByProvider = data?.data?.remotes || [];

  return {
    remotes: allRemotes,
    remotesByProvider,
    isLoading,
    error,
  };
}
