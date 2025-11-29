// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Remote } from "@/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export function useRemotes(clusterId: string) {
  const { data, isLoading } = useQuery<Remote[]>({
    queryKey: ["remotes", clusterId],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/removes`);
      return response.data;
    },
    staleTime: 60 * 1000, // Every minute
  });

  return {
    remotes: data || [],
    isLoading,
  };
}
