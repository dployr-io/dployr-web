// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import axios from "axios";
import { useServiceUpdate } from "@/hooks/use-service-update";

vi.mock("axios");

const mockSetError = vi.fn();
const mockSetNotification = vi.fn();
vi.mock("@/contexts/app-alert-context", () => ({
  useAppAlert: () => ({ setError: mockSetError, setNotification: mockSetNotification }),
}));

const mockedAxios = vi.mocked(axios, true);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { qc, wrapper: ({ children }: { children: any }) => createElement(QueryClientProvider, { client: qc }, children) };
}

describe("useServiceUpdate", () => {
  beforeEach(() => vi.clearAllMocks());

  test("calls PATCH with correct URL and payload", async () => {
    mockedAxios.patch = vi.fn().mockResolvedValue({ data: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useServiceUpdate("svc-1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ instanceName: "node-east", run_cmd: "node dist/index.js" });
    });

    expect(mockedAxios.patch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/services/svc-1"),
      expect.objectContaining({ instanceName: "node-east", run_cmd: "node dist/index.js" }),
      expect.any(Object)
    );
  });

  test("shows notification on success", async () => {
    mockedAxios.patch = vi.fn().mockResolvedValue({ data: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useServiceUpdate("svc-1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ instanceName: "node-east" });
    });

    expect(mockSetNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("redeploying") })
    );
  });

  test("invalidates service-envs query when env_vars is included", async () => {
    mockedAxios.patch = vi.fn().mockResolvedValue({ data: {} });
    const { qc, wrapper } = makeWrapper();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useServiceUpdate("svc-1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ instanceName: "node-east", env_vars: { PORT: "3000" } });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["service-envs", "svc-1"] });
  });

  test("invalidates service-secrets query when secrets are included", async () => {
    mockedAxios.patch = vi.fn().mockResolvedValue({ data: {} });
    const { qc, wrapper } = makeWrapper();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useServiceUpdate("svc-1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ instanceName: "node-east", secrets: { DB_PASSWORD: "secret" } });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["service-secrets", "svc-1"] });
  });

  test("does NOT invalidate env query when env_vars is omitted", async () => {
    mockedAxios.patch = vi.fn().mockResolvedValue({ data: {} });
    const { qc, wrapper } = makeWrapper();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useServiceUpdate("svc-1"), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ instanceName: "node-east", run_cmd: "node server.js" });
    });

    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["service-envs", "svc-1"] });
  });

  test("calls setError on API failure", async () => {
    mockedAxios.patch = vi.fn().mockRejectedValue({ response: { data: { error: { message: "Service not found" } } } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useServiceUpdate("svc-1"), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ instanceName: "node-east" });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(mockSetError).toHaveBeenCalled());
  });
});
