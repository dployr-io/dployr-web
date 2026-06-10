// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import axios from "axios";
import { Dialog } from "@/components/ui/dialog";
import { TOTPSetupDialog, RegenerateCodesDialog } from "@/routes/clusters/$clusterId/settings/security";

vi.mock("axios");
vi.mock("qrcode.react", () => ({ QRCodeSVG: () => null }));
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/api-error", () => ({ getApiErrorMessage: (_err: any, fallback: string) => fallback }));
vi.mock("react-timeago", () => ({ default: () => null }));

const mockedAxios = vi.mocked(axios, true);

const BACKUP_CODES = ["AAAAA-BBBBB", "CCCCC-DDDDD", "EEEEE-FFFFF", "GGGGG-HHHHH", "IIIII-JJJJJ", "KKKKK-LLLLL", "MMMMM-NNNNN", "PPPPP-QQQQQ"];

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(Dialog, { open: true }, children));
}

const mockClick = vi.fn();
const mockAnchor = { href: "", download: "", click: mockClick };
const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
  global.URL.revokeObjectURL = vi.fn();
  vi.spyOn(document, "createElement").mockImplementation((tag: string, options?: ElementCreationOptions) => {
    if (tag === "a") return mockAnchor as unknown as HTMLAnchorElement;
    return originalCreateElement(tag, options);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── RegenerateCodesDialog ─────────────────────────────────────────────────────

describe("RegenerateCodesDialog — download backup codes", () => {
  it("shows code input and Regenerate button initially", () => {
    render(<RegenerateCodesDialog onClose={vi.fn()} />, { wrapper: makeWrapper() });
    expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /regenerate/i })).toBeInTheDocument();
  });

  it("Regenerate button is disabled until 6 digits are entered", () => {
    render(<RegenerateCodesDialog onClose={vi.fn()} />, { wrapper: makeWrapper() });
    const btn = screen.getByRole("button", { name: /regenerate/i });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "12345" } });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    expect(btn).not.toBeDisabled();
  });

  it("shows new backup codes after successful regeneration", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { data: { backupCodes: BACKUP_CODES } } });

    render(<RegenerateCodesDialog onClose={vi.fn()} />, { wrapper: makeWrapper() });

    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /regenerate/i })));

    await waitFor(() => expect(screen.getByText("AAAAA-BBBBB")).toBeInTheDocument());
    expect(screen.getByText("CCCCC-DDDDD")).toBeInTheDocument();
  });

  it("Download button triggers file download with backup codes content", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { data: { backupCodes: BACKUP_CODES } } });

    render(<RegenerateCodesDialog onClose={vi.fn()} />, { wrapper: makeWrapper() });

    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /regenerate/i })));
    await waitFor(() => expect(screen.getByText("AAAAA-BBBBB")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob: Blob = (URL.createObjectURL as any).mock.calls[0][0];
    const text = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsText(blob);
    });
    expect(text).toBe(BACKUP_CODES.join("\n"));

    expect(mockAnchor.download).toBe("dployr-backup-codes.txt");
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("shows error when regeneration fails", async () => {
    mockedAxios.post = vi.fn().mockRejectedValue(new Error("Invalid code"));

    render(<RegenerateCodesDialog onClose={vi.fn()} />, { wrapper: makeWrapper() });
    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "000000" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /regenerate/i })));

    await waitFor(() => expect(screen.getByText(/invalid code/i)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
  });

  it("calls onClose when Done is clicked after download step", async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { data: { backupCodes: BACKUP_CODES } } });
    const onClose = vi.fn();

    render(<RegenerateCodesDialog onClose={onClose} />, { wrapper: makeWrapper() });
    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /regenerate/i })));
    await waitFor(() => screen.getByRole("button", { name: /done/i }));

    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── TOTPSetupDialog ───────────────────────────────────────────────────────────

describe("TOTPSetupDialog — download backup codes", () => {
  it("shows backup codes and Download button after successful TOTP confirm", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/dployr:user@example.com?secret=JBSWY3DPEHPK3PXP" } },
    });
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { data: { backupCodes: BACKUP_CODES } } });

    render(<TOTPSetupDialog onClose={vi.fn()} />, { wrapper: makeWrapper() });

    // Setup auto-triggers on mount; wait for QR step
    await waitFor(() => expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled());

    // Advance to verify step
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(screen.getByPlaceholderText("000000")).toBeInTheDocument());

    // Enter 6-digit code and confirm
    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /confirm/i })));

    await waitFor(() => expect(screen.getByText("AAAAA-BBBBB")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
  });

  it("Download button on backup step triggers file download with all 8 codes", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/dployr:test?secret=JBSWY3DPEHPK3PXP" } },
    });
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { data: { backupCodes: BACKUP_CODES } } });

    render(<TOTPSetupDialog onClose={vi.fn()} />, { wrapper: makeWrapper() });

    await waitFor(() => expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => screen.getByPlaceholderText("000000"));

    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /confirm/i })));
    await waitFor(() => screen.getByRole("button", { name: /download/i }));

    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blob: Blob = (URL.createObjectURL as any).mock.calls[0][0];
    const text = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsText(blob);
    });
    expect(text).toBe(BACKUP_CODES.join("\n"));
    expect(mockAnchor.download).toBe("dployr-backup-codes.txt");
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("displays all 8 backup codes on the backup step", async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      data: { data: { secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/dployr:test?secret=JBSWY3DPEHPK3PXP" } },
    });
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { data: { backupCodes: BACKUP_CODES } } });

    render(<TOTPSetupDialog onClose={vi.fn()} />, { wrapper: makeWrapper() });

    await waitFor(() => expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => screen.getByPlaceholderText("000000"));
    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /confirm/i })));

    await waitFor(() => screen.getByText("AAAAA-BBBBB"));
    for (const code of BACKUP_CODES) {
      expect(screen.getByText(code)).toBeInTheDocument();
    }
  });
});
