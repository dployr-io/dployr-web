// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { NormalizedDeployment } from "@/types";
import { useDeployments } from "@/hooks/use-deployments";

vi.mock("@/hooks/use-instances", () => ({
  useInstances: () => ({
    instances: [
      { id: "inst-1", tag: "node-east", role: "instance", status: "healthy" },
      { id: "inst-2", tag: "node-west", role: "instance", status: "healthy" },
    ],
    isLoading: false,
  }),
}));

function makeWrapper(cacheEntries: Record<string, NormalizedDeployment[]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  for (const [tag, deployments] of Object.entries(cacheEntries)) {
    qc.setQueryData(["instance", tag, "deployments"], deployments);
  }

  return ({ children }: { children: any }) => createElement(QueryClientProvider, { client: qc }, children);
}

const dep = (overrides: Partial<NormalizedDeployment>): NormalizedDeployment => ({
  id: "dep-1",
  name: "api",
  status: "success",
  source: "remote",
  createdAt: new Date().toISOString(),
  ...overrides,
} as NormalizedDeployment);

describe("useDeployments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", { value: { pathname: "/" }, writable: true });
  });

  test("aggregates deployments from all instances", async () => {
    const { result } = renderHook(() => useDeployments(), {
      wrapper: makeWrapper({
        "node-east": [dep({ id: "dep-1", name: "api" })],
        "node-west": [dep({ id: "dep-2", name: "web" })],
      }),
    });

    expect(result.current.allDeployments).toHaveLength(2);
  });

  test("attaches _instanceName and _instanceId", async () => {
    const { result } = renderHook(() => useDeployments(), {
      wrapper: makeWrapper({
        "node-east": [dep({ id: "dep-1" })],
      }),
    });

    expect(result.current.allDeployments[0]._instanceName).toBe("node-east");
    expect(result.current.allDeployments[0]._instanceId).toBe("inst-1");
  });

  test("filters by instance name", async () => {
    const { result } = renderHook(() => useDeployments("node-east"), {
      wrapper: makeWrapper({
        "node-east": [dep({ id: "dep-1", name: "api" })],
        "node-west": [dep({ id: "dep-2", name: "web" })],
      }),
    });

    expect(result.current.deployments).toHaveLength(1);
    expect(result.current.deployments[0].name).toBe("api");
  });

  test("sorts deployments by createdAt descending", async () => {
    const older = dep({ id: "dep-old", name: "old-deploy", createdAt: new Date(1000).toISOString() });
    const newer = dep({ id: "dep-new", name: "new-deploy", createdAt: new Date(9000).toISOString() });

    const { result } = renderHook(() => useDeployments(), {
      wrapper: makeWrapper({ "node-east": [older, newer] }),
    });

    expect(result.current.allDeployments[0].name).toBe("new-deploy");
  });

  test("resolves selectedDeployment from URL path", async () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/clusters/c1/deployments/dep-1" },
      writable: true,
    });

    const { result } = renderHook(() => useDeployments(), {
      wrapper: makeWrapper({
        "node-east": [dep({ id: "dep-1", name: "target" })],
      }),
    });

    expect(result.current.selectedDeployment?.id).toBe("dep-1");
    expect(result.current.selectedInstanceName).toBe("node-east");
  });

  test("selectedDeployment is null when URL has no deployment segment", async () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/clusters/c1/deployments" },
      writable: true,
    });

    const { result } = renderHook(() => useDeployments(), {
      wrapper: makeWrapper({ "node-east": [dep({ id: "dep-1" })] }),
    });

    expect(result.current.selectedDeployment).toBeNull();
  });
});