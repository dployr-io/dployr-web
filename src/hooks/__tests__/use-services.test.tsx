// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { NormalizedService } from "@/types";
import { useServices } from "@/hooks/use-services";

// Services come from the WS-fed react-query cache — not a direct HTTP call
vi.mock("@/hooks/use-instances", () => ({
  useInstances: () => ({
    instances: [
      { id: "inst-1", tag: "node-east", role: "instance", status: "healthy" },
      { id: "inst-2", tag: "node-west", role: "instance", status: "healthy" },
    ],
    isLoading: false,
  }),
}));

function makeWrapper(cacheEntries: Record<string, NormalizedService[]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  // Seed the cache as the WebSocket handler would
  for (const [tag, services] of Object.entries(cacheEntries)) {
    qc.setQueryData(["instance", tag, "services"], services);
  }

  return ({ children }: { children: any }) => createElement(QueryClientProvider, { client: qc }, children);
}

const svc = (overrides: Partial<NormalizedService>): NormalizedService => ({
  id: "svc-1",
  name: "api",
  type: "web" as any,
  status: "running",
  port: 3000,
  deploymentId: null,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("useServices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // window.location.pathname defaults to '/' in jsdom
    Object.defineProperty(window, "location", {
      value: { pathname: "/" },
      writable: true,
    });
  });

  test("aggregates services from all instances", async () => {
    const { result } = renderHook(() => useServices(), {
      wrapper: makeWrapper({
        "node-east": [svc({ id: "svc-1", name: "api" })],
        "node-west": [svc({ id: "svc-2", name: "web" })],
      }),
    });

    expect(result.current.allServices).toHaveLength(2);
    expect(result.current.allServices.map(s => s.name)).toContain("api");
    expect(result.current.allServices.map(s => s.name)).toContain("web");
  });

  test("attaches _instanceName and _instanceId to each service", async () => {
    const { result } = renderHook(() => useServices(), {
      wrapper: makeWrapper({
        "node-east": [svc({ id: "svc-1", name: "api" })],
      }),
    });

    expect(result.current.allServices[0]._instanceName).toBe("node-east");
    expect(result.current.allServices[0]._instanceId).toBe("inst-1");
  });

  test("filters services by instanceTag", async () => {
    const { result } = renderHook(() => useServices("node-east"), {
      wrapper: makeWrapper({
        "node-east": [svc({ id: "svc-1", name: "api" })],
        "node-west": [svc({ id: "svc-2", name: "web" })],
      }),
    });

    expect(result.current.services).toHaveLength(1);
    expect(result.current.services[0].name).toBe("api");
  });

  test("returns all services when instanceTag is 'all'", async () => {
    const { result } = renderHook(() => useServices("all"), {
      wrapper: makeWrapper({
        "node-east": [svc({ id: "svc-1", name: "api" })],
        "node-west": [svc({ id: "svc-2", name: "web" })],
      }),
    });

    expect(result.current.services).toHaveLength(2);
  });

  test("sorts services by updatedAt descending", async () => {
    const older = svc({ id: "svc-old", name: "old-service", updatedAt: new Date(1000).toISOString() });
    const newer = svc({ id: "svc-new", name: "new-service", updatedAt: new Date(9000).toISOString() });

    const { result } = renderHook(() => useServices(), {
      wrapper: makeWrapper({ "node-east": [older, newer] }),
    });

    expect(result.current.allServices[0].name).toBe("new-service");
    expect(result.current.allServices[1].name).toBe("old-service");
  });

  test("returns empty array when no instances have services", async () => {
    const { result } = renderHook(() => useServices(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.allServices).toHaveLength(0);
    expect(result.current.services).toHaveLength(0);
  });

  test("paginates services correctly", async () => {
    const services = Array.from({ length: 12 }, (_, i) =>
      svc({ id: `svc-${i}`, name: `service-${i}`, updatedAt: new Date(i * 100).toISOString() })
    );

    const { result } = renderHook(() => useServices(null, { externalPage: 1 }), {
      wrapper: makeWrapper({ "node-east": services }),
    });

    // Default page size is 8
    expect(result.current.paginatedServices).toHaveLength(8);
    expect(result.current.totalPages).toBe(2);
  });
});