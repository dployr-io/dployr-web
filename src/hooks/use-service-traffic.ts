// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export interface TrafficDataPoint {
  timestamp: number;
  time: string;
  requestsPerSecond: number;
  p50LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  activeConnections: number;
}

export interface TrafficSummary {
  totalRequests: number;
  currentRps: number;
  p99LatencyMs: number;
  errorRate: number;
  activeConnections: number;
}

export interface ServiceTrafficData {
  timeseries: TrafficDataPoint[];
  summary: TrafficSummary;
}

export function useServiceTraffic(serviceId: string | null) {
  const { data, isLoading } = useQuery<ServiceTrafficData>({
    queryKey: ["service-traffic", serviceId],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${serviceId}/metrics`,
        { withCredentials: true }
      );
      return response.data.data;
    },
    enabled: !!serviceId,
    refetchInterval: 30_000,
    staleTime: 15_000,
    // Suppress errors — endpoint may not exist yet
    retry: false,
  });

  return {
    trafficData: data?.timeseries ?? [],
    summary: data?.summary ?? null,
    isLoading,
  };
}
