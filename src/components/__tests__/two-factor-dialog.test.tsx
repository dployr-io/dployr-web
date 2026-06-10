// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TwoFactorDialog } from "@/components/two-factor-dialog";

function renderDialog(overrides: Partial<Parameters<typeof TwoFactorDialog>[0]> = {}) {
  const onOpenChange = overrides.onOpenChange ?? vi.fn();
  const onVerify = overrides.onVerify ?? vi.fn().mockResolvedValue(undefined);
  const result = render(
    <TwoFactorDialog
      open={overrides.open ?? true}
      onOpenChange={onOpenChange}
      onVerify={onVerify}
      {...overrides}
    />,
  );
  return { ...result, onOpenChange, onVerify };
}

beforeEach(() => vi.clearAllMocks());

describe("TwoFactorDialog — email method (default)", () => {
  it("renders the title", () => {
    renderDialog();
    expect(screen.getByText("Verify your identity")).toBeInTheDocument();
  });

  it("shows Send code button before code is sent", () => {
    renderDialog({ method: "email", onSendEmailCode: vi.fn() });
    expect(screen.getByRole("button", { name: /send code/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter code")).not.toBeInTheDocument();
  });

  it("shows code input after Send code is clicked", async () => {
    const onSendEmailCode = vi.fn().mockResolvedValue(undefined);
    renderDialog({ method: "email", onSendEmailCode });

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /send code/i })));

    expect(onSendEmailCode).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText("Enter code")).toBeInTheDocument();
  });

  it("shows email address in description when provided", () => {
    renderDialog({ method: "email", onSendEmailCode: vi.fn(), email: "user@example.com" });
    expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
  });

  it("shows Resend button after code is sent", async () => {
    const onSendEmailCode = vi.fn().mockResolvedValue(undefined);
    renderDialog({ method: "email", onSendEmailCode });

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /send code/i })));
    expect(screen.getByRole("button", { name: /resend/i })).toBeInTheDocument();
  });

  it("Resend button resets to pre-send state", async () => {
    const onSendEmailCode = vi.fn().mockResolvedValue(undefined);
    renderDialog({ method: "email", onSendEmailCode });

    await act(async () => fireEvent.click(screen.getByRole("button", { name: /send code/i })));
    expect(screen.queryByRole("button", { name: /send code/i })).not.toBeInTheDocument();

    act(() => fireEvent.click(screen.getByRole("button", { name: /resend/i })));
    expect(screen.getByRole("button", { name: /send code/i })).toBeInTheDocument();
  });

  it("does not show Verify button before code is sent", () => {
    renderDialog({ method: "email", onSendEmailCode: vi.fn() });
    expect(screen.queryByRole("button", { name: /verify/i })).not.toBeInTheDocument();
  });

  it("shows code input directly when no onSendEmailCode provided (email, no send step)", () => {
    renderDialog({ method: "email" });
    expect(screen.getByPlaceholderText("Enter code")).toBeInTheDocument();
  });
});

describe("TwoFactorDialog — totp method", () => {
  it("shows code input directly without Send code button", () => {
    renderDialog({ method: "totp" });
    expect(screen.queryByRole("button", { name: /send code/i })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/000000/)).toBeInTheDocument();
  });

  it("renders TOTP description", () => {
    renderDialog({ method: "totp" });
    expect(screen.getByText(/authenticator app/i)).toBeInTheDocument();
  });

  it("Verify button is disabled when input is empty", () => {
    renderDialog({ method: "totp" });
    const btn = screen.getByRole("button", { name: /verify/i });
    expect(btn).toBeDisabled();
  });

  it("Verify button enables when code is typed", () => {
    renderDialog({ method: "totp" });
    fireEvent.change(screen.getByPlaceholderText(/000000/), { target: { value: "123456" } });
    expect(screen.getByRole("button", { name: /verify/i })).not.toBeDisabled();
  });

  it("calls onVerify with the entered code", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    renderDialog({ method: "totp", onVerify });

    fireEvent.change(screen.getByPlaceholderText(/000000/), { target: { value: "654321" } });
    await act(async () => fireEvent.submit(screen.getByRole("button", { name: /verify/i }).closest("form")!));

    expect(onVerify).toHaveBeenCalledWith("654321");
  });

  it("calls onOpenChange(false) after successful verify", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog({ method: "totp", onVerify });

    fireEvent.change(screen.getByPlaceholderText(/000000/), { target: { value: "123456" } });
    await act(async () => fireEvent.submit(screen.getByRole("button", { name: /verify/i }).closest("form")!));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows error message when onVerify rejects", async () => {
    const onVerify = vi.fn().mockRejectedValue(new Error("Invalid or expired code"));
    renderDialog({ method: "totp", onVerify });

    fireEvent.change(screen.getByPlaceholderText(/000000/), { target: { value: "000000" } });
    await act(async () => fireEvent.submit(screen.getByRole("button", { name: /verify/i }).closest("form")!));

    expect(screen.getByText(/invalid or expired code/i)).toBeInTheDocument();
  });

  it("uppercases and strips non-alphanumeric/dash characters from input", () => {
    renderDialog({ method: "totp" });
    const input = screen.getByPlaceholderText(/000000/);

    fireEvent.change(input, { target: { value: "abcd!@#1" } });
    expect((input as HTMLInputElement).value).toBe("ABCD1");
  });

  it("allows dashes in the input (backup code format)", () => {
    renderDialog({ method: "totp" });
    const input = screen.getByPlaceholderText(/000000/);

    fireEvent.change(input, { target: { value: "AAAAA-BBBBB" } });
    expect((input as HTMLInputElement).value).toBe("AAAAA-BBBBB");
  });
});

describe("TwoFactorDialog — shared behavior", () => {
  it("renders nothing when open is false", () => {
    renderDialog({ open: false });
    expect(screen.queryByText("Verify your identity")).not.toBeInTheDocument();
  });

  it("Cancel button calls onOpenChange(false)", () => {
    const { onOpenChange } = renderDialog({ method: "totp" });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets code and error when dialog closes and reopens", async () => {
    const onVerify = vi.fn().mockRejectedValue(new Error("Bad code"));
    const { rerender } = renderDialog({ method: "totp", onVerify, open: true });

    // Type a code and trigger an error
    fireEvent.change(screen.getByPlaceholderText(/000000/), { target: { value: "000000" } });
    await act(async () => fireEvent.submit(screen.getByRole("button", { name: /verify/i }).closest("form")!));
    expect(screen.getByText(/bad code/i)).toBeInTheDocument();

    // Close then reopen
    rerender(
      <TwoFactorDialog open={false} onOpenChange={vi.fn()} onVerify={onVerify} method="totp" />,
    );
    rerender(
      <TwoFactorDialog open={true} onOpenChange={vi.fn()} onVerify={onVerify} method="totp" />,
    );

    expect(screen.queryByText(/bad code/i)).not.toBeInTheDocument();
    expect((screen.getByPlaceholderText(/000000/) as HTMLInputElement).value).toBe("");
  });

  it("accepts a custom title", () => {
    renderDialog({ method: "totp", title: "Confirm action" });
    expect(screen.getByText("Confirm action")).toBeInTheDocument();
  });

  it("accepts a custom description", () => {
    renderDialog({ method: "totp", description: "Custom description text" });
    expect(screen.getByText("Custom description text")).toBeInTheDocument();
  });

  it("Verify button shows loading state while isSubmitting", () => {
    renderDialog({ method: "totp", isSubmitting: true });
    // Button should be disabled while submitting
    expect(screen.getByRole("button", { name: /verify/i })).toBeDisabled();
  });
});
