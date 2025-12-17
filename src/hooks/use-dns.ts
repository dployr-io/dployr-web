// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { ApiSuccessResponse } from "@/types";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClusterId } from "@/hooks/use-cluster-id";
import { useUrlState } from "@/hooks/use-url-state";
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
  const { useAppError } = useUrlState();
  const [, setError] = useAppError();
  const [setupDetails, setSetupDetails] = useState<DnsSetupResponse | null>(null);

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

  // Determine which domain to poll from dnsList
  const pendingDomain = dnsList?.domains?.find((d: DnsDomain) => d.status === "pending")?.domain;

  // Poll domain status until active
  const { data: domainStatus } = useQuery({
    queryKey: ["dns-status", pendingDomain, clusterId],
    queryFn: async () => {
      if (!pendingDomain || !clusterId) return null;

      try {
        const response = await axios.get<ApiSuccessResponse<any>>(
          `${import.meta.env.VITE_BASE_URL}/v1/domains/status/${pendingDomain}`,
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
    enabled: Boolean(pendingDomain && clusterId),
    refetchInterval: pendingDomain ? 5000 : false,
    refetchIntervalInBackground: true,
  });

  // Setup DNS for a domain
  const setupDnsMutation = useMutation({
    mutationFn: async ({ domain, instanceId }: { domain: string; instanceId: string }) => {
      if (!clusterId) {
        throw new Error("Cluster ID is required to configure domains");
      }
      const response = await axios.post<ApiSuccessResponse<DnsSetupResponse>>(
        `${import.meta.env.VITE_BASE_URL}/v1/domains`,
        { domain, instanceId },
        {
          params: { clusterId },
          withCredentials: true,
        }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Store setup details
      setSetupDetails(data);
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || error?.message || "An error occurred while setting up domain.";
      const helpLink = error?.response?.data?.error?.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
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

  // Request domain verification
  const requestVerificationMutation = useMutation({
    mutationFn: async ({ domain }: { domain: string; }) => {
      if (!instanceId) {
        throw new Error("Instance ID is required to request verification");
      }
      const response = await axios.post<ApiSuccessResponse<DnsSetupResponse>>(
        `${import.meta.env.VITE_BASE_URL}/v1/domains/${domain}/verify`,
        { domain },
        {
          params: { instanceId },
          withCredentials: true,
        }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      setSetupDetails(data);
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || error?.message || "An error occurred while requesting verification.";
      const helpLink = error?.response?.data?.error?.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

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
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || error?.message || "An error occurred while deleting domain.";
      const helpLink = error?.response?.data?.error?.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  const stopPolling = () => {
    setSetupDetails(null);
  };

  // Stop polling when domain becomes active
  if (domainStatus?.status === "active" && pendingDomain) {
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
    isPolling: Boolean(pendingDomain),
    stopPolling,
    getDomainStatus,
    requestVerification: requestVerificationMutation.mutate,
    requestVerificationAsync: requestVerificationMutation.mutateAsync,
    isRequestingVerification: requestVerificationMutation.isPending,
    requestVerificationError: requestVerificationMutation.error,
    deleteDns: deleteDnsMutation.mutate,
    deleteDnsAsync: deleteDnsMutation.mutateAsync,
    isDeleting: deleteDnsMutation.isPending,
    deleteError: deleteDnsMutation.error,
  };
}
