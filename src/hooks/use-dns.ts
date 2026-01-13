// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { ApiSuccessResponse } from "@/types";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClusterId } from "@/hooks/use-cluster-id";
import { useUrlState } from "@/hooks/use-url-state";
import { useState, useEffect } from "react";

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
  status: "pending" | "active" | "failed";
  instanceId: string;
  createdAt: number;
  activatedAt: number;
  record?: {
    type: string;
    name: string;
    value: string;
    ttl: number;
  };
  verification?: {
    type: string;
    name: string;
    value: string;
  };
  autoSetupUrl?: string;
  manualGuideUrl?: string;
}

export function useDns(instanceId?: string) {
  const queryClient = useQueryClient();
  const clusterId = useClusterId();
  const { useAppError } = useUrlState();
  const [, setError] = useAppError();
  const [setupDetails, setSetupDetails] = useState<DnsSetupResponse | null>(null);
  const [verifySetupDetails, setVerifySetupDetails] = useState<DnsSetupResponse | null>(null);
  const [verifyCooldowns, setVerifyCooldowns] = useState<Map<string, number>>(new Map());

  // Get all DNS domains for an instance
  const { data: dnsList, isLoading: isLoadingDomains } = useQuery<DnsListResponse | null>({
    queryKey: ["dns-domains", instanceId, clusterId],
    queryFn: async (): Promise<DnsListResponse | null> => {
      if (!instanceId || !clusterId) return null;

      try {
        const response = await axios.get<ApiSuccessResponse<DnsListResponse>>(`${import.meta.env.VITE_BASE_URL}/v1/domains/instance/${instanceId}`, {
          params: { clusterId },
          withCredentials: true,
        });
        return response.data.data;
      } catch (error) {
        console.error("Failed to fetch DNS domains:", error);
        return null;
      }
    },
    enabled: Boolean(instanceId && clusterId),
  });

  // Cooldown timer effect
  useEffect(() => {
    const activeCooldowns = Array.from(verifyCooldowns.entries()).filter(([, time]) => time > 0);

    if (activeCooldowns.length > 0) {
      const timer = setTimeout(() => {
        setVerifyCooldowns(prev => {
          const next = new Map(prev);
          activeCooldowns.forEach(([domain]) => {
            const current = next.get(domain) || 0;
            if (current > 0) {
              next.set(domain, current - 1);
            }
          });
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [verifyCooldowns]);

  // Verify domain status mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      if (!clusterId) {
        throw new Error("Cluster ID is required to verify domain");
      }
      const response = await axios.post<ApiSuccessResponse<any>>(
        `${import.meta.env.VITE_BASE_URL}/v1/domains/${domain}/verify?clusterId=${clusterId}`,
        {},
        {
          withCredentials: true,
        }
      );
      return response.data.data;
    },
    onSuccess: (_, domain) => {
      queryClient.invalidateQueries({ queryKey: ["dns-domains"] });
      setVerifyCooldowns(prev => new Map(prev).set(domain, 10));
    },
    onError: async (_, domain) => {
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/domains/${domain}`, {
        withCredentials: true,
      });
      
      setVerifySetupDetails((response?.data?.data as DnsSetupResponse) || null);

      // Set cooldown even on error
      setVerifyCooldowns(prev => new Map(prev).set(domain, 10));
    },
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

      queryClient.invalidateQueries({ queryKey: ["dns-domains", instanceId, clusterId] });
      return response.data.data;
    },
    onSuccess: data => {
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
      queryClient.invalidateQueries({ queryKey: ["dns-domains", instanceId, clusterId] });
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

  return {
    domains: dnsList?.domains ?? [],
    isLoadingDomains,
    setupDns: setupDnsMutation.mutate,
    setupDnsAsync: setupDnsMutation.mutateAsync,
    isSettingUp: setupDnsMutation.isPending,
    setupError: setupDnsMutation.error,
    setupDetails,
    stopPolling,
    verifyDomain: verifyDomainMutation.mutate,
    verifyDomainAsync: verifyDomainMutation.mutateAsync,
    isVerifying: verifyDomainMutation.isPending,
    verifyError: verifyDomainMutation.error,
    verifySetupDetails,
    clearVerifySetupDetails: () => setVerifySetupDetails(null),
    getVerifyCooldown: (domain: string) => verifyCooldowns.get(domain) || 0,
    deleteDns: deleteDnsMutation.mutate,
    deleteDnsAsync: deleteDnsMutation.mutateAsync,
    isDeleting: deleteDnsMutation.isPending,
    deleteError: deleteDnsMutation.error,
  };
}
