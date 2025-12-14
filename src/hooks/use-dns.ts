// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { ApiSuccessResponse } from "@/types";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClusterId } from "@/hooks/use-cluster-id";
import { useState } from "react";

export interface DnsDomain {
  id: string;
  domain: string;
  status: "pending" | "active" | "failed";
  provider: string;
  createdAt: number;
  activatedAt: number;
}

export interface DnsListResponse {
  domains: DnsDomain[];
}

export interface DnsSetupResponse {
  domain: string;
  provider: "cloudflare" | "route53" | "digitalocean";
  hasOAuth: boolean;
  record: {
    type: string;
    name: string;
    value: string;
    ttl: number;
  };
  verification: {
    type: string;
    name: string;
    value: string;
  };
  autoSetupUrl: string;
  manualGuideUrl: string;
}

export function useDns(instanceId?: string) {
  const queryClient = useQueryClient();
  const clusterId = useClusterId();
  const [setupDetails, setSetupDetails] = useState<DnsSetupResponse | null>(null);
  const [pollingDomain, setPollingDomain] = useState<string | null>(null);

  // Get all active domains across all instances (for domain dropdown)
  const { data: allDomains, isLoading: isLoadingAllDomains } = useQuery<DnsDomain[]>({
    queryKey: ["dns-all-domains", instanceId],
    queryFn: async (): Promise<DnsDomain[]> => {
      if (!instanceId) return [];

      try {
        const response = await axios.get<ApiSuccessResponse<DnsListResponse>>(
          `${import.meta.env.VITE_BASE_URL}/v1/domains/instance/${encodeURIComponent(
            instanceId,
          )}`,
          {
            params: { clusterId },
            withCredentials: true,
          }
        );
        // Filter to only active domains
        return (response.data.data.domains || []).filter(d => d.status === "active");
      } catch (error) {
        console.error("Failed to fetch all domains:", error);
        return [];
      }
    },
    enabled: Boolean(clusterId),
  });

  // Get all DNS domains for an instance
  const { data: dnsList, isLoading: isLoadingDomains } = useQuery<DnsListResponse | null>({
    queryKey: ["dns-domains", instanceId, clusterId],
    queryFn: async (): Promise<DnsListResponse | null> => {
      if (!instanceId || !clusterId) return null;

      try {
        const response = await axios.get<ApiSuccessResponse<DnsListResponse>>(
          `${import.meta.env.VITE_BASE_URL}/v1/domains/instance/${instanceId}`,
          {
            params: { clusterId },
            withCredentials: true,
          }
        );
        return response.data.data;
      } catch (error) {
        console.error("Failed to fetch DNS domains:", error);
        return null;
      }
    },
    enabled: Boolean(instanceId && clusterId),
  });

  // Poll domain status until active
  const { data: domainStatus } = useQuery({
    queryKey: ["dns-status", pollingDomain, clusterId],
    queryFn: async () => {
      if (!pollingDomain || !clusterId) return null;

      try {
        const response = await axios.get<ApiSuccessResponse<any>>(
          `${import.meta.env.VITE_BASE_URL}/v1/domains/status/${pollingDomain}`,
          {
            params: { clusterId },
            withCredentials: true,
          }
        );
        return response.data.data;
      } catch (error) {
        console.error("Failed to fetch domain status:", error);
        return null;
      }
    },
    enabled: Boolean(pollingDomain && clusterId),
    refetchInterval: pollingDomain ? 5000 : false, // Poll every 5s
    refetchIntervalInBackground: true,
  });

  // Setup DNS for a domain
  const setupDnsMutation = useMutation({
    mutationFn: async ({ domain, instanceId }: { domain: string; instanceId: string }) => {
      if (!clusterId) {
        throw new Error("Cluster ID is required to configure domains");
      }
      const response = await axios.post<ApiSuccessResponse<DnsSetupResponse>>(
        `${import.meta.env.VITE_BASE_URL}/v1/domains/setup`,
        { domain, instanceId },
        {
          params: { clusterId },
          withCredentials: true,
        }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Store setup details and start polling
      setSetupDetails(data);
      setPollingDomain(data.domain);
    },
  });

  // Get domain status with setup details
  const getDomainStatus = async (domain: string) => {
    if (!clusterId) {
      throw new Error("Cluster ID is required");
    }
    const response = await axios.get<ApiSuccessResponse<DnsSetupResponse & { status: string }>>(
      `${import.meta.env.VITE_BASE_URL}/v1/domains/status/${domain}`,
      {
        params: { clusterId },
        withCredentials: true,
      }
    );
    return response.data.data;
  };

  // Delete DNS configuration
  const deleteDnsMutation = useMutation({
    mutationFn: async (domain: string) => {
      if (!clusterId) {
        throw new Error("Cluster ID is required to delete domains");
      }
      await axios.delete(`${import.meta.env.VITE_BASE_URL}/v1/domains/${domain}`, {
        params: { clusterId },
        withCredentials: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dns-domains"] });
    },
  });

  const stopPolling = () => {
    setPollingDomain(null);
    setSetupDetails(null);
  };

  // Stop polling when domain becomes active
  if (domainStatus?.status === "active" && pollingDomain) {
    queryClient.invalidateQueries({ queryKey: ["dns-domains"] });
    stopPolling();
  }

  return {
    dnsList: dnsList?.domains ?? [],
    isLoadingDomains,
    allActiveDomains: allDomains ?? [],
    isLoadingAllDomains,
    setupDns: setupDnsMutation.mutate,
    setupDnsAsync: setupDnsMutation.mutateAsync,
    isSettingUp: setupDnsMutation.isPending,
    setupError: setupDnsMutation.error,
    setupDetails,
    domainStatus,
    isPolling: Boolean(pollingDomain),
    stopPolling,
    getDomainStatus,
    deleteDns: deleteDnsMutation.mutate,
    deleteDnsAsync: deleteDnsMutation.mutateAsync,
    isDeleting: deleteDnsMutation.isPending,
    deleteError: deleteDnsMutation.error,
  };
}
