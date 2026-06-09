// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { NormalizedDeployment, NormalizedService } from "@/types";
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

function makeWrapper(
  serviceEntries: Record<string, NormalizedService[]> = {},
  deploymentEntries: Record<string, NormalizedDeployment[]> = {}
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  for (const [tag, services] of Object.entries(serviceEntries)) {
    qc.setQueryData(["instance", tag, "services"], services);
  }
  for (const [tag, deployments] of Object.entries(deploymentEntries)) {
    qc.setQueryData(["instance", tag, "deployments"], deployments);
  }

  return ({ children }: { children: any }) => createElement(QueryClientProvider, { client: qc }, children);
}

const svc = (overrides: Partial<NormalizedService>): NormalizedService => ({
  id: "svc-1",
  name: "api",
  type: "web",
  port: 3000,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  ...overrides,
} as NormalizedService);

const dep = (overrides: Partial<NormalizedDeployment>): NormalizedDeployment => ({
  id: "dep-1",
  name: "api",
  userId: "user-1",
  description: null,
  source: "remote",
  status: "pending",
  runtime: { type: "nodejs", version: "20" },
  remote: null,
  runCmd: null,
  buildCmd: null,
  port: 3000,
  workingDir: null,
  staticDir: null,
  image: null,
  envVars: null,
  secrets: null,
  metadata: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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

  describe("deduplication across instances", () => {
    test("deduplicates same-name services across instances in unfiltered view", () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: makeWrapper({
          "node-east": [svc({ id: "svc-1", name: "api", status: "running" })],
          "node-west": [svc({ id: "svc-2", name: "api", status: "running" })],
        }),
      });

      expect(result.current.services).toHaveLength(1);
      expect(result.current.services[0].name).toBe("api");
      // allServices is still the raw full list
      expect(result.current.allServices).toHaveLength(2);
    });

    test("prefers running over deploying when deduplicating", () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: makeWrapper(
          { "node-east": [svc({ id: "svc-1", name: "api", status: "running" })] },
          { "node-west": [dep({ id: "dep-1", name: "api", status: "pending" })] }
        ),
      });

      expect(result.current.services).toHaveLength(1);
      expect(result.current.services[0].status).toBe("running");
    });

    test("does not deduplicate when filtering by instanceTag", () => {
      const { result } = renderHook(() => useServices("node-east"), {
        wrapper: makeWrapper({
          "node-east": [svc({ id: "svc-1", name: "api", status: "running" })],
          "node-west": [svc({ id: "svc-2", name: "api", status: "running" })],
        }),
      });

      expect(result.current.services).toHaveLength(1);
      expect(result.current.services[0]._instanceName).toBe("node-east");
    });
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

  describe("ghost rows from in-flight deployments", () => {
    test("shows ghost row for pending deployment with no matching service", () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: makeWrapper(
          {},
          { "node-east": [dep({ id: "dep-1", name: "new-app", status: "pending" })] }
        ),
      });

      expect(result.current.allServices).toHaveLength(1);
      expect(result.current.allServices[0].name).toBe("new-app");
      expect(result.current.allServices[0].status).toBe("deploying");
    });

    test("shows ghost row for running deployment with no matching service", () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: makeWrapper(
          {},
          { "node-east": [dep({ id: "dep-1", name: "new-app", status: "running" })] }
        ),
      });

      expect(result.current.allServices[0].status).toBe("deploying");
    });

    test("does not show ghost row when a service with the same name already exists", () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: makeWrapper(
          { "node-east": [svc({ id: "svc-1", name: "api", status: "running" })] },
          { "node-east": [dep({ id: "dep-1", name: "api", status: "pending" })] }
        ),
      });

      expect(result.current.allServices).toHaveLength(1);
      expect(result.current.allServices[0].status).toBe("running");
    });

    test("does not show ghost row for completed or failed deployments", () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: makeWrapper(
          {},
          {
            "node-east": [
              dep({ id: "dep-1", name: "done-app", status: "success" }),
              dep({ id: "dep-2", name: "failed-app", status: "failed" }),
            ],
          }
        ),
      });

      expect(result.current.allServices).toHaveLength(0);
    });

    test("ghost row carries _instanceName and _instanceId", () => {
      const { result } = renderHook(() => useServices(), {
        wrapper: makeWrapper(
          {},
          { "node-east": [dep({ id: "dep-1", name: "new-app", status: "pending" })] }
        ),
      });

      expect(result.current.allServices[0]._instanceName).toBe("node-east");
      expect(result.current.allServices[0]._instanceId).toBe("inst-1");
    });

    test("ghost row is filtered by instanceTag", () => {
      const { result } = renderHook(() => useServices("node-west"), {
        wrapper: makeWrapper(
          {},
          { "node-east": [dep({ id: "dep-1", name: "new-app", status: "pending" })] }
        ),
      });

      expect(result.current.services).toHaveLength(0);
    });
  });
});