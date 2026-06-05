// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import axios from "axios";
import { AuthProvider, useAuth } from "@/hooks/use-auth";

vi.mock("axios");
vi.mock("@/hooks/use-url-state", () => ({
  useUrlState: () => ({
    useAuthError: () => [undefined, vi.fn()],
  }),
}));

const mockedAxios = vi.mocked(axios, true);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(AuthProvider, null, children));
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: { pathname: "/dashboard", href: "" },
      writable: true,
    });
  });

  test("isAuthenticated is false when session fetch fails", async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error("Unauthorized"));

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  test("isAuthenticated is true when session returns a user", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { user: { id: "user-1", email: "test@example.com" }, clusters: [] } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    expect(result.current.user).toMatchObject({ id: "user-1" });
  });

  test("login sets verifyOTP to true on success", async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error("Unauthorized"));
    mockedAxios.post = vi.fn().mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: "test@example.com" });
    });

    expect(result.current.verifyOTP).toBe(true);
  });

  test("login calls the email login endpoint with correct payload", async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error("Unauthorized"));
    mockedAxios.post = vi.fn().mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: "user@dployr.io", turnstileToken: "token-123" });
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/v1/auth/login/email"),
      expect.objectContaining({ email: "user@dployr.io", "cf-turnstile-response": "token-123" }),
      expect.any(Object)
    );
  });

  test("verifyOtp resets OTP state and refetches session on success", async () => {
    const getImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("Unauthorized")) // initial session fetch
      .mockResolvedValueOnce({
        data: { data: { user: { id: "user-1" }, clusters: [] } },
      }); // refetch after OTP
    mockedAxios.get = getImpl;
    mockedAxios.post = vi.fn().mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: "user@dployr.io" });
    });

    expect(result.current.verifyOTP).toBe(true);

    await act(async () => {
      await result.current.verifyOtp({ email: "user@dployr.io", code: "123456" });
    });

    expect(result.current.verifyOTP).toBe(false);
    expect(result.current.otpValue).toBe("");
  });

  test("logout clears session cookie and redirects to /", async () => {
    mockedAxios.get = vi.fn()
      .mockResolvedValueOnce({ data: { data: { user: { id: "u1" }, clusters: [] } } })
      .mockResolvedValue({ data: {} }); // logout call

    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => {
      result.current.logout();
    });

    await waitFor(() => expect(window.location.href).toBe("/"));
  });
});
