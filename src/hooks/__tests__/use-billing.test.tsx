// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import axios from "axios";
import { useBilling } from "@/hooks/use-billing";
import type { Plan, BillingStatus } from "@/types";

vi.mock("axios");
vi.mock("@/hooks/use-cluster-id", () => ({ useClusterId: () => "cluster-abc" }));

const mockSetError = vi.fn();
vi.mock("@/contexts/app-alert-context", () => ({
  useAppAlert: () => ({ setError: mockSetError }),
}));

const mockedAxios = vi.mocked(axios, true);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

const mockPlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: "plan-indie",
  name: "Indie",
  price: { monthly: 9, annual: 90 },
  ...overrides,
} as Plan);

const mockStatus = (overrides: Partial<BillingStatus> = {}): BillingStatus => ({
  plan: "indie",
  planDetails: mockPlan(),
  subscription: { status: "active", polarSubscriptionId: "sub-1", createdAt: 0, updatedAt: 0 },
  ...overrides,
});

describe("useBilling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns plans from API", async () => {
    mockedAxios.get = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/v1/billing/plans")) {
        return Promise.resolve({ data: { data: { plans: [mockPlan()] } } });
      }
      return Promise.resolve({ data: { data: mockStatus() } });
    });

    const { result } = renderHook(() => useBilling(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoadingPlans).toBe(false));

    expect(result.current.plans).toHaveLength(1);
    expect(result.current.plans?.[0].name).toBe("Indie");
  });

  test("returns empty array when plans fetch fails", async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useBilling(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoadingPlans).toBe(false));

    expect(result.current.plans).toEqual([]);
  });

  test("returns billingStatus when clusterId is set", async () => {
    mockedAxios.get = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/v1/billing/plans")) {
        return Promise.resolve({ data: { data: { plans: [] } } });
      }
      return Promise.resolve({ data: { data: mockStatus({ plan: "pro" }) } });
    });

    const { result } = renderHook(() => useBilling(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoadingStatus).toBe(false));

    expect(result.current.billingStatus?.plan).toBe("pro");
  });

  test("portalUrl includes clusterId", () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: { plans: [] } } });

    const { result } = renderHook(() => useBilling(), { wrapper: makeWrapper() });

    expect(result.current.portalUrl).toContain("clusterId=cluster-abc");
  });

  test("checkout mutation opens checkout URL on success", async () => {
    const mockOpen = vi.fn();
    vi.stubGlobal("open", mockOpen);

    mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: { plans: [] } } });
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { data: { checkoutUrl: "https://checkout.polar.sh/abc" } },
    });

    const { result } = renderHook(() => useBilling(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.checkout.mutateAsync({
        plan: "indie",
        interval: "monthly",
        successUrl: "https://app.dployr.io/billing?success=1",
      });
    });

    expect(mockOpen).toHaveBeenCalledWith(
      "https://checkout.polar.sh/abc",
      "_blank",
      "noopener,noreferrer"
    );
  });

  test("checkout mutation calls setError on failure", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: { plans: [] } } });
    mockedAxios.post = vi.fn().mockRejectedValue({
      response: { data: { message: "Checkout failed" } },
    });

    const { result } = renderHook(() => useBilling(), { wrapper: makeWrapper() });

    await act(async () => {
      try {
        await result.current.checkout.mutateAsync({
          plan: "indie",
          interval: "monthly",
          successUrl: "https://app.dployr.io/billing",
        });
      } catch {
        // expected
      }
    });

    expect(mockSetError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
  });
});
