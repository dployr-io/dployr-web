// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import axios from "axios";
import { use2FA, use2FASetup, use2FAStatus } from "@/hooks/use-2fa";

vi.mock("axios");
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/api-error", () => ({ getApiErrorMessage: (_err: any, fallback: string) => fallback }));

const mockedAxios = vi.mocked(axios, true);

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("use2FAStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  test("fetches and returns 2FA status", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { method: "email", totpEnabled: false, backupCodesRemaining: 0 } },
    });

    const { result } = renderHook(() => use2FAStatus(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toMatchObject({ method: "email", totpEnabled: false });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("/v1/auth/2fa/status"),
      expect.any(Object),
    );
  });

  test("returns totpEnabled:true when TOTP is active", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { method: "totp", totpEnabled: true, backupCodesRemaining: 8 } },
    });

    const { result } = renderHook(() => use2FAStatus(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.totpEnabled).toBe(true);
    expect(result.current.data?.backupCodesRemaining).toBe(8);
  });
});

// ── use2FA ───────────────────────────────────────────────────────────────────

describe("use2FA", () => {
  beforeEach(() => vi.clearAllMocks());

  test("requireAuth calls action directly when enabled is false", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { method: "email", totpEnabled: false, backupCodesRemaining: 0 } },
    });

    const { result } = renderHook(() => use2FA({ enabled: false }), { wrapper: makeWrapper() });

    const action = vi.fn();
    act(() => result.current.requireAuth(action));

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });

  test("requireAuth opens dialog and stores pending action when enabled is true", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { method: "email", totpEnabled: false, backupCodesRemaining: 0 } },
    });

    const { result } = renderHook(() => use2FA({ enabled: true }), { wrapper: makeWrapper() });

    const action = vi.fn();
    act(() => result.current.requireAuth(action));

    expect(result.current.isOpen).toBe(true);
    expect(action).not.toHaveBeenCalled();
  });

  test("cancel closes the dialog and clears pending action", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { method: "email", totpEnabled: false, backupCodesRemaining: 0 } },
    });

    const { result } = renderHook(() => use2FA({ enabled: true }), { wrapper: makeWrapper() });

    act(() => result.current.requireAuth(vi.fn()));
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.cancel());
    expect(result.current.isOpen).toBe(false);
  });

  test("sendEmailCode calls the email/send endpoint", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { method: "email", totpEnabled: false, backupCodesRemaining: 0 } },
    });
    mockedAxios.post = vi.fn().mockResolvedValue({ data: {} });

    const { result } = renderHook(() => use2FA({ enabled: true }), { wrapper: makeWrapper() });

    await act(async () => result.current.sendEmailCode());

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/v1/auth/2fa/email/send"),
      expect.anything(),
      expect.any(Object),
    );
  });

  test("sendEmailCode sets isSending while request is in-flight", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { method: "email", totpEnabled: false, backupCodesRemaining: 0 } },
    });

    let resolve!: () => void;
    mockedAxios.post = vi.fn().mockReturnValue(
      new Promise<any>((res) => { resolve = () => res({ data: {} }); }),
    );

    const { result } = renderHook(() => use2FA({ enabled: true }), { wrapper: makeWrapper() });

    let sendDone!: Promise<void>;
    act(() => { sendDone = result.current.sendEmailCode(); });

    await waitFor(() => expect(result.current.isSending).toBe(true));

    resolve();
    await act(async () => { await sendDone; });

    expect(result.current.isSending).toBe(false);
  });

  test("verify calls POST /verify, runs pending action, and closes dialog", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { method: "email", totpEnabled: false, backupCodesRemaining: 0 } },
    });
    mockedAxios.post = vi.fn().mockResolvedValue({ data: {} });

    const { result } = renderHook(() => use2FA({ enabled: true }), { wrapper: makeWrapper() });

    const action = vi.fn();
    act(() => result.current.requireAuth(action));

    await act(async () => result.current.verify("123456"));

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/v1/auth/2fa/verify"),
      { code: "123456" },
      expect.any(Object),
    );
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
  });

  test("verify throws when the API call fails", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { method: "email", totpEnabled: false, backupCodesRemaining: 0 } },
    });
    mockedAxios.post = vi.fn().mockRejectedValue(new Error("invalid code"));

    const { result } = renderHook(() => use2FA({ enabled: true }), { wrapper: makeWrapper() });

    await expect(act(async () => result.current.verify("000000"))).rejects.toThrow();
    expect(result.current.isOpen).toBe(false); // dialog stays as-is (caller handles it)
  });

  test("method reflects the fetched 2FA status", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { method: "totp", totpEnabled: true, backupCodesRemaining: 6 } },
    });

    const { result } = renderHook(() => use2FA({ enabled: true }), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.method).toBe("totp"));
  });
});

// ── use2FASetup ───────────────────────────────────────────────────────────────

describe("use2FASetup", () => {
  beforeEach(() => vi.clearAllMocks());

  test("setup.mutate calls GET /totp/setup", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/dployr:user@example.com?secret=JBSWY3DPEHPK3PXP" } },
    });

    const { result } = renderHook(() => use2FASetup(), { wrapper: makeWrapper() });

    let data: any;
    await act(async () => { data = await result.current.setup.mutateAsync(); });

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("/v1/auth/2fa/totp/setup"),
      expect.any(Object),
    );
    expect(data?.secret).toBe("JBSWY3DPEHPK3PXP");
  });

  test("confirm.mutate calls POST /totp/confirm with the code", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { data: { backupCodes: ["AAAAA-BBBBB", "CCCCC-DDDDD"] } },
    });

    const { result } = renderHook(() => use2FASetup(), { wrapper: makeWrapper() });

    let data: any;
    await act(async () => { data = await result.current.confirm.mutateAsync("654321"); });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/v1/auth/2fa/totp/confirm"),
      { code: "654321" },
      expect.any(Object),
    );
    expect(data.backupCodes).toHaveLength(2);
  });

  test("disable.mutate calls DELETE /totp with the code", async () => {
    mockedAxios.delete = vi.fn().mockResolvedValue({ data: {} });

    const { result } = renderHook(() => use2FASetup(), { wrapper: makeWrapper() });

    await act(async () => result.current.disable.mutateAsync("123456"));

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      expect.stringContaining("/v1/auth/2fa/totp"),
      expect.objectContaining({ data: { code: "123456" } }),
    );
  });

  test("disable.mutate shows success toast on completion", async () => {
    const { toast } = await import("@/lib/toast");
    mockedAxios.delete = vi.fn().mockResolvedValue({ data: {} });

    const { result } = renderHook(() => use2FASetup(), { wrapper: makeWrapper() });
    await act(async () => result.current.disable.mutateAsync("123456"));

    expect(toast.success).toHaveBeenCalledWith("Authenticator app removed");
  });

  test("regenerateCodes.mutate calls POST /backup-codes/regenerate", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({
      data: { data: { backupCodes: Array.from({ length: 8 }, (_, i) => `AAAAA-${i}0000`) } },
    });

    const { result } = renderHook(() => use2FASetup(), { wrapper: makeWrapper() });

    let data: any;
    await act(async () => { data = await result.current.regenerateCodes.mutateAsync("123456"); });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/v1/auth/2fa/backup-codes/regenerate"),
      { code: "123456" },
      expect.any(Object),
    );
    expect(data.backupCodes).toHaveLength(8);
  });
});
