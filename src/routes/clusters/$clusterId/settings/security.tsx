// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import { useState, useEffect } from "react";
import TimeAgo from "react-timeago";
import { QRCodeSVG } from "qrcode.react";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem } from "@/types";
import HeadingSmall from "@/components/heading-small";
import { ProtectedRoute } from "@/components/protected-route";
import { use2FA, use2FASetup, use2FAStatus } from "@/hooks/use-2fa";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useSecurity, type CreatedApiToken, type SessionInfo } from "@/hooks/use-security";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError } from "@/components/ui/field";
import { APP_LINKS } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api-error";
import { Plus, Trash2, Download, Copy, Check, KeyRound, Monitor, Smartphone, Tablet, Terminal, ShieldCheck, Mail, RefreshCw, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/clusters/$clusterId/settings/security")({
  component: SecurityPage,
});

const breadcrumbs: BreadcrumbItem[] = [{ title: "Security", href: "/settings/security" }];

const SCOPES = [{ value: "oidc:bind", label: "oidc:bind", description: "Register OIDC bindings (GitHub Actions bootstrap)" }];

function CopyButton({ text, asButton }: { text: string; asButton?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (asButton) {
    return (
      <Button onClick={copy} variant={copied ? "outline" : "default"}>
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy token"}
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copy}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function fmtDate(ms: number | string) {
  return new Date(Number(ms)).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function dateStr(offsetMonths = 0) {
  const d = new Date();
  if (offsetMonths) d.setMonth(d.getMonth() + offsetMonths);
  return d.toISOString().slice(0, 10);
}

function CreateTokenDialog({ onClose }: { onClose: () => void }) {
  const { createToken } = useSecurity();
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["oidc:bind"]);
  const [expiryDate, setExpiryDate] = useState(() => dateStr(3));
  const [created, setCreated] = useState<CreatedApiToken | null>(null);

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => (prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]));
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedScopes.length === 0 || !expiryDate) return;
    const ms = new Date(expiryDate).setHours(23, 59, 59, 999) - Date.now();
    const expiresIn = Math.max(1, Math.floor(ms / 1000));
    try {
      const result = await createToken.mutateAsync({ name: name.trim(), scopes: selectedScopes, expiresIn });
      setCreated(result);
    } catch {
      // toast already shown by onError in useSecurity
    }
  };

  if (created) {
    return (
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Token created</DialogTitle>
          <p className="text-sm text-muted-foreground">Copy it now. It won't be shown again.</p>
        </DialogHeader>
        <div className="overflow-x-auto rounded-md border bg-muted/40 px-3 py-2.5">
          <code className="block whitespace-nowrap text-xs font-mono select-all">{created.token}</code>
        </div>
        <p className="text-xs text-muted-foreground">
          Set as <code className="font-mono">DPLOYR_TOKEN</code> in your repository secrets.{" "}
          <a href={APP_LINKS.DOCS.GITHUB_ACTIONS} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">
            GitHub Actions setup
          </a>
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
          <CopyButton text={created.token} asButton />
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create access token</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name</label>
          <Input placeholder="e.g. github-actions" value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && handleCreate()} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Scopes</label>
          {SCOPES.map(scope => (
            <label key={scope.value} className="flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/40">
              <Checkbox
                checked={selectedScopes.includes(scope.value)}
                onCheckedChange={() => toggleScope(scope.value)}
              />
              <div>
                <p className="text-sm font-mono font-medium">{scope.label}</p>
                <p className="text-xs text-muted-foreground">{scope.description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Expiry</label>
          <input
            type="date"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            min={dateStr()}
            max={dateStr(36)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={!name.trim() || selectedScopes.length === 0 || !expiryDate || createToken.isPending}>
          {createToken.isPending ? "Creating…" : "Create token"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function DeviceIcon({ type }: { type?: "desktop" | "mobile" | "tablet" | "unknown" }) {
  const cls = "h-4 w-4 text-muted-foreground shrink-0";
  if (type === "mobile") return <Smartphone className={cls} />;
  if (type === "tablet") return <Tablet className={cls} />;
  if (type === "desktop") return <Monitor className={cls} />;
  return <Terminal className={cls} />;
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function providerLabel(provider: string) {
  if (provider === "email") return "Email";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function countryName(code: string) {
  try { return regionNames.of(code) ?? code; } catch { return code; }
}

function SessionRow({ session, onRevoke, isPending }: { session: SessionInfo; onRevoke: (id: string) => void; isPending: boolean }) {
  const { device, ip, country, provider, createdAt, expiresAt, current } = session;

  const known = (v?: string) => (v && v.toLowerCase() !== "unknown" ? v : null);
  const browser = known(device?.browser);
  const os = known(device?.os);
  const browserLine = browser ? `${browser}${known(device?.browserVersion) ? ` ${device!.browserVersion}` : ""}` : null;
  const osLine = os ? `${os}${known(device?.osVersion) ? ` ${device!.osVersion}` : ""}` : null;

  return (
    <div className="flex items-start justify-between rounded-lg border bg-muted/20 px-4 py-3 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5">
          <DeviceIcon type={browserLine || osLine ? device?.type : "unknown"} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">
              {browserLine && osLine ? `${browserLine} on ${osLine}` : browserLine ?? osLine ?? "CLI / API client"}
            </p>
            {current && (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 text-xs">
                this device
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {providerLabel(provider)}
            {country ? ` · ${countryName(country)}` : ""}
            {ip ? <> · <span className="font-mono">{ip}</span></> : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Signed in <TimeAgo date={new Date(Number(createdAt))} /> · expires <TimeAgo date={new Date(Number(expiresAt))} />
          </p>
        </div>
      </div>
      {!current && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRevoke(session.id)}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

type SetupStep = "qr" | "verify" | "backup";

export function TOTPSetupDialog({ onClose }: { onClose: () => void }) {
  const { setup, confirm } = use2FASetup();
  const [step, setStep] = useState<SetupStep>("qr");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const handleStart = async () => {
    try {
      await setup.mutateAsync();
      setStep("qr");
    } catch {
      // error toasted by hook
    }
  };

  const handleVerify = async () => {
    setError(null);
    try {
      const result = await confirm.mutateAsync(code);
      setBackupCodes(result.backupCodes);
      setStep("backup");
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid code. Try again."));
    }
  };

  const downloadCodes = () => {
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dployr-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Trigger setup on mount
  useEffect(() => { handleStart(); }, []);

  if (!setup.data && !setup.isPending) {
    return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up authenticator app</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Failed to start setup. Try again.</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleStart}>Try again</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  if (step === "qr" || step === "verify") {
    return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up authenticator app</DialogTitle>
          <DialogDescription className="text-xs">
            {step === "qr"
              ? "Scan with Google Authenticator, Authy, 1Password, or any TOTP app."
              : "Enter the code from your app to confirm it's working."}
          </DialogDescription>
        </DialogHeader>

        {step === "qr" && (
          <div className="space-y-4">
            {setup.isPending ? (
              <Skeleton className="h-48 w-48 mx-auto rounded-lg" />
            ) : setup.data ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-lg border">
                  <QRCodeSVG value={setup.data.uri} size={176} />
                </div>
                <details className="w-full">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Can't scan? Enter code manually
                  </summary>
                  <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                    <code className="flex-1 text-xs font-mono break-all select-all">{setup.data.secret}</code>
                    <CopyButton text={setup.data.secret} />
                  </div>
                </details>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep("verify")} disabled={!setup.data}>
                Next
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <Field>
              <Input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setError(null); }}
                placeholder="000000"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                className="h-9 text-center text-lg tracking-widest font-mono"
              />
              {error && <FieldError errors={[{ message: error }]} className="text-[10px]" />}
            </Field>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("qr")}>Back</Button>
              <Button onClick={handleVerify} disabled={code.length !== 6 || confirm.isPending}>
                {confirm.isPending ? "Verifying…" : "Confirm"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    );
  }

  // Step: backup codes
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Backup codes</DialogTitle>
        <DialogDescription className="text-xs">
          One-time use. Download before closing.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-md border bg-muted/40 p-3 space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {backupCodes.map(c => (
            <code key={c} className="text-xs font-mono text-center py-1 px-2 rounded bg-background border select-all">
              {c}
            </code>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        These codes will not be shown to you again.
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={downloadCodes}>
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </DialogContent>
  );
}


export function RegenerateCodesDialog({ onClose }: { onClose: () => void }) {
  const { regenerateCodes } = use2FASetup();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const handleRegenerate = async () => {
    setError(null);
    try {
      const result = await regenerateCodes.mutateAsync(code);
      setBackupCodes(result.backupCodes);
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid code"));
    }
  };

  const downloadCodes = () => {
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dployr-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (backupCodes.length > 0) {
    return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New backup codes</DialogTitle>
          <DialogDescription className="text-xs">
            Previous codes are invalidated. 
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3">
          <div className="grid grid-cols-2 gap-1.5">
            {backupCodes.map(c => (
              <code key={c} className="text-xs font-mono text-center py-1 px-2 rounded bg-background border select-all">
                {c}
              </code>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          These codes will not be shown to you again.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={downloadCodes}>
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Regenerate backup codes</DialogTitle>
        <DialogDescription className="text-xs">
          Your existing backup codes will be invalidated. Enter your authenticator code to confirm.
        </DialogDescription>
      </DialogHeader>

      <Field>
        <Input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setError(null); }}
          placeholder="000000"
          maxLength={6}
          autoFocus
          autoComplete="one-time-code"
          className="h-9 text-center text-lg tracking-widest font-mono"
        />
        {error && <FieldError errors={[{ message: error }]} className="text-[10px]" />}
      </Field>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleRegenerate} disabled={code.length !== 6 || regenerateCodes.isPending}>
          {regenerateCodes.isPending ? "Regenerating…" : "Regenerate"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Disable TOTP dialog ────────────────────────────────────────────────────

function DisableTOTPDialog({ onClose }: { onClose: () => void }) {
  const { disable } = use2FASetup();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDisable = async () => {
    setError(null);
    try {
      await disable.mutateAsync(code);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid code"));
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Remove authenticator app</DialogTitle>
        <DialogDescription className="text-xs">
          Your account will revert to email verification. Enter your current authenticator code to confirm.
        </DialogDescription>
      </DialogHeader>

      <Field>
        <Input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value.replace(/[^0-9A-Za-z-]/g, "")); setError(null); }}
          placeholder="000000"
          maxLength={15}
          autoFocus
          autoComplete="one-time-code"
          className="h-9 text-center text-lg tracking-widest font-mono"
        />
        {error && <FieldError errors={[{ message: error }]} className="text-[10px]" />}
      </Field>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="destructive"
          onClick={handleDisable}
          disabled={code.length < 6 || disable.isPending}
        >
          {disable.isPending ? "Removing…" : "Remove authenticator"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}


function TwoFASection() {
  const { data: status, isLoading } = use2FAStatus();
  const { user } = useAuth();
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-12 w-full rounded-lg" />;
  }

  const totpEnabled = status?.totpEnabled ?? false;

  return (
    <div className="space-y-4">
      <HeadingSmall
        title="Two-factor authentication"
        description="Require a second verification step when performing sensitive actions."
      />

      <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-3">
          {totpEnabled ? (
            <ShieldCheck className="h-4 w-4 text-green-600" />
          ) : (
            <Mail className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {totpEnabled ? "Authenticator app" : "Email"}
            </p>
            <p className="text-xs text-muted-foreground">
              {totpEnabled
                ? `${status?.backupCodesRemaining ?? 0} backup ${status?.backupCodesRemaining === 1 ? "code" : "codes"} remaining`
                : user?.email ?? "your email"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totpEnabled && (
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
              Active
            </Badge>
          )}
          {!totpEnabled && (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSetupOpen(true)}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Set up authenticator app
            </Button>
          )}
          {totpEnabled && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setRegenOpen(true)}>
                <RefreshCw className="h-3.5 w-3.5" />
                New backup codes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDisableOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={setupOpen} onOpenChange={open => { if (!open) setSetupOpen(false); }}>
        {setupOpen && <TOTPSetupDialog onClose={() => setSetupOpen(false)} />}
      </Dialog>

      <Dialog open={disableOpen} onOpenChange={open => { if (!open) setDisableOpen(false); }}>
        {disableOpen && <DisableTOTPDialog onClose={() => setDisableOpen(false)} />}
      </Dialog>

      <Dialog open={regenOpen} onOpenChange={open => { if (!open) setRegenOpen(false); }}>
        {regenOpen && <RegenerateCodesDialog onClose={() => setRegenOpen(false)} />}
      </Dialog>
    </div>
  );
}

function SecurityPage() {
  const twoFactor = use2FA({ enabled: true });
  const confirmation = useConfirmation();
  const { tokens, isLoadingTokens, revokeToken, sessions, isLoadingSessions, revokeSession, signOutAll } = useSecurity();
  const [createOpen, setCreateOpen] = useState(false);

  const handleRevokeToken = (id: string, name: string) => {
    confirmation.setPendingAction({
      action: () => revokeToken.mutate(id),
      prompt: `Revoke token "${name}"? Any CI jobs using it will stop working immediately.`,
    });
  };

  const handleRevokeSession = (id: string) => {
    confirmation.setPendingAction({
      action: () => revokeSession.mutate(id),
      prompt: "Revoke this session? That device will be signed out immediately.",
    });
  };

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <SettingsLayout twoFactor={twoFactor} confirmation={confirmation}>
          <TwoFASection />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <HeadingSmall title="Access tokens" description="Scoped tokens for CI/CD pipelines and automation." />
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                New token
              </Button>
            </div>

            {isLoadingTokens ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : tokens.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                <KeyRound className="h-4 w-4 shrink-0" />
                No tokens yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map(tok => (
                    <TableRow key={tok.id}>
                      <TableCell className="font-medium text-sm">{tok.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tok.scopes.map(s => (
                            <Badge key={s} variant="secondary" className="font-mono text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tok.lastUsedAt ? <TimeAgo date={new Date(tok.lastUsedAt)} /> : "never"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tok.expiresAt
                          ? tok.expiresAt < Date.now()
                            ? <span className="text-destructive">expired</span>
                            : fmtDate(tok.expiresAt)
                          : "never"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(tok.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRevokeToken(tok.id, tok.name)}
                          disabled={revokeToken.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <HeadingSmall title="Active sessions" description="Devices currently signed in to your account." />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() =>
                  confirmation.setPendingAction({
                    action: () => signOutAll.mutate(),
                    prompt: "Sign out of all devices? You will be redirected to the login page.",
                  })
                }
                disabled={signOutAll.isPending}
              >
                Sign out all
              </Button>
            </div>

            {isLoadingSessions ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                <Monitor className="h-4 w-4 shrink-0" />
                No active sessions found.
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => (
                  <SessionRow key={s.id} session={s} onRevoke={handleRevokeSession} isPending={revokeSession.isPending} />
                ))}
              </div>
            )}
          </div>
        </SettingsLayout>
      </AppLayout>

      <Dialog
        open={createOpen}
        onOpenChange={open => {
          if (!open) setCreateOpen(false);
        }}
      >
        {createOpen && <CreateTokenDialog onClose={() => setCreateOpen(false)} />}
      </Dialog>
    </ProtectedRoute>
  );
}
