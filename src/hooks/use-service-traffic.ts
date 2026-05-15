// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export interface TrafficBucket {
  bucket: number;
  time: string;
  requests: number;
  bytesIn: number;
  bytesOut: number;
}

export interface TrafficTotals {
  requests: number;
  bytesIn: number;
  bytesOut: number;
}

export function useServiceTraffic(serviceName: string | null, clusterId: string | null) {
  const { data, isLoading } = useQuery<{ buckets: TrafficBucket[]; totals: TrafficTotals }>({
    queryKey: ["service-traffic", serviceName, clusterId],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/v1/services/metrics/${serviceName}?clusterId=${clusterId}`,
        { withCredentials: true },
      );
      const raw = res.data.data;
      const buckets: TrafficBucket[] = (raw.buckets ?? []).map((b: Record<string, number>) => ({
        bucket: b.bucket,
        time: new Date(b.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        requests: b.requests,
        bytesIn: b.bytesIn,
        bytesOut: b.bytesOut,
      }));
      return {
        buckets,
        totals: raw.totals ?? { requests: 0, bytesIn: 0, bytesOut: 0 },
      };
    },
    enabled: !!serviceName && !!clusterId,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });

  return {
    trafficData: data?.buckets ?? [],
    totals: data?.totals ?? null,
    isLoading,
  };
}
