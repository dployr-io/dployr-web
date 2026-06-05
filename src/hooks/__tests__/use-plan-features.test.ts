// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/hooks/use-cluster-id", () => ({ useClusterId: () => "cluster-abc" }));
vi.mock("@/contexts/app-alert-context", () => ({
  useAppAlert: () => ({ setError: vi.fn(), setNotification: vi.fn() }),
}));

function mockPlan(plan: string) {
  vi.doMock("@/hooks/use-billing", () => ({
    useBilling: () => ({
      billingStatus: { plan, planDetails: {} as any, subscription: null },
      isLoadingStatus: false,
      plans: [],
      isLoadingPlans: false,
      checkout: { mutateAsync: vi.fn() },
      portalUrl: "",
    }),
  }));
}

describe("usePlanFeatures — hobby tier", () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

  test("all gated features are disabled on hobby", async () => {
    mockPlan("hobby");
    const { usePlanFeatures: hook } = await import("@/hooks/use-plan-features");
    const { result } = renderHook(() => hook());

    expect(result.current.hasConsole).toBe(false);
    expect(result.current.hasFileExplorer).toBe(false);
    expect(result.current.hasWatchdog).toBe(false);
    expect(result.current.hasSlackIntegrations).toBe(false);
  });
});

describe("usePlanFeatures — indie tier", () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

  test("Slack is enabled but pro features are still gated", async () => {
    mockPlan("indie");
    const { usePlanFeatures: hook } = await import("@/hooks/use-plan-features");
    const { result } = renderHook(() => hook());

    expect(result.current.hasSlackIntegrations).toBe(true);
    expect(result.current.hasConsole).toBe(false);
    expect(result.current.hasFileExplorer).toBe(false);
    expect(result.current.hasWatchdog).toBe(false);
  });
});

describe("usePlanFeatures — pro tier", () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

  test("all features are enabled on pro", async () => {
    mockPlan("pro");
    const { usePlanFeatures: hook } = await import("@/hooks/use-plan-features");
    const { result } = renderHook(() => hook());

    expect(result.current.hasConsole).toBe(true);
    expect(result.current.hasFileExplorer).toBe(true);
    expect(result.current.hasWatchdog).toBe(true);
    expect(result.current.hasSlackIntegrations).toBe(true);
  });
});

describe("usePlanFeatures — unknown/null plan", () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

  test("unknown plan defaults to hobby (all features off)", async () => {
    vi.doMock("@/hooks/use-billing", () => ({
      useBilling: () => ({
        billingStatus: null,
        isLoadingStatus: false,
        plans: [],
        isLoadingPlans: false,
        checkout: { mutateAsync: vi.fn() },
        portalUrl: "",
      }),
    }));
    const { usePlanFeatures: hook } = await import("@/hooks/use-plan-features");
    const { result } = renderHook(() => hook());

    expect(result.current.plan).toBe("hobby");
    expect(result.current.hasConsole).toBe(false);
  });
});
