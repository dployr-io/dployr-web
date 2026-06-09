// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import { useState } from "react";
import TimeAgo from "react-timeago";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem } from "@/types";
import HeadingSmall from "@/components/heading-small";
import { ProtectedRoute } from "@/components/protected-route";
import { use2FA } from "@/hooks/use-2fa";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useSecurity, type CreatedApiToken, type SessionInfo } from "@/hooks/use-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { APP_LINKS } from "@/lib/constants";
import { Plus, Trash2, Copy, Check, KeyRound, Monitor, Smartphone, Tablet, Terminal } from "lucide-react";

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
