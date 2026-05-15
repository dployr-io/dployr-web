// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import axios from "axios";
import type { Instance } from "@/types";
import { useInstances } from "@/hooks/use-instances";

vi.mock("axios");
vi.mock("@/hooks/use-cluster-id", () => ({ useClusterId: () => "cluster-abc" }));
vi.mock("@/hooks/use-instance-operations", () => ({
  useInstanceOperations: () => ({
    rotateToken: vi.fn(),
    installVersion: vi.fn(),
    restartInstance: vi.fn(),
    rebootInstance: vi.fn(),
  }),
}));
vi.mock("@/contexts/app-alert-context", () => ({ useAppAlert: () => ({ setError: vi.fn() }) }));

const mockedAxios = vi.mocked(axios);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: any }) => createElement(QueryClientProvider, { client: qc }, children);
}

const mockInstance = (overrides: Partial<Instance> = {}): Instance => ({
  id: "inst-1",
  address: "1.2.3.4",
  publicKey: "",
  tag: "node-us-east-01",
  role: "instance",
  status: "healthy",
  cpuCount: 2,
  memorySizeMb: 4096,
  metadata: {},
  createdAt: 1000,
  updatedAt: 2000,
  bootstrapToken: "",
  ...overrides,
});

const pagedResponse = (items: Instance[]) => ({
  data: {
    data: {
      items,
      pagination: {
        page: 1,
        pageSize: 8,
        totalItems: items.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  },
});

describe("useInstances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns instances from the API", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue(pagedResponse([mockInstance()]));

    const { result } = renderHook(() => useInstances(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.instances).toHaveLength(1);
    expect(result.current.instances[0].tag).toBe("node-us-east-01");
  });

  test("maps role field from API response", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue(pagedResponse([
      mockInstance({ role: "instance" }),
      mockInstance({ id: "inst-2", tag: "build-01", role: "build" }),
    ]));

    const { result } = renderHook(() => useInstances(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const roles = result.current.instances.map(i => i.role);
    expect(roles).toEqual(["instance", "build"]);
  });

  test("defaults role to 'instance' when API omits it", async () => {
    const itemWithoutRole = { id: "inst-1", tag: "node-1", address: "1.2.3.4", status: "healthy", createdAt: 1000, updatedAt: 2000 };
    mockedAxios.get = vi.fn().mockResolvedValue(pagedResponse([itemWithoutRole as any]));

    const { result } = renderHook(() => useInstances(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.instances[0].role).toBe("instance");
  });

  test("returns empty list when API returns empty items array", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue(pagedResponse([]));

    const { result } = renderHook(() => useInstances(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instances).toHaveLength(0);
  });

  test("returns empty list and does not throw on API error", async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useInstances(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.instances).toHaveLength(0);
  });

  test("pagination: totalPages reflects API response", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: {
        data: {
          items: [mockInstance()],
          pagination: { page: 1, pageSize: 8, totalItems: 20, totalPages: 3, hasNextPage: true, hasPreviousPage: false },
        },
      },
    });

    const { result } = renderHook(() => useInstances(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalPages).toBe(3);
  });
});