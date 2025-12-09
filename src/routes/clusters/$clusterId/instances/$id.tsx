// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, LogType, LogStreamMode } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { ArrowUpRightIcon, ChevronLeft, Cog, Copy, Cpu, FileX2, HardDrive, Loader2, MemoryStick, Power, RefreshCcw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { useInstanceLogs } from "@/hooks/use-instance-logs";
import { useInstanceViewState } from "@/hooks/use-instance-view-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useClusters } from "@/hooks/use-clusters";
import { getRolePriority } from "@/lib/utils";
import { useInstances } from "@/hooks/use-instances";
import { FormattedFile } from "@/components/formatted-file";
import { useInstancesForm } from "@/hooks/use-instances-form";
import { useVersion } from "@/hooks/use-version";
import { useUrlState } from "@/hooks/use-url-state";
import { use2FA } from "@/hooks/use-2fa";
import { TwoFactorDialog } from "@/components/two-factor-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCallback, useEffect } from "react";
import { LogsWindow } from "@/components/logs-window";
import { VersionSelector } from "@/components/version-selector";

export const Route = createFileRoute("/clusters/$clusterId/instances/$id")({
  component: ViewInstance,
});

const viewInstanceBreadcrumbs = (clusterId?: string, instanceId?: string, instanceLabel?: string): BreadcrumbItem[] => {
  const base = clusterId ? `/clusters/${clusterId}/instances` : "/instances";

  return [
    {
      title: "Instances",
      href: base,
    },
    {
      title: instanceLabel || "",
      href: instanceId ? `${base}/${instanceId}` : base,
    },
  ];
};

function ViewInstance() {
  const { id: instanceId, clusterId } = Route.useParams();
  const { useInstanceTabsState } = useUrlState();
  const [{ tab }, setTab] = useInstanceTabsState();
  const { instances, rotateInstanceToken, installVersion, restartInstance, rebootInstance } = useInstances();
  const instance = instances?.find(i => i.id === instanceId);
  const { status, isConnected: statusConnected, error, debugEvents } = useInstanceStatus(instanceId);
  const currentVersion = status?.update?.build_info?.version;
  const { compatibility } = useVersion({ currentVersion });
  const breadcrumbs = viewInstanceBreadcrumbs(clusterId, instanceId, instance?.tag);
  const { user } = useAuth();
  const { users: clusterUsers } = useClusters();
  const myRole = clusterUsers?.find(u => u.id === user?.id)?.role;
  const canViewAdvanced = myRole ? getRolePriority(myRole) >= 2 : false;
  const canViewConfig = myRole ? getRolePriority(myRole) >= 2 : false;
  const canViewLogs = myRole ? getRolePriority(myRole) >= 2 : false;
  const { address, tag, publicKey, setAddress, setTag, setPublicKey } = useInstancesForm();
  const twoFactor = use2FA({ enabled: true });
  const {
    bootstrapToken,
    rotateOpen,
    rotateValue,
    rotateError,
    isRotating,
    rotatedToken,
    showBootstrapInfo,
    isInstalling,
    isRestarting,
    restartOpen,
    rebootOpen,
    forceRestart,
    forceReboot,
    logType,
    logMode,
    isAtBottom,
    setBootstrapToken,
    setRotateOpen,
    setRotateValue,
    setRotateError,
    setIsRotating,
    setRotatedToken,
    setShowBootstrapInfo,
    setIsInstalling,
    setIsRestarting,
    setRestartOpen,
    setRebootOpen,
    setForceRestart,
    setForceReboot,
    setLogType,
    setLogMode,
    setIsAtBottom,
  } = useInstanceViewState();
  const { logs, filteredLogs, selectedLevel, searchQuery, logsEndRef, setSelectedLevel, setSearchQuery } = useInstanceLogs(instanceId, logType, logMode);

  const currentTab = (tab || "overview") as "overview" | "system" | "config" | "logs" | "advanced";

  const handleScrollPositionChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, [setIsAtBottom]);

  useEffect(() => {
    const token = (status?.update?.status as any)?.debug?.auth?.bootstrap_token as string | undefined;
    if (token && !bootstrapToken) {
      setBootstrapToken(token);
    }
  }, [status, bootstrapToken, setBootstrapToken]);

  useEffect(() => {
    if (!instance) return;
    if (!address) {
      setAddress(instance.address || "");
    }
    if (!tag) {
      setTag(instance.tag || "");
    }
    if (!publicKey) {
      setPublicKey(instance.publicKey || "");
    }
  }, [instance, address, tag, publicKey, setAddress, setTag, setPublicKey]);

  // Update mode based on scroll position
  useEffect(() => {
    const newMode: LogStreamMode = isAtBottom ? "tail" : "historical";
    if (newMode !== logMode) {
      setLogMode(newMode);
    }
  }, [isAtBottom, logMode, setLogMode]);

  const handleCopyStatus = async () => {
    try {
      if (!status) return;
      await navigator.clipboard.writeText(JSON.stringify(status, null, 2));
    } catch {
      return;
    }
  };

  if (error) {
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
          <div className="flex h-full min-h-[500px] items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileX2 />
                </EmptyMedia>
                <EmptyTitle>Instance Error</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => window.history.back()}>
                    <ChevronLeft /> Back
                  </Button>
                  <Button variant="link" asChild className="text-muted-foreground" size="sm">
                    <a href="#">
                      Learn More <ArrowUpRightIcon />
                    </a>
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!status && !statusConnected) {
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
          <div className="flex h-full min-h-[500px] items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </EmptyMedia>
                <EmptyTitle>Connecting to instance...</EmptyTitle>
                <EmptyDescription>This shouldn&apos;t take too long. If it does, try refreshing your browser.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const metrics = status?.update?.status as any;
  const uptimeRaw = metrics?.uptime;
  const uptimeSeconds = typeof uptimeRaw === "number" ? Math.floor(uptimeRaw) : typeof uptimeRaw === "string" ? Math.floor(parseFloat(uptimeRaw)) : 0;
  const uptime = (() => {
    if (!uptimeSeconds) return "-";
    const minutes = Math.floor(uptimeSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${uptimeSeconds}s`;
  })();
  const system = metrics?.debug?.system as any;

  const handleRotateTokenClick = () => {
    twoFactor.requireAuth(() => {
      setRotateOpen(true);
    });
  };

  const handleRotateSubmit = async () => {
    if (!instanceId) return;
    const token = rotateValue.trim();
    if (!token) {
      setRotateError("Bootstrap token is required");
      return;
    }

    setIsRotating(true);
    setRotateError("");
    try {
      await rotateInstanceToken.mutateAsync({ id: instanceId, token });
      setBootstrapToken(null);
      setRotateOpen(false);
      setRotatedToken(token);
      setShowBootstrapInfo(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Failed to rotate bootstrap token";
      setRotateError(msg);
    } finally {
      setIsRotating(false);
    }
  };

  const handleInstallVersion = async (version?: string) => {
    if (!instanceId) return;
    setIsInstalling(true);
    try {
      await installVersion.mutateAsync({ id: instanceId, version });
    } finally {
      setIsInstalling(false);
    }
  };

  const handleRestartClick = () => {
    twoFactor.requireAuth(() => {
      setRestartOpen(true);
    });
  };

  const handleRebootClick = () => {
    twoFactor.requireAuth(() => {
      setRebootOpen(true);
    });
  };

  const handleRestartSubmit = async () => {
    if (!instanceId) return;
    setIsRestarting(true);
    try {
      await restartInstance.mutateAsync({ id: instanceId, force: forceRestart });
    } finally {
      setIsRestarting(false);
      setRestartOpen(false);
    }
  };

  const handleRebootSubmit = async () => {
    if (!instanceId) return;
    setIsRestarting(true);
    try {
      await rebootInstance.mutateAsync({ id: instanceId, force: forceReboot });
    } finally {
      setIsRestarting(false);
      setRebootOpen(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full min-h-0 flex-col gap-4 rounded-xl p-4">
          <div className="flex min-h-0 flex-1 auto-rows-min flex-col gap-6 px-9 py-2">
            <Tabs value={currentTab} onValueChange={value => setTab({ tab: value as any })} className="flex min-h-0 flex-1 flex-col w-full">
              <div className="flex items-center justify-between">
                <TabsList className="flex justify-between w-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="system">System</TabsTrigger>
                  {canViewConfig && <TabsTrigger value="config">Configuration</TabsTrigger>}
                  {canViewLogs && <TabsTrigger value="logs">Logs</TabsTrigger>}
                  {canViewAdvanced && <TabsTrigger value="advanced">Advanced</TabsTrigger>}
                </TabsList>

                <Button variant="outline" size="sm" onClick={() => window.history.back()} className="h-8 px-3 text-xs">
                  <ChevronLeft className="mr-1 h-3 w-3" /> Back
                </Button>
              </div>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4">
                  <MetricCard label="Uptime" value={uptime} />
                  <MetricCard
                    label="Version"
                    value={
                      <VersionSelector
                        currentVersion={status?.update?.build_info?.version || "-"}
                        latestVersion={compatibility?.latestVersion}
                        upgradeLevel={compatibility?.upgradeLevel}
                        onInstall={handleInstallVersion}
                        isInstalling={isInstalling}
                      />
                    }
                  />
                  <MetricCard label="Platform" value={`${status?.update?.platform?.os || "-"} · ${status?.update?.platform?.arch || "-"}`} />
                </div>

                <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4">
                  <div className="flex flex-col gap-3">
                    <MetricCard label="Status" value={<StatusBadge status={metrics?.status || "-"} variant="compact" />} />
                    <MetricCard label="Mode" value={<StatusBadge status={metrics?.mode || "-"} variant="compact" />} />
                  </div>

                  <div className="flex flex-col gap-3">
                    <MetricCard
                      label="Services"
                      value={typeof metrics?.services?.running === "number" && typeof metrics?.services?.total === "number" ? `${metrics.services.running}/${metrics.services.total} running` : "-"}
                    />
                    <MetricCard label="Health" value={<StatusBadge status={metrics?.health?.overall || "-"} variant="compact" />} />
                  </div>

                  <div className="flex flex-col gap-3">
                    <MetricCard
                      label="Proxy"
                      value={
                        <div className="flex items-center gap-2">
                          <StatusBadge status={metrics?.proxy?.status || "-"} variant="compact" />
                          {typeof metrics?.proxy?.routes === "number" && <span className="text-xs text-muted-foreground">{metrics.proxy.routes} routes</span>}
                        </div>
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4 sm:grid-cols-2">
                  <MetricCard label="Overall" value={<StatusBadge status={metrics?.health?.overall || "-"} variant="compact" />} />
                  <MetricCard label="Websocket" value={<StatusBadge status={metrics?.health?.ws || "-"} variant="compact" />} />
                  <MetricCard label="Tasks" value={<StatusBadge status={metrics?.health?.tasks || "-"} variant="compact" />} />
                  <MetricCard label="Auth" value={<StatusBadge status={metrics?.health?.auth || "-"} variant="compact" />} />
                </div>
              </TabsContent>

              <TabsContent value="config" className="mt-4 space-y-4">
                <div className="relative rounded-xl border bg-background/40 p-4">
                  <div className="space-y-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Address</span>
                      <div className="font-mono">{instance?.address || "-"}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Tag</span>
                      <div>{instance?.tag || "-"}</div>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">Bootstrap token</span>
                        <div className="mt-1 font-mono text-xs">{`${bootstrapToken}...`}</div>
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={handleRotateTokenClick} disabled={!bootstrapToken}>
                      <RotateCcw className="h-4 w-4" />
                      Rotate token
                    </Button>
                    <div>
                      <span className="text-xs text-muted-foreground">Public key</span>
                      {(instance?.publicKey || "-").split("\n").map((line, idx) => (
                        <div className="font-mono text-xs" key={idx}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="system" className="mt-4 space-y-4">
                <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4">
                  <MetricCard label="CPU" icon={<Cpu className="h-3 w-3" />} value={typeof system?.cpu_count === "number" ? system.cpu_count.toString() : "-"} />

                  <MetricCard label="Workers" icon={<Cog className="h-3 w-3" />} value={typeof system?.workers === "number" ? system.workers.toString() : "-"} />

                  <MetricCard
                    label="Memory"
                    icon={<MemoryStick className="h-3 w-3" />}
                    value={
                      typeof system?.mem_used_bytes === "number" && typeof system?.mem_total_bytes === "number"
                        ? `${Math.round(system.mem_used_bytes / 1024 / 1024)}MB / ${Math.round(system.mem_total_bytes / 1024 / 1024)}MB`
                        : "-"
                    }
                    progress={typeof system?.mem_used_bytes === "number" && typeof system?.mem_total_bytes === "number" ? (system.mem_used_bytes / system.mem_total_bytes) * 100 : undefined}
                  />

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-xs text-muted-foreground">Restart</p>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRestartClick}
                        className="h-8 w-8 p-0 text-xs rounded-md flex items-center justify-center"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-xs text-muted-foreground">Reboot</p>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRebootClick}
                        className="h-8 w-8 p-0 text-xs rounded-md flex items-center justify-center"
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border bg-background/40 p-4">
                  <p className="text-sm font-medium">Disks</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.isArray(system?.disks) && system.disks.length > 0 ? (
                      system.disks.map((d: any, idx: number) => {
                        const total = typeof d?.size_bytes === "number" ? d.size_bytes : 0;
                        const available = typeof d?.available_bytes === "number" ? d.available_bytes : 0;
                        const used = typeof d?.used_bytes === "number" ? d.used_bytes : Math.max(0, total - available);
                        const percent = total > 0 ? (used / total) * 100 : 0;

                        const formatBytes = (bytes: number) => {
                          const kb = 1024;
                          const mb = kb * 1024;
                          const gb = mb * 1024;

                          if (bytes >= gb) {
                            return `${Math.round(bytes / gb)}GB`;
                          }
                          if (bytes >= mb) {
                            return `${Math.round(bytes / mb)}MB`;
                          }
                          if (bytes >= kb) {
                            return `${Math.round(bytes / kb)}KB`;
                          }
                          return `${bytes}B`;
                        };

                        return (
                          <div key={`${idx}-${d?.filesystem || d?.mountpoint || "disk"}`} className="rounded-md border bg-background/60 p-3">
                            <MetricCard label={d?.mountpoint || "-"} icon={<HardDrive className="h-3 w-3" />} value={`${formatBytes(used)} / ${formatBytes(total)}`} progress={percent} />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-muted-foreground">-</div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {canViewLogs && (
                <TabsContent value="logs" className="mt-4 flex min-h-0 flex-1 flex-col">
                  <LogsWindow
                    logs={logs}
                    filteredLogs={filteredLogs}
                    selectedLevel={selectedLevel}
                    setSelectedLevel={setSelectedLevel}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    logsEndRef={logsEndRef}
                    onScrollPositionChange={handleScrollPositionChange}
                    extraFilters={[
                      {
                        id: "log-type",
                        label: "Type",
                        value: logType,
                        options: [
                          { label: "Application", value: "app" },
                          { label: "Installation", value: "install" },
                        ],
                        onChange: value => setLogType(value as LogType),
                      },
                    ]}
                  />
                </TabsContent>
              )}

              {canViewAdvanced && (
                <TabsContent value="advanced" className="mt-4 space-y-4">
                  <div className="relative flex min-h-0 flex-1 flex-col gap-3 rounded-xl border bg-background/40 p-4 mb-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-3 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={handleCopyStatus}
                      aria-label="Copy status payload"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <FormattedFile language="json" value={status} />
                  </div>
                  {debugEvents.length > 0 && (
                    <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-xl border bg-background/40 p-4">
                      <p className="text-sm font-medium mb-1">Debug events</p>
                      <div className="flex-1 overflow-auto rounded-md bg-neutral-950/90 p-3 text-xs text-neutral-100 space-y-1">
                        {debugEvents.map((evt, idx) => (
                          <div key={`${idx}-${evt}`}>{evt}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>

            <TwoFactorDialog open={twoFactor.isOpen} onOpenChange={twoFactor.setIsOpen} onVerify={twoFactor.verify} isSubmitting={twoFactor.isVerifying} />

            <Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Rotate bootstrap token</DialogTitle>
                  <DialogDescription>Enter your new bootstrap token.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <Field>
                    <FieldLabel htmlFor="rotate-bootstrap-token">Bootstrap token</FieldLabel>
                    <textarea
                      id="rotate-bootstrap-token"
                      value={rotateValue}
                      onChange={e => setRotateValue(e.target.value)}
                      autoComplete="off"
                      placeholder={`${bootstrapToken}...`}
                      className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      rows={3}
                    />
                    {rotateError && <FieldError errors={[{ message: rotateError }]} />}
                  </Field>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRotateOpen(false);
                      setRotateValue("");
                      setRotateError("");
                    }}
                    disabled={isRotating}
                  >
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={handleRotateSubmit} disabled={isRotating || !rotateValue.trim()}>
                    {isRotating ? "Rotating..." : "Rotate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showBootstrapInfo} onOpenChange={setShowBootstrapInfo}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Bootstrap token rotated</DialogTitle>
                  <DialogDescription>
                    This token will not be shown again. Store it securely. <br />
                    <a href="https://docs.dployr.io" target="_blank" rel="noreferrer" className="underline">
                      Learn more
                    </a>
                  </DialogDescription>
                </DialogHeader>
                {rotatedToken && (
                  <div className="mt-4 flex items-center justify-between rounded-md bg-muted px-3 py-2 font-mono text-xs">
                    <span className="truncate" title={rotatedToken}>
                      {rotatedToken}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-2 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={async () => {
                        try {
                          if (rotatedToken) {
                            await navigator.clipboard.writeText(rotatedToken);
                          }
                        } catch {
                          // ignore clipboard errors
                        }
                      }}
                      aria-label="Copy bootstrap token"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" size="sm" onClick={() => setShowBootstrapInfo(false)}>
                    Got it
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={restartOpen} onOpenChange={setRestartOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Restart Instance</DialogTitle>
                  <DialogDescription>
                    Restart the dployr daemon on this instance. The connection will briefly drop, but deployed apps and services will keep serving traffic.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="force-restart" checked={forceRestart} onChange={e => setForceRestart(e.target.checked)} className="h-4 w-4 rounded border-input" />
                    <label htmlFor="force-restart" className="text-sm text-muted-foreground">
                      Force restart (skip pending tasks check)
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRestartOpen(false);
                      setForceRestart(false);
                    }}
                    disabled={isRestarting}
                  >
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={handleRestartSubmit} disabled={isRestarting}>
                    {isRestarting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Restart Daemon
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={rebootOpen} onOpenChange={setRebootOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Restart Instance</DialogTitle>
                  <DialogDescription>
                    Reboot the instance OS. Connections and services will be briefly unavailable, so prefer low-traffic periods.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="force-restart" checked={forceRestart} onChange={e => setForceReboot(e.target.checked)} className="h-4 w-4 rounded border-input" />
                    <label htmlFor="force-restart" className="text-sm text-muted-foreground">
                      Force restart (skip pending tasks check)
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRebootOpen(false);
                      setForceReboot(false);
                    }}
                    disabled={isRestarting}
                  >
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={handleRebootSubmit} disabled={isRestarting}>
                    {isRestarting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Reboot Instance
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
