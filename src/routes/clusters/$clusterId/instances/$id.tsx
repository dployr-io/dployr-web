// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useRouter } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, LogType, LogStreamMode } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { ArrowUpRightIcon, ChevronDown, ChevronLeft, ChevronUp, Cog, Copy, Cpu, ExternalLink, FileX2, HardDrive, Loader2, MemoryStick, Power, RefreshCcw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { useInstanceViewState } from "@/hooks/use-instance-view-state";
import { useProcessHistory } from "@/hooks/use-process-history";
import { useMetricsHistory } from "@/hooks/use-metrics-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useClusters } from "@/hooks/use-clusters";
import { getRolePriority, cn } from "@/lib/utils";
import { useInstances } from "@/hooks/use-instances";
import { FormattedFile } from "@/components/formatted-file";
import { useInstancesForm } from "@/hooks/use-instances-form";
import { useVersion } from "@/hooks/use-version";
import { use2FA } from "@/hooks/use-2fa";
import { useInstanceTabs } from "@/hooks/use-standardized-tabs";
import { useInstanceLogs } from "@/hooks/use-standardized-logs";
import { TwoFactorDialog } from "@/components/two-factor-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useState, useMemo } from "react";
import { LogsWindow } from "@/components/logs-window";
import { VersionSelector } from "@/components/version-selector";
import { useDns } from "@/hooks/use-dns";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileSystemBrowser } from "@/components/file-system-browser";
import { InstanceMetricsChart } from "@/components/metrics-chart";
import { getMemoryProfile } from "@/lib/query-cache-persistence";
import { ProcessViewer } from "@/components/resource-viewer";
import { ProxyBadge } from "@/components/proxy-badge";
import { formatUptime, formatBytes } from "@/lib/instance-update";

export const Route = createFileRoute("/clusters/$clusterId/instances/$id")({
  component: ViewInstance,
});

const viewInstanceBreadcrumbs = (clusterId?: string, instanceId?: string, instanceLabel?: string): BreadcrumbItem[] => {
  const base = clusterId ? `/clusters/${clusterId}/instances` : "/instances";
  return [
    { title: "Instances", href: base },
    { title: instanceLabel || "", href: instanceId ? `${base}/${instanceId}` : base },
  ];
};

function ViewInstance() {
  const router = useRouter();
  const { id: instanceId, clusterId } = Route.useParams();
  
  // Use standardized tabs hook
  const {
    currentTab,
    logTimeRange,
    selectedLogLevel,
    logDuration,
    setTabState,
  } = useInstanceTabs();
  
  const { instances, rotateInstanceToken, installVersion, restartInstance, rebootInstance } = useInstances();
  const instance = instances?.find(i => i.id === instanceId);
  const { update, isConnected: statusConnected, error, debugEvents } = useInstanceStatus(instance?.tag);
  const { compatibility } = useVersion({ currentVersion: update?.agent.version });
    
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
    bootstrapToken, rotateOpen, rotateValue, rotateError, isRotating, rotatedToken,
    showBootstrapInfo, isInstalling, isRestarting, restartOpen, rebootOpen,
    forceRestart, forceReboot, logType, logMode, isAtBottom,
    setBootstrapToken, setRotateOpen, setRotateValue, setRotateError, setIsRotating,
    setRotatedToken, setShowBootstrapInfo, setIsInstalling, setIsRestarting,
    setRestartOpen, setRebootOpen, setForceRestart, setForceReboot,
    setLogType, setLogMode,
  } = useInstanceViewState();

  // Process history hook
  const {
    snapshots: processSnapshots,
    isLoading: isLoadingProcessHistory,
  } = useProcessHistory(instance?.tag || "");

  // Metrics history hook - collects metrics at 30 second intervals
  const {
    snapshots: metricsSnapshots,
  } = useMetricsHistory(instance?.tag || "", 30000);

  // Transform metrics snapshots to chart format
  const metricsChartData = useMemo(() => {
    return metricsSnapshots.map(snapshot => {
      if (snapshot.data.cpu && snapshot.data.memory) {
        return {
          timestamp: snapshot.timestamp,
          mem_used_bytes: snapshot.data.memory.used_bytes || 0,
          mem_total_bytes: snapshot.data.memory.total_bytes || 1,
          mem_used_percent: snapshot.data.memory 
            ? (snapshot.data.memory.used_bytes / snapshot.data.memory.total_bytes) * 100 
            : 0,
          cpu_user: snapshot.data.cpu.user_percent || 0,
          cpu_system: snapshot.data.cpu.system_percent || 0,
        };
      }
      
      // Fall back to calculating from process list if available
      if (snapshot.data.list && snapshot.data.list.length > 0) {
        const totalCpuPercent = snapshot.data.list.reduce((sum, p) => sum + (p.cpu_percent || 0), 0);
        const totalMemoryPercent = snapshot.data.list.reduce((sum, p) => sum + (p.memory_percent || 0), 0);
        
        return {
          timestamp: snapshot.timestamp,
          mem_used_bytes: 0,
          mem_total_bytes: 1,
          mem_used_percent: Math.min(totalMemoryPercent, 100), // Cap at 100%
          cpu_user: Math.min(totalCpuPercent / 2, 100), // Approximate user CPU
          cpu_system: Math.min(totalCpuPercent / 2, 100), // Approximate system CPU
        };
      }
      
      // Default empty data point
      return {
        timestamp: snapshot.timestamp,
        mem_used_bytes: 0,
        mem_total_bytes: 1,
        mem_used_percent: 0,
        cpu_user: 0,
        cpu_system: 0,
      };
    });
  }, [metricsSnapshots]);

  // Use standardized logs hook
  const {
    logs,
    filteredLogs,
    searchQuery,
    logsEndRef,
    isStreaming,
    setSearchQuery,
    handleScrollPositionChange,
  } = useInstanceLogs(instance?.tag, logType || "app", {
    currentTab,
    logTimeRange,
    selectedLogLevel,
    logDuration,
  });

  const updatePayload = update ?? null;
  const [isCertOpen, setIsCertOpen] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const { domains, setupDnsAsync, isSettingUp, deleteDnsAsync, isDeleting, verifyDomain, isVerifying, getVerifyCooldown, verifySetupDetails, clearVerifySetupDetails } = useDns(instanceId);
  const [, setError] = useState<{ message: string; helpLink: string } | null>(null);

  // Set bootstrap token from update data
  useEffect(() => {
    const token = update?.diagnostics.bootstrapTokenPreview;
    if (token && !bootstrapToken) {
      setBootstrapToken(token);
    }
  }, [update, bootstrapToken, setBootstrapToken]);

  useEffect(() => {
    if (!instance) return;
    if (!address) setAddress(instance.address || "");
    if (!tag) setTag(instance.tag || "");
    if (!publicKey) setPublicKey(instance.publicKey || "");
  }, [instance, address, tag, publicKey, setAddress, setTag, setPublicKey]);

  useEffect(() => {
    const newMode: LogStreamMode = isAtBottom ? "tail" : "historical";
    if (newMode !== logMode) setLogMode(newMode);
  }, [isAtBottom, logMode, setLogMode]);

  const handleCopyStatus = async () => {
    try {
      if (!updatePayload) return;
      await navigator.clipboard.writeText(JSON.stringify(updatePayload, null, 2));
    } catch {}
  };

  const handleRotateTokenClick = () => twoFactor.requireAuth(() => setRotateOpen(true));
  const handleRestartClick = () => twoFactor.requireAuth(() => setRestartOpen(true));
  const handleRebootClick = () => twoFactor.requireAuth(() => setRebootOpen(true));

  const handleRotateSubmit = async () => {
    if (!instance?.tag) return;
    const token = rotateValue.trim();
    if (!token) { setRotateError("Bootstrap token is required"); return; }
    setIsRotating(true);
    setRotateError("");
    try {
      await rotateInstanceToken.mutateAsync({ name: instance.tag, token });
      setBootstrapToken(null);
      setRotateOpen(false);
      setRotatedToken(token);
      setShowBootstrapInfo(true);
    } catch (err: any) {
      setRotateError(err?.response?.data?.error?.message || err?.message || "Failed to rotate bootstrap token");
    } finally {
      setIsRotating(false);
    }
  };

  const handleInstallVersion = async (version?: string) => {
    if (!instance?.tag) return;
    setIsInstalling(true);
    try { await installVersion.mutateAsync({ name: instance.tag, version }); }
    finally { setIsInstalling(false); }
  };

  const handleRestartSubmit = async () => {
    if (!instance?.tag) return;
    setIsRestarting(true);
    try { await restartInstance.mutateAsync({ name: instance.tag, force: forceRestart }); }
    finally { setIsRestarting(false); setRestartOpen(false); }
  };

  const handleRebootSubmit = async () => {
    if (!instance?.tag) return;
    setIsRestarting(true);
    try { await rebootInstance.mutateAsync({ name: instance.tag, force: forceReboot }); }
    finally { setIsRestarting(false); setRebootOpen(false); }
  };

  // Error state
  if (error) {
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
          <div className="flex h-full min-h-[500px] items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><FileX2 /></EmptyMedia>
                <EmptyTitle>Instance Error</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => router.history.back()}><ChevronLeft /> Back</Button>
                  <Button variant="link" asChild className="text-muted-foreground" size="sm">
                    <a href="#">Learn More <ArrowUpRightIcon /></a>
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  // Loading state
  if (!statusConnected) {
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
          <div className="flex h-full min-h-[500px] items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Loader2 className="h-4 w-4 animate-spin" /></EmptyMedia>
                <EmptyTitle>Connecting to instance...</EmptyTitle>
                <EmptyDescription>This shouldn&apos;t take too long.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const uptime = formatUptime(update?.status.uptimeSeconds || 0);

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full min-h-0 flex-col gap-4 rounded-xl">
          <div className="flex min-h-0 flex-1 auto-rows-min flex-col gap-6 px-9 py-2">
            <Tabs value={currentTab} onValueChange={value => setTabState({ tab: value as any })} className="flex min-h-0 flex-1 flex-col w-full">
              <div className="flex items-center justify-between">
                <TabsList className="flex justify-between w-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="system">System</TabsTrigger>
                  {update?.filesystem && <TabsTrigger value="files">Files</TabsTrigger>}
                  {canViewConfig && <TabsTrigger value="config">Configuration</TabsTrigger>}
                  {canViewLogs && <TabsTrigger value="logs">Logs</TabsTrigger>}
                  {canViewAdvanced && <TabsTrigger value="advanced">Advanced</TabsTrigger>}
                </TabsList>
                <Button size="sm" variant="ghost" onClick={() => router.history.back()} className="h-8 px-3 text-muted-foreground">
                  <ChevronLeft /> Back
                </Button>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-4 space-y-4">
                {/* Agent Info */}
                <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4">
                  <MetricCard label="Uptime" value={uptime} />
                  <MetricCard
                    label="Version"
                    value={
                      <VersionSelector
                        currentVersion={update?.agent.version || "-"}
                        latestVersion={compatibility?.latestVersion}
                        upgradeLevel={compatibility?.upgradeLevel}
                        onInstall={handleInstallVersion}
                        isInstalling={isInstalling}
                      />
                    }
                  />
                  <MetricCard label="Platform" value={`${update?.agent.os || "-"} · ${update?.agent.arch || "-"}`} />
                </div>

                {/* Status & Workloads */}
                <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4">
                  <div className="flex flex-col gap-3">
                    <MetricCard label="Status" value={<StatusBadge status={update?.status.state || "-"} variant="compact" />} />
                    <MetricCard label="Mode" value={<StatusBadge status={update?.status.mode || "-"} variant="compact" />} />
                  </div>

                  <div className="flex flex-col gap-3">
                    <MetricCard label="Services" value={update?.workloads?.services.length ? `${update.workloads.services.length} running` : "-"} />
                    <MetricCard label="Health" value={<StatusBadge status={update?.health.overall || "-"} variant="compact" />} />
                  </div>

                  <div className="flex flex-col gap-3">
                    <MetricCard
                      label="Proxy"
                      value={
                        update?.proxy ? (
                          <ProxyBadge
                            type={update.proxy.type}
                            status={update.proxy.status}
                            version={update.proxy.version}
                            routeCount={update.proxy.routes.length}
                          />
                        ) : "-"
                      }
                    />
                  </div>
                </div>

                {/* Health Breakdown */}
                <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4">
                  <MetricCard label="Overall" value={<StatusBadge status={update?.health.overall || "-"} variant="compact" />} />
                  <MetricCard label="Websocket" value={<StatusBadge status={update?.health.websocket || "-"} variant="compact" />} />
                  <MetricCard label="Tasks" value={<StatusBadge status={update?.health.tasks || "-"} variant="compact" />} />
                  <MetricCard label="Proxy" value={<StatusBadge status={update?.health.proxy || "-"} variant="compact" />} />
                  <MetricCard label="Auth" value={<StatusBadge status={update?.health.auth || "-"} variant="compact" />} />
                </div>
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system" className="mt-4 space-y-4">
                <InstanceMetricsChart 
                  data={metricsChartData.length > 0 ? metricsChartData : getMemoryProfile(instanceId)} 
                  height={140} 
                />

                <ProcessViewer
                  processes={update?.processes.list || []}
                  processSummary={update?.processes.summary || undefined}
                  historySnapshots={processSnapshots}
                  isLoadingHistory={isLoadingProcessHistory}
                />

                <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4">
                  <MetricCard label="CPU" icon={<Cpu className="h-3 w-3" />} value={update?.resources.cpu?.count?.toString() || "-"} />
                  <MetricCard label="Workers" icon={<Cog className="h-3 w-3" />} value={update?.diagnostics.workers?.toString() || "-"} />
                  <MetricCard
                    label="Memory"
                    icon={<MemoryStick className="h-3 w-3" />}
                    value={
                      update?.resources.memory
                        ? `${formatBytes(update.resources.memory.usedBytes)} / ${formatBytes(update.resources.memory.totalBytes)}`
                        : "-"
                    }
                    progress={
                      update?.resources.memory
                        ? (update.resources.memory.usedBytes / update.resources.memory.totalBytes) * 100
                        : undefined
                    }
                  />

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-xs text-muted-foreground">Restart</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={handleRestartClick} className="h-8 w-8 p-0">
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Services keep running</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-xs text-muted-foreground">Reboot</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={handleRebootClick} className="h-8 w-8 p-0">
                            <Power className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Services briefly unavailable</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Disks */}
                <div className="rounded-xl border bg-background/40 p-4 mb-6">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {update?.resources.disks && update.resources.disks.length > 0 ? (
                      update.resources.disks.map((d: { totalBytes: number; usedBytes: number; filesystem: any; mountPoint: string; }, idx: any) => {
                        const percent = d.totalBytes > 0 ? (d.usedBytes / d.totalBytes) * 100 : 0;
                        const hasFs = !!update.filesystem;

                        return (
                          <button
                            key={`${idx}-${d.filesystem}`}
                            className={cn(
                              "rounded-md border bg-background/60 p-3 text-left transition-all",
                              hasFs && "cursor-pointer hover:bg-muted/50 hover:border-border active:scale-[0.98]"
                            )}
                            onClick={() => hasFs && setTabState({ tab: "files" })}
                            disabled={!hasFs}
                          >
                            <MetricCard
                              label={d.mountPoint}
                              icon={<HardDrive className="h-3 w-3" />}
                              value={`${formatBytes(d.usedBytes)} / ${formatBytes(d.totalBytes)}`}
                              progress={percent}
                            />
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-sm text-muted-foreground">-</div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Files Tab */}
              {update?.filesystem && (
                <TabsContent value="files" className="mt-4 flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 rounded-xl border bg-background/40 overflow-hidden" style={{ minHeight: "500px" }}>
                    <FileSystemBrowser instanceId={instance?.tag || ""} clusterId={clusterId} fs={update.filesystem} className="h-full" />
                  </div>
                </TabsContent>
              )}

              {/* Config Tab */}
              {canViewConfig && (
                <TabsContent value="config" className="mt-4 space-y-4">
                  <div className="relative rounded-xl border bg-background/40 p-4 mb-6">
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
                          <span className="text-xs text-muted-foreground">Bootstrap token</span>
                          <div className="mt-1 font-mono text-xs">{bootstrapToken ? `${bootstrapToken}...` : "-"}</div>
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={handleRotateTokenClick} disabled={!bootstrapToken}>
                        <RotateCcw className="h-4 w-4" /> Rotate token
                      </Button>

                      <Collapsible open={isCertOpen} onOpenChange={setIsCertOpen}>
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                              {isCertOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                          <span className="text-xs text-muted-foreground">Public key</span>
                        </div>
                        <CollapsibleContent className="mt-2 ml-6">
                          {(instance?.publicKey || "-").split("\n").map((line, idx) => (
                            <div className="font-mono text-xs" key={idx}>{line}</div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Domains section - keeping existing implementation */}
                      <div>
                        <span className="text-xs text-muted-foreground">Domains</span>
                        {domains && domains.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {domains.map(d => {
                              const cooldown = getVerifyCooldown(d.domain);
                              return (
                                <div key={d.id} className="flex items-center justify-between py-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">{d.domain}</span>
                                    <StatusBadge status={d.status} variant="compact" />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {d.status === "pending" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2"
                                        onClick={() => verifyDomain(d.domain)}
                                        disabled={isVerifying || cooldown > 0}
                                      >
                                        {isVerifying ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : cooldown > 0 ? (
                                          `Check Status (${cooldown}s)`
                                        ) : (
                                          "Check Status"
                                        )}
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-destructive hover:text-destructive"
                                      onClick={() => deleteDnsAsync(d.domain)}
                                      disabled={isDeleting}
                                    >
                                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Remove"}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">No domains configured</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input placeholder="example.com" value={domainInput} onChange={e => setDomainInput(e.target.value)} className="flex-1" />
                        <Button
                          onClick={async () => {
                            if (!domainInput.trim()) return;
                            try {
                              await setupDnsAsync({ domain: domainInput, instanceId: instanceId! });
                              setDomainInput("");
                            } catch (error: any) {
                              setError({ message: error?.response?.data?.error || "Failed to setup DNS", helpLink: "" });
                            }
                          }}
                          disabled={isSettingUp || !domainInput.trim()}
                          size="sm"
                          variant="outline"
                        >
                          {isSettingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* DNS Setup Instructions Dialog */}
                  <Dialog open={!!verifySetupDetails} onOpenChange={(open) => !open && clearVerifySetupDetails()}>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Configuration Required</DialogTitle>
                        <DialogDescription>
                          Please configure the DNS records below for <span className="font-semibold font-mono">{verifySetupDetails?.domain}</span>
                        </DialogDescription>
                      </DialogHeader>
                      {verifySetupDetails && (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            {verifySetupDetails.record && (
                              <div>
                                <div className="text-sm font-semibold mb-2">DNS Record (A Record)</div>
                                <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="font-medium">Name</div>
                                    <div className="font-medium">Value</div>
                                    <div className="font-medium">TTL</div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                                    <div className="flex items-center gap-1">
                                      <span className="break-all">{verifySetupDetails?.record?.name}</span>
                                      <button
                                        onClick={() => navigator.clipboard.writeText(verifySetupDetails?.record?.name || "")}
                                        className="shrink-0 p-1 hover:bg-muted rounded"
                                        title="Copy name"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="break-all">{verifySetupDetails?.record?.value}</span>
                                      <button
                                        onClick={() => navigator.clipboard.writeText(verifySetupDetails?.record?.value || "")}
                                        className="shrink-0 p-1 hover:bg-muted rounded"
                                        title="Copy value"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <div>{verifySetupDetails.record.ttl}</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {verifySetupDetails.verification && (
                              <div>
                                <div className="text-sm font-semibold mb-2">Verification Record (TXT Record)</div>
                                <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="font-medium">Name</div>
                                    <div className="font-medium">Value</div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    <div className="flex items-center gap-1">
                                      <span className="break-all">{verifySetupDetails.verification.name}</span>
                                      <button
                                        onClick={() => navigator.clipboard.writeText(verifySetupDetails?.verification?.name || "")}
                                        className="shrink-0 p-1 hover:bg-muted rounded"
                                        title="Copy name"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="break-all">{verifySetupDetails.verification.value}</span>
                                      <button
                                        onClick={() => navigator.clipboard.writeText(verifySetupDetails?.verification?.value || "")}
                                        className="shrink-0 p-1 hover:bg-muted rounded"
                                        title="Copy value"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2">
                            <div className="flex items-center gap-2">
                              {verifySetupDetails.autoSetupUrl && (
                                <Button variant="default" size="sm" asChild>
                                  <a href={verifySetupDetails.autoSetupUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                    Auto Setup
                                  </a>
                                </Button>
                              )}
                              {verifySetupDetails.manualGuideUrl && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={verifySetupDetails.manualGuideUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                    Manual Guide
                                  </a>
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => {
                                  const domain = verifySetupDetails.domain;
                                  clearVerifySetupDetails();
                                  verifyDomain(domain);
                                }}
                                disabled={isVerifying || getVerifyCooldown(verifySetupDetails.domain) > 0}
                              >
                                {isVerifying ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : getVerifyCooldown(verifySetupDetails.domain) > 0 ? (
                                  `Check Status (${getVerifyCooldown(verifySetupDetails.domain)}s)`
                                ) : (
                                  "Check Status"
                                )}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => clearVerifySetupDetails()}>
                                Close
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TabsContent>
              )}

              {/* Logs Tab */}
              {canViewLogs && (
                <TabsContent value="logs" className="mt-4 flex min-h-0 flex-1 flex-col">
                  <LogsWindow
                    logs={logs}
                    filteredLogs={filteredLogs}
                    selectedLevel={selectedLogLevel}
                    setSelectedLevel={level => setTabState({ logLevel: level })}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    logsEndRef={logsEndRef}
                    onScrollPositionChange={handleScrollPositionChange}
                    timeRange={logTimeRange}
                    onTimeRangeChange={range => setTabState({ logRange: range, duration: range })}
                    isStreaming={isStreaming}
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

              {/* Advanced Tab */}
              {canViewAdvanced && (
                <TabsContent value="advanced" className="mt-4 space-y-4">
                  <div className="relative flex min-h-0 flex-1 flex-col gap-3 rounded-xl border bg-background/40 p-4 mb-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-3 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={handleCopyStatus}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <FormattedFile language="json" value={updatePayload ?? status} />
                  </div>
                  
                  {debugEvents.length > 0 && (
                    <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-xl border bg-background/40 p-4">
                      <p className="text-sm font-medium mb-1">Debug events</p>
                      <div className="flex-1 overflow-auto rounded-md bg-neutral-950/90 p-3 text-xs text-neutral-100 space-y-1">
                        {debugEvents.map((evt, idx) => <div key={`${idx}-${evt}`}>{evt}</div>)}
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>

            {/* Dialogs */}
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
                      placeholder={bootstrapToken ? `${bootstrapToken}...` : ""}
                      className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      rows={3}
                    />
                    {rotateError && <FieldError errors={[{ message: rotateError }]} />}
                  </Field>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => { setRotateOpen(false); setRotateValue(""); setRotateError(""); }} disabled={isRotating}>Cancel</Button>
                  <Button size="sm" onClick={handleRotateSubmit} disabled={isRotating || !rotateValue.trim()}>{isRotating ? "Rotating..." : "Rotate"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showBootstrapInfo} onOpenChange={setShowBootstrapInfo}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Bootstrap token rotated</DialogTitle>
                  <DialogDescription>This token will not be shown again. Store it securely.</DialogDescription>
                </DialogHeader>
                {rotatedToken && (
                  <div className="mt-4 flex items-center justify-between rounded-md bg-muted px-3 py-2 font-mono text-xs">
                    <span className="truncate">{rotatedToken}</span>
                    <Button variant="ghost" size="icon" className="ml-2 h-7 w-7" onClick={() => navigator.clipboard.writeText(rotatedToken)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <DialogFooter>
                  <Button size="sm" onClick={() => setShowBootstrapInfo(false)}>Got it</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={restartOpen} onOpenChange={setRestartOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Restart Instance</DialogTitle>
                  <DialogDescription>Restart the dployr daemon. Connection will briefly drop.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="force-restart" checked={forceRestart} onChange={e => setForceRestart(e.target.checked)} className="h-4 w-4 rounded border-input" />
                    <label htmlFor="force-restart" className="text-sm text-muted-foreground">Force restart (skip pending tasks)</label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => { setRestartOpen(false); setForceRestart(false); }} disabled={isRestarting}>Cancel</Button>
                  <Button size="sm" onClick={handleRestartSubmit} disabled={isRestarting}>
                    {isRestarting && <Loader2 className="h-4 w-4 animate-spin" />} Restart
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={rebootOpen} onOpenChange={setRebootOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Reboot Instance</DialogTitle>
                  <DialogDescription>Reboot the instance OS. Services will be briefly unavailable.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="force-reboot" checked={forceReboot} onChange={e => setForceReboot(e.target.checked)} className="h-4 w-4 rounded border-input" />
                    <label htmlFor="force-reboot" className="text-sm text-muted-foreground">Force reboot (skip pending tasks)</label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => { setRebootOpen(false); setForceReboot(false); }} disabled={isRestarting}>Cancel</Button>
                  <Button size="sm" onClick={handleRebootSubmit} disabled={isRestarting}>
                    {isRestarting && <Loader2 className="h-4 w-4 animate-spin" />} Reboot
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
