// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import axios from "axios";
import { useServiceStop } from "@/hooks/use-service-stop";

vi.mock("axios");

const mockSetError = vi.fn();
const mockSetNotification = vi.fn();
vi.mock("@/contexts/app-alert-context", () => ({
  useAppAlert: () => ({ setError: mockSetError, setNotification: mockSetNotification }),
}));

const mockedAxios = vi.mocked(axios, true);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return ({ children }: { children: any }) => createElement(QueryClientProvider, { client: qc }, children);
}

describe("useServiceStop", () => {
  beforeEach(() => vi.clearAllMocks());

  test("stop calls POST to /stop endpoint", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useServiceStop("svc-1"), { wrapper: makeWrapper() });

    await act(async () => { await result.current.stop.mutateAsync(); });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/v1/services/svc-1/stop"),
      expect.any(Object),
      expect.any(Object)
    );
  });

  test("start calls POST to /start endpoint", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useServiceStop("svc-1"), { wrapper: makeWrapper() });

    await act(async () => { await result.current.start.mutateAsync(); });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/v1/services/svc-1/start"),
      expect.any(Object),
      expect.any(Object)
    );
  });

  test("shows shutdown notification after stop succeeds", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useServiceStop("svc-1"), { wrapper: makeWrapper() });

    await act(async () => { await result.current.stop.mutateAsync(); });

    expect(mockSetNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("shut down") })
    );
  });

  test("shows wake-up notification after start succeeds", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useServiceStop("svc-1"), { wrapper: makeWrapper() });

    await act(async () => { await result.current.start.mutateAsync(); });

    expect(mockSetNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("wake up") })
    );
  });

  test("calls setError when stop fails", async () => {
    mockedAxios.post = vi.fn().mockRejectedValue({ response: { data: { error: { message: "Service not found" } } } });
    const { result } = renderHook(() => useServiceStop("svc-1"), { wrapper: makeWrapper() });

    await act(async () => {
      try { await result.current.stop.mutateAsync(); } catch { /* expected */ }
    });

    await waitFor(() => expect(mockSetError).toHaveBeenCalled());
  });

  test("calls setError when start fails", async () => {
    mockedAxios.post = vi.fn().mockRejectedValue({ response: { data: { error: { message: "Service not found" } } } });
    const { result } = renderHook(() => useServiceStop("svc-1"), { wrapper: makeWrapper() });

    await act(async () => {
      try { await result.current.start.mutateAsync(); } catch { /* expected */ }
    });

    await waitFor(() => expect(mockSetError).toHaveBeenCalled());
  });
});
