// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useClusterId } from "@/hooks/use-cluster-id";
import { getApiErrorMessage, getApiErrorHelpLink } from "@/lib/api-error";
import { useAppAlert } from "@/contexts/app-alert-context";
import type { Plan, BillingStatus } from "@/types";

export function useBilling() {
  const clusterId = useClusterId() || "";
  const { setError } = useAppAlert();

  const { data: plans, isLoading: isLoadingPlans } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async (): Promise<Plan[]> => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/billing/plans`, {
          withCredentials: true,
        });
        return response.data.data.plans ?? [];
      } catch (error) {
        console.error((error as Error).message || "Failed to load plans");
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: billingStatus, isLoading: isLoadingStatus } = useQuery<BillingStatus | null>({
    queryKey: ["billing-status", clusterId],
    queryFn: async (): Promise<BillingStatus | null> => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/billing/status`, {
          params: { clusterId },
          withCredentials: true,
        });
        return response.data.data;
      } catch (error) {
        console.error((error as Error).message || "Failed to load billing status");
        return null;
      }
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!clusterId,
  });

  const checkout = useMutation({
    mutationFn: async ({ plan, successUrl }: { plan: string; successUrl: string }): Promise<string> => {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/billing/checkout`,
        { plan, clusterId, successUrl },
        { withCredentials: true }
      );
      return response.data.data.checkoutUrl;
    },
    onSuccess: (checkoutUrl: string) => {
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    },
    onError: (error: any) => {
      const errorMessage = getApiErrorMessage(error, "Failed to start checkout.");
      const helpLink = getApiErrorHelpLink(error);
      setError({ message: errorMessage, helpLink });
    },
  });

  const portalUrl = `${import.meta.env.VITE_BASE_URL}/v1/billing/portal?clusterId=${clusterId}`;

  return {
    plans,
    isLoadingPlans,
    billingStatus,
    isLoadingStatus,
    checkout,
    portalUrl,
  };
}
