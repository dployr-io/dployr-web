// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import axios from "axios";
import { useDns } from "@/hooks/use-dns";

vi.mock("axios");
vi.mock("@/hooks/use-cluster-id", () => ({ useClusterId: () => "cluster-abc" }));
vi.mock("@/contexts/app-alert-context", () => ({ useAppAlert: () => ({ setError: vi.fn() }) }));

// Capture the subscribe callback so tests can trigger WS messages
type SubscribeCb = (msg: unknown) => void;
let capturedCallbacks: Map<string, SubscribeCb>;
let mockUnsubscribe: ReturnType<typeof vi.fn>;

vi.mock("@/hooks/use-instance-stream", () => ({
  useInstanceStream: () => ({
    subscribe: (id: string, cb: SubscribeCb) => {
      capturedCallbacks.set(id, cb);
    },
    unsubscribe: mockUnsubscribe,
  }),
}));

const mockedAxios = vi.mocked(axios);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  return { qc, wrapper: ({ children }: { children: any }) => createElement(QueryClientProvider, { client: qc }, children) };
}

function emitWsMessage(id: string, msg: unknown) {
  capturedCallbacks.get(id)?.(msg);
}

beforeEach(() => {
  vi.clearAllMocks();
  capturedCallbacks = new Map();
  mockUnsubscribe = vi.fn();
  mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: { items: [] } } });
});

describe("useDns — WS subscription for auto-verification", () => {
  test("subscribes with id 'dns-refresh' on mount", async () => {
    const { wrapper } = makeWrapper();
    renderHook(() => useDns(), { wrapper });

    await waitFor(() => expect(capturedCallbacks.has("dns-refresh")).toBe(true));
    expect(capturedCallbacks.get("dns-refresh")).toBeTypeOf("function");
  });

  test("invalidates ['dns-domains', clusterId] when refresh/domains message arrives for the right cluster", async () => {
    const { qc, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderHook(() => useDns(), { wrapper });

    act(() => {
      emitWsMessage("dns-refresh", { kind: "refresh", entity: "domains", clusterId: "cluster-abc" });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dns-domains", "cluster-abc"] });
  });

  test("does not invalidate when entity is not 'domains'", async () => {
    const { qc, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderHook(() => useDns(), { wrapper });

    act(() => {
      emitWsMessage("dns-refresh", { kind: "refresh", entity: "services", clusterId: "cluster-abc" });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test("does not invalidate when kind is not 'refresh'", async () => {
    const { qc, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderHook(() => useDns(), { wrapper });

    act(() => {
      emitWsMessage("dns-refresh", { kind: "update", entity: "domains", clusterId: "cluster-abc" });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test("does not invalidate when clusterId does not match", async () => {
    const { qc, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    renderHook(() => useDns(), { wrapper });

    act(() => {
      emitWsMessage("dns-refresh", { kind: "refresh", entity: "domains", clusterId: "cluster-other" });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test("unsubscribes 'dns-refresh' on unmount", async () => {
    const { wrapper } = makeWrapper();
    const { unmount } = renderHook(() => useDns(), { wrapper });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith("dns-refresh");
  });
});
