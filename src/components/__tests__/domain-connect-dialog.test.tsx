// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { DomainConnectDialog } from "@/components/domain-connect-dialog";
import type { DnsDomain, DnsSetupResponse } from "@/hooks/use-dns";


const CNAME_SETUP: DnsSetupResponse = {
  domain: "app.example.com",
  provider: "cloudflare",
  records: [
    { type: "CNAME", name: "app", value: "cluster-abc.dployr.run", ttl: 300 },
  ],
  verification: { type: "TXT", name: "_dployr-app", value: "verify-token-xyz" },
  manualGuideUrl: "https://docs.dployr.io/dns/cloudflare",
};

const APEX_SETUP: DnsSetupResponse = {
  domain: "example.com",
  provider: "cloudflare",
  records: [
    { type: "A", name: "@", value: "1.2.3.4" },
    { type: "AAAA", name: "@", value: "::1" },
  ],
  verification: { type: "TXT", name: "_dployr", value: "verify-token-abc" },
};

const pendingDomain = (domain: string): DnsDomain => ({
  id: "d1",
  domain,
  status: "pending",
  provider: "cloudflare",
  serviceName: "my-service",
  createdAt: Date.now(),
  activatedAt: null,
});

const activeDomain = (domain: string): DnsDomain => ({
  ...pendingDomain(domain),
  status: "active",
  activatedAt: Date.now(),
});

function renderDialog(
  overrides: Partial<{
    setupDetails: DnsSetupResponse | null;
    domains: DnsDomain[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }> = {}
) {
  const onOpenChange = overrides.onOpenChange ?? vi.fn();
  const result = render(
    <DomainConnectDialog
      setupDetails={overrides.setupDetails ?? CNAME_SETUP}
      domains={overrides.domains ?? [pendingDomain("app.example.com")]}
      open={overrides.open ?? true}
      onOpenChange={onOpenChange}
    />
  );
  return { ...result, onOpenChange };
}

const mockWriteText = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: mockWriteText },
    writable: true,
    configurable: true,
  });
  mockWriteText.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});


describe("DomainConnectDialog", () => {
  it("renders nothing when setupDetails is null", () => {
    const { container } = renderDialog({ setupDetails: null });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when open is false", () => {
    renderDialog({ open: false });
    expect(screen.queryByText("Connect app.example.com")).not.toBeInTheDocument();
  });

  it("shows the domain name in the title", () => {
    renderDialog();
    expect(screen.getByText("Connect app.example.com")).toBeInTheDocument();
  });

  it("shows the waiting instruction in the description", () => {
    renderDialog();
    expect(screen.getByText(/Add these records in your DNS provider/i)).toBeInTheDocument();
  });

  it("renders CNAME routing section header", () => {
    renderDialog();
    expect(screen.getByText("Create CNAME record")).toBeInTheDocument();
    // "CNAME" appears in both the section badge and the per-record type badge
    expect(screen.getAllByText("CNAME").length).toBeGreaterThanOrEqual(1);
  });

  it("renders apex routing section with A / AAAA badge for A records", () => {
    renderDialog({ setupDetails: APEX_SETUP, domains: [pendingDomain("example.com")] });
    expect(screen.getByText("Point your domain")).toBeInTheDocument();
    expect(screen.getByText("A / AAAA")).toBeInTheDocument();
  });

  it("renders DNS record name and value", () => {
    renderDialog();
    expect(screen.getByText("app")).toBeInTheDocument();
    expect(screen.getByText("cluster-abc.dployr.run")).toBeInTheDocument();
  });

  it("renders TTL row when present", () => {
    renderDialog();
    expect(screen.getByText("300")).toBeInTheDocument();
  });

  it("renders verification TXT section", () => {
    renderDialog();
    expect(screen.getByText("Verify ownership")).toBeInTheDocument();
    expect(screen.getByText("TXT")).toBeInTheDocument();
    expect(screen.getByText("_dployr-app")).toBeInTheDocument();
    expect(screen.getByText("verify-token-xyz")).toBeInTheDocument();
  });

  it("shows manual guide link when manualGuideUrl is provided", () => {
    renderDialog();
    const link = screen.getByRole("link", { name: /manual guide/i });
    expect(link).toHaveAttribute("href", "https://docs.dployr.io/dns/cloudflare");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("hides manual guide link when manualGuideUrl is absent", () => {
    renderDialog({ setupDetails: APEX_SETUP, domains: [pendingDomain("example.com")] });
    expect(screen.queryByRole("link", { name: /manual guide/i })).not.toBeInTheDocument();
  });


  it("copies a record value to clipboard when copy button clicked", async () => {
    renderDialog();
    const copyButtons = screen.getAllByRole("button");
    const iconButton = copyButtons.find(b => !b.textContent?.includes("Done"))!;
    // Flush the async clipboard call via act — waitFor conflicts with fake timers
    await act(async () => {
      fireEvent.click(iconButton);
    });
    expect(mockWriteText).toHaveBeenCalledTimes(1);
  });

  it("reverts copy icon back after 2 s", async () => {
    renderDialog();
    const copyButtons = screen.getAllByRole("button");
    const iconButton = copyButtons.find(b => !b.textContent?.includes("Done"))!;
    await act(async () => {
      fireEvent.click(iconButton);
    });
    expect(mockWriteText).toHaveBeenCalledTimes(1);
    // Advance past the 2 s revert timer — should not throw
    act(() => vi.advanceTimersByTime(2000));
  });

  it("silently handles clipboard API failure", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("NotAllowedError"));
    renderDialog();
    const copyButtons = screen.getAllByRole("button");
    const iconButton = copyButtons.find(b => !b.textContent?.includes("Done"))!;
    // Should not throw even when clipboard rejects
    await act(async () => {
      fireEvent.click(iconButton);
    });
    expect(mockWriteText).toHaveBeenCalledTimes(1);
  });


  it("calls onOpenChange(false) when Done is clicked", () => {
    const { onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });


  it("does NOT auto-close while domain is still pending", () => {
    const { onOpenChange } = renderDialog({
      domains: [pendingDomain("app.example.com")],
    });
    act(() => vi.advanceTimersByTime(5000));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows verified state and auto-closes 1.5 s after domain becomes active", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <DomainConnectDialog
        setupDetails={CNAME_SETUP}
        domains={[pendingDomain("app.example.com")]}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Domain transitions to active
    rerender(
      <DomainConnectDialog
        setupDetails={CNAME_SETUP}
        domains={[activeDomain("app.example.com")]}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Verified title appears immediately
    expect(screen.getByText("Domain verified!")).toBeInTheDocument();
    expect(screen.getByText(/is now active and routing traffic/i)).toBeInTheDocument();

    // Not closed yet
    expect(onOpenChange).not.toHaveBeenCalled();

    // Auto-close fires after 1.5 s
    act(() => vi.advanceTimersByTime(1500));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not trigger auto-close for a different domain becoming active", () => {
    const { onOpenChange } = renderDialog({
      setupDetails: CNAME_SETUP,
      domains: [activeDomain("other.example.com")],
    });
    act(() => vi.advanceTimersByTime(5000));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("resets verified state when dialog is closed and reopened for a new domain", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <DomainConnectDialog
        setupDetails={CNAME_SETUP}
        domains={[activeDomain("app.example.com")]}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByText("Domain verified!")).toBeInTheDocument();

    // Close the dialog
    rerender(
      <DomainConnectDialog
        setupDetails={CNAME_SETUP}
        domains={[activeDomain("app.example.com")]}
        open={false}
        onOpenChange={onOpenChange}
      />
    );

    // Reopen with a fresh pending domain
    rerender(
      <DomainConnectDialog
        setupDetails={{ ...CNAME_SETUP, domain: "new.example.com" }}
        domains={[pendingDomain("new.example.com")]}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByText("Connect new.example.com")).toBeInTheDocument();
    expect(screen.queryByText("Domain verified!")).not.toBeInTheDocument();
  });

  it("cancels the auto-close timer if dialog is manually dismissed before 1.5 s", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <DomainConnectDialog
        setupDetails={CNAME_SETUP}
        domains={[activeDomain("app.example.com")]}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // User clicks Done before timer fires
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Parent closes the dialog
    rerender(
      <DomainConnectDialog
        setupDetails={CNAME_SETUP}
        domains={[activeDomain("app.example.com")]}
        open={false}
        onOpenChange={onOpenChange}
      />
    );

    onOpenChange.mockClear();
    act(() => vi.advanceTimersByTime(1500));
    // Timer was cleaned up on unmount/close — no extra calls
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
