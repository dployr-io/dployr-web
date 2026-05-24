// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useNavigate, useRouter, useBlocker } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem, type BlueprintFormat, type Runtime, type NormalizedService } from "@/types";
import { runtimes } from "@/types/runtimes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProtectedRoute } from "@/components/protected-route";
import { ArrowUpRightIcon, ChevronLeft, ExternalLink, FileX2, Globe, Loader2, Plus, Trash2, CheckCircle2, Clock, XCircle, Square, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useServices } from "@/hooks/use-services";
import TimeAgo from "react-timeago";
import { Input } from "@/components/ui/input";
import { useClusters } from "@/hooks/use-clusters";
import { getRuntimeIcon } from "@/lib/runtime-icon";
import { useServiceRemove } from "@/hooks/use-service-remove";
import { useServiceStop } from "@/hooks/use-service-stop";
import { useServiceUpdate } from "@/hooks/use-service-update";
import { KeyValueEditorModal } from "@/components/key-value-editor-modal";
import { toJson, toYaml } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { useServiceTabs } from "@/hooks/use-standardized-tabs";
import { useQueryClient } from "@tanstack/react-query";
import type { NormalizedInstanceData } from "@/types";
import { Label } from "@/components/ui/label";
import { LogsWindow } from "@/components/logs-window";
import { useServiceLogs } from "@/hooks/use-standardized-logs";
import { useServiceTraffic } from "@/hooks/use-service-traffic";
import { ServiceTrafficChart } from "@/components/service-traffic-chart";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { Badge } from "@/components/ui/badge";
import { BlueprintViewer } from "@/components/blueprint-viewer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDns } from "@/hooks/use-dns";
import { DomainConnectDialog } from "@/components/domain-connect-dialog";

export const Route = createFileRoute("/clusters/$clusterId/services/$id")({
  component: ViewService,
});

const DOMAIN_LIMITS: Record<string, number> = { hobby: 1, indie: 10, pro: 25 };

const viewServiceBreadcrumbs = (service: NormalizedService | null, clusterId?: string): BreadcrumbItem[] => {
  const base = clusterId ? `/clusters/${clusterId}/services` : "/services";
  return [
    { title: "Services", href: base },
    { title: service?.name || "", href: service?.id ? `${base}/${service.id}` : base },
  ];
};

function StatusDot({ status }: { status: "pending" | "active" | "failed" }) {
  if (status === "active") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
  return <Clock className="h-3.5 w-3.5 text-yellow-500 animate-pulse shrink-0" />;
}

function ViewService() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedService: _service, selectedInstanceName, isInstancesLoading, allServices } = useServices();

  // Hold the last valid service so the page never briefly unmounts during stream re-syncs
  // (e.g. a workloads broadcast arriving with node-internal IDs before enrichment propagates,
  // or the list momentarily going empty while the delta settles). We clear the ref only when
  // the service list has actually loaded and the service is genuinely absent from it.
  const lastServiceRef = useRef<typeof _service>(null);
  if (_service) lastServiceRef.current = _service;
  const service = _service ?? (allServices.length > 0 ? null : lastServiceRef.current);

  const { clusterId } = useClusters();
  const breadcrumbs = viewServiceBreadcrumbs(service, clusterId);
  const { plan } = usePlanFeatures();

  const { currentTab, setTabState, logTimeRange, selectedLogLevel, logDuration } = useServiceTabs();
  const navigate = useNavigate();
  const [blueprintFormat, setBlueprintFormat] = useState<BlueprintFormat>("yaml");

  // Service editor state
  const [editedDescription, setEditedDescription] = useState("");
  const [editedRunCmd, setEditedRunCmd] = useState("");
  const [editedBuildCmd, setEditedBuildCmd] = useState("");
  const [editedPort, setEditedPort] = useState<string>("");
  const [editedWorkingDir, setEditedWorkingDir] = useState("");
  const [editedStaticDir, setEditedStaticDir] = useState("");
  const [editedRuntime, setEditedRuntime] = useState("");
  const [editedVersion, setEditedVersion] = useState("");
  const updateService = useServiceUpdate(service?.name ?? null);

  // Tracks the last values committed to the server so hasChanges clears immediately
  // on save success rather than waiting for the websocket to push back updated state.
  const [originalValues, setOriginalValues] = useState({ description: "", runCmd: "", buildCmd: "", port: "", workingDir: "", staticDir: "", runtime: "", version: "" });

  const hasChanges = useMemo(() => (
    editedDescription !== originalValues.description ||
    editedRunCmd !== originalValues.runCmd ||
    editedBuildCmd !== originalValues.buildCmd ||
    editedPort !== originalValues.port ||
    editedWorkingDir !== originalValues.workingDir ||
    editedStaticDir !== originalValues.staticDir ||
    editedRuntime !== originalValues.runtime ||
    editedVersion !== originalValues.version
  ), [editedDescription, editedRunCmd, editedBuildCmd, editedPort, editedWorkingDir, editedStaticDir, editedRuntime, editedVersion, originalValues]);

  // Unsaved changes guard
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null);

  const handleTabChange = useCallback(
    (value: string) => {
      if (currentTab === "settings" && hasChanges && value !== "settings") {
        setPendingTabChange(value);
        setUnsavedOpen(true);
      } else {
        setTabState({ tab: value as any });
      }
    },
    [currentTab, hasChanges, setTabState]
  );

  // Block SPA navigation when there are unsaved changes
  const {
    proceed: proceedNavigation,
    reset: resetNavigation,
    status: blockerStatus,
  } = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      hasChanges && next.pathname !== current.pathname,
    withResolver: true,
  });

  // Block browser-level navigation (refresh, close tab)
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  // Custom domains
  const [newDomain, setNewDomain] = useState("");
  const [dnsDialogOpen, setDnsDialogOpen] = useState(false);
  const domainLimit = DOMAIN_LIMITS[plan?.toLowerCase() ?? "hobby"] ?? 1;
  const { domains: allDomains, setupDns, isSettingUp, setupDetails, stopPolling, deleteDns, isDeleting: isDeletingDomain, verifyDomain, isVerifying, getVerifyCooldown } = useDns();
  const customDomains = allDomains.filter(d => d.serviceName === service?.name);

  // Domain delete confirmation
  const [deleteDomainTarget, setDeleteDomainTarget] = useState<string | null>(null);
  const [deleteDomainConfirm, setDeleteDomainConfirm] = useState("");
  const handleDeleteDomain = useCallback(() => {
    if (!deleteDomainTarget || deleteDomainConfirm !== deleteDomainTarget) return;
    deleteDns(deleteDomainTarget, {
      onSettled: () => {
        setDeleteDomainTarget(null);
        setDeleteDomainConfirm("");
      },
    });
  }, [deleteDomainTarget, deleteDomainConfirm, deleteDns]);

  const handleAddDomain = useCallback(() => {
    if (!service?.name) return;
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed) return;
    setupDns(
      { domain: trimmed, serviceName: service.name },
      {
        onSuccess: () => {
          setNewDomain("");
          setDnsDialogOpen(true);
        },
      }
    );
  }, [newDomain, service?.name, setupDns]);

  const { handleRemoveService } = useServiceRemove();
  const { stop: stopService, start: startService } = useServiceStop(service?.name ?? null);

  // Stop confirmation
  const [stopOpen, setStopOpen] = useState(false);
  const [stopConfirm, setStopConfirm] = useState("");
  const [isStopped, setIsStopped] = useState(() => service?.status === "sleeping");
  useEffect(() => {
    if (service?.status) setIsStopped(service.status === "sleeping");
  }, [service?.status]);

  const handleStop = useCallback(() => {
    if (!service || stopConfirm !== service.name) return;
    stopService.mutate(undefined, {
      onSuccess: () => setIsStopped(true),
      onSettled: () => {
        setStopOpen(false);
        setStopConfirm("");
      },
    });
  }, [service, stopConfirm, stopService]);

  const handleStart = useCallback(() => {
    startService.mutate(undefined, {
      onSuccess: () => setIsStopped(false),
    });
  }, [startService]);

  // Decommission confirmation
  const [decommissionOpen, setDecommissionOpen] = useState(false);
  const [decommissionConfirm, setDecommissionConfirm] = useState("");
  const handleDecommission = useCallback(async () => {
    if (!service || !service.name || decommissionConfirm !== service.name) return;
    const result = await handleRemoveService(service.name);
    setDecommissionOpen(false);
    setDecommissionConfirm("");
    if (result.success) {
      navigate({ to: "/clusters/$clusterId/services", params: { clusterId: clusterId! } });
    }
  }, [service, decommissionConfirm, handleRemoveService, navigate, clusterId]);

  const handleSaveDetails = useCallback(() => {
    if (!service || !selectedInstanceName) return;
    const snapshot = { description: editedDescription, runCmd: editedRunCmd, buildCmd: editedBuildCmd, port: editedPort, workingDir: editedWorkingDir, staticDir: editedStaticDir, runtime: editedRuntime, version: editedVersion };
    updateService.mutate({
      instanceName: selectedInstanceName,
      description: editedDescription || null,
      run_cmd: editedRunCmd || null,
      build_cmd: editedBuildCmd || null,
      port: editedPort ? Number(editedPort) : null,
      working_dir: editedWorkingDir || null,
      static_dir: editedStaticDir || null,
      runtime: editedRuntime || null,
      version: editedVersion || null,
    }, {
      onSuccess: () => setOriginalValues(snapshot),
    });
  }, [service, selectedInstanceName, updateService, editedDescription, editedRunCmd, editedBuildCmd, editedPort, editedWorkingDir, editedStaticDir, editedRuntime, editedVersion]);

  useInstanceStatus(selectedInstanceName);
  const proxyRoute = useMemo(() => {
    if (!selectedInstanceName || !service) return null;
    const instanceData = queryClient.getQueryData<NormalizedInstanceData>(["instance-status", selectedInstanceName]);
    if (!instanceData?.proxy?.routes) return null;
    return (
      instanceData.proxy.routes.find(route => {
        const upstreamPort = route.upstream?.match(/:([\d]+)/)?.[1];
        return route.domain.includes(service.name) || route.upstream?.includes(service.name) || upstreamPort === String(service.port);
      }) || null
    );
  }, [selectedInstanceName, service, queryClient]);

  const serviceDomain = useMemo(() => {
    const customDomain = customDomains.find(d => d.status === "active");
    if (customDomain) return customDomain.domain;
    if (proxyRoute?.domain) return proxyRoute.domain;
    return `${service?.name}.dployr.run`;
  }, [customDomains, proxyRoute, service?.name]);

  // Build a clean Blueprint-schema object — no id, timestamps, or raw internals
  const blueprintData = useMemo(() => {
    if (!service) return null;
    const bp: Record<string, unknown> = {
      name: service.name,
      type: service.type,
      source: service.remote?.url ? "remote" : service.image ? "image" : (service.source ?? "remote"),
      runtime: {
        type: service.runtime?.type,
        ...(service.runtime?.version ? { version: service.runtime.version } : {}),
      },
    };
    if (service.description) bp.description = service.description;
    if (service.remote) {
      bp.remote = {
        url: service.remote.url,
        branch: service.remote.branch,
      };
    }
    if (service.image) bp.image = service.image;
    if (service.runCmd) bp.run_cmd = service.runCmd;
    if (service.buildCmd) bp.build_cmd = service.buildCmd;
    if (service.workingDir) bp.working_dir = service.workingDir;
    if (service.staticDir) bp.static_dir = service.staticDir;
    if (service.port) bp.port = service.port;
    if (service.envVars && Object.keys(service.envVars).length > 0) bp.env_vars = service.envVars;
    if (service.secrets && service.secrets.length > 0) {
      bp.secrets = Object.fromEntries(service.secrets.map(s => [s.key, "***"]));
    }
    return bp;
  }, [service]);

  const yamlConfig = useMemo(() => (blueprintData ? toYaml(blueprintData) : ""), [blueprintData]);
  const jsonConfig = useMemo(() => (blueprintData ? toJson(blueprintData) : ""), [blueprintData]);

  // Traffic
  const { trafficData, totals, isLoading: isTrafficLoading } = useServiceTraffic(service?.name ?? null, clusterId);

  // Logs
  const { logs, filteredLogs, searchQuery, logsEndRef, isStreaming, setSearchQuery, handleScrollPositionChange } = useServiceLogs(service?.id, service?.name, selectedInstanceName ?? undefined, {
    currentTab,
    logTimeRange,
    selectedLogLevel,
    logDuration,
  });

  useEffect(() => {
    if (!service) return;
    const vals = {
      description: service.description ?? "",
      runCmd: service.runCmd ?? "",
      buildCmd: service.buildCmd ?? "",
      port: service.port ? String(service.port) : "",
      workingDir: service.workingDir ?? "",
      staticDir: service.staticDir ?? "",
      runtime: service.runtime?.type ?? "",
      version: service.runtime?.version ?? "",
    };
    setOriginalValues(vals);
    setEditedDescription(vals.description);
    setEditedRunCmd(vals.runCmd);
    setEditedBuildCmd(vals.buildCmd);
    setEditedPort(vals.port);
    setEditedWorkingDir(vals.workingDir);
    setEditedStaticDir(vals.staticDir);
    setEditedRuntime(vals.runtime);
    setEditedVersion(vals.version);
  }, [service?.id]);

  if (!service) {
    if (isInstancesLoading) return null;
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
          <div className="flex h-full min-h-[500px] items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileX2 />
                </EmptyMedia>
                <EmptyTitle>No Service Found</EmptyTitle>
                <EmptyDescription>The requested service was not found. Verify the ID and try again.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => router.history.back()}>
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

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full min-h-0 flex-col gap-4 rounded-xl">
          <div className="flex min-h-0 flex-1 auto-rows-min flex-col gap-6 px-9 py-2">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col w-full">
              <div className="flex items-center justify-between">
                <TabsList className="flex justify-between w-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="env">Environment</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
                </TabsList>
                <Button size="sm" variant="ghost" onClick={() => router.history.back()} className="h-8 px-3 text-muted-foreground">
                  <ChevronLeft /> Back
                </Button>
              </div>

              {/* ── Overview ── */}
              <TabsContent value="overview" className="mt-4 space-y-3">
                <div className="rounded-xl border bg-background/40 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{getRuntimeIcon((service.runtime?.type || "custom") as Runtime)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <h2 className="text-base font-semibold shrink-0">{service.name}</h2>
                        <span className="text-border shrink-0">·</span>
                        <a
                          href={`https://${serviceDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-4 truncate"
                        >
                          <Globe className="h-3 w-3 shrink-0" />
                          {serviceDomain}
                          <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />
                        </a>
                      </div>
                      {service.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{service.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                      <span>
                        Port <span className="font-mono text-foreground">{service.port ?? 3000}</span>
                      </span>
                      <span className="text-border">·</span>
                      {service.createdAt && <TimeAgo date={service.createdAt} />}
                    </div>
                  </div>
                </div>

                {/* Traffic metrics */}
                <ServiceTrafficChart data={trafficData} totals={totals} isLoading={isTrafficLoading} />
              </TabsContent>

              {/* ── Logs ── */}
              <TabsContent value="logs" className="flex min-h-0 flex-1 flex-col mt-4">
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
                  showTimeFilter={false}
                />
              </TabsContent>

              {/* ── Environment ── */}
              <TabsContent value="env" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <KeyValueEditorModal
                    title="Environment Variables"
                    description="Add environment variables that will be available at runtime."
                    triggerLabel="Configure Environment Variables"
                    values={service.envVars as Record<string, string>}
                    onChange={newEnvs => {
                      if (!selectedInstanceName) return;
                      updateService.mutate({ instanceName: selectedInstanceName, env_vars: newEnvs });
                    }}
                  />
                  <KeyValueEditorModal
                    title="Secrets"
                    description="Add sensitive values like API keys and passwords. These are encrypted at rest."
                    triggerLabel="Configure Secrets"
                    values={Object.fromEntries((service.secrets ?? []).map(s => [s.key, ""]))}
                    isSecret
                    onChange={newSecrets => {
                      if (!selectedInstanceName) return;
                      const toWrite = Object.fromEntries(Object.entries(newSecrets).filter(([, v]) => v !== ""));
                      const keep_secret_keys = Object.entries(newSecrets)
                        .filter(([, v]) => v === "")
                        .map(([k]) => k);
                      updateService.mutate({ instanceName: selectedInstanceName, secrets: toWrite, keep_secret_keys });
                    }}
                  />
                </div>
              </TabsContent>

              {/* ── Settings ── */}
              <TabsContent value="settings" className="mt-4 space-y-3 pb-4">
                {/* Configuration */}
                <div className="rounded-xl border bg-background/40 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
                    <p className="text-sm font-medium">Configuration</p>
                    {hasChanges && (
                      <Button size="sm" className="h-7 text-xs" disabled={updateService.isPending || !selectedInstanceName} onClick={handleSaveDetails}>
                        {updateService.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save & Redeploy"}
                      </Button>
                    )}
                  </div>
                  <div className="px-4 py-4 grid grid-cols-4 gap-x-4 gap-y-3">
                    <div className="col-span-3 space-y-1.5">
                      <Label htmlFor="svc-desc" className="text-xs text-muted-foreground">
                        Description
                      </Label>
                      <Input id="svc-desc" value={editedDescription} onChange={e => setEditedDescription(e.target.value)} placeholder="Optional description" className="text-sm" />
                    </div>
                    <div className="col-span-1 space-y-1.5">
                      <Label htmlFor="svc-port" className="text-xs text-muted-foreground">
                        Port
                      </Label>
                      <Input id="svc-port" type="number" value={editedPort} onChange={e => setEditedPort(e.target.value)} placeholder="3000" className="font-mono text-xs" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="svc-run-cmd" className="text-xs text-muted-foreground">
                        Run Command
                      </Label>
                      <Input id="svc-run-cmd" value={editedRunCmd} onChange={e => setEditedRunCmd(e.target.value)} placeholder="node dist/index.js" className="font-mono text-xs" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="svc-build-cmd" className="text-xs text-muted-foreground">
                        Build Command
                      </Label>
                      <Input id="svc-build-cmd" value={editedBuildCmd} onChange={e => setEditedBuildCmd(e.target.value)} placeholder="npm run build" className="font-mono text-xs" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="svc-static-dir" className="text-xs text-muted-foreground">
                        Static Directory
                      </Label>
                      <Input id="svc-static-dir" value={editedStaticDir} onChange={e => setEditedStaticDir(e.target.value)} placeholder="dist" className="font-mono text-xs" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="svc-working-dir" className="text-xs text-muted-foreground">
                        Working Directory
                      </Label>
                      <Input id="svc-working-dir" value={editedWorkingDir} onChange={e => setEditedWorkingDir(e.target.value)} placeholder="/app" className="font-mono text-xs" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Runtime</Label>
                      <Select value={editedRuntime} onValueChange={setEditedRuntime}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select runtime">
                            {editedRuntime && (
                              <div className="flex items-center gap-2">
                                {getRuntimeIcon(editedRuntime as Runtime)}
                                <span className="font-mono">{editedRuntime}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {runtimes.map(r => (
                            <SelectItem key={r} value={r} className="text-xs">
                              <div className="flex items-center gap-2">
                                {getRuntimeIcon(r as Runtime)}
                                <span className="font-mono">{r}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="svc-version" className="text-xs text-muted-foreground">
                        Runtime Version
                      </Label>
                      <Input id="svc-version" value={editedVersion} onChange={e => setEditedVersion(e.target.value)} placeholder="e.g. 20, 3.11" className="font-mono text-xs" />
                    </div>
                  </div>
                </div>

                {/* Domains */}
                <div className="rounded-xl border bg-background/40 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
                    <p className="text-sm font-medium">Domains</p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {plan}
                    </Badge>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs flex-1 text-muted-foreground">{serviceDomain}</span>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                        default
                      </Badge>
                      <a href={`https://${serviceDomain}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    {customDomains.map(({ domain, status }) => {
                      const cooldown = getVerifyCooldown(domain);
                      return (
                        <div key={domain} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                          <StatusDot status={status} />
                          <span className="font-mono text-xs flex-1 truncate">{domain}</span>
                          <Badge variant={status === "active" ? "default" : "secondary"} className="text-[10px] py-0 px-1.5">
                            {status}
                          </Badge>
                          {status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2"
                              disabled={isVerifying || cooldown > 0}
                              onClick={() => verifyDomain(domain)}
                            >
                              {cooldown > 0 ? `${cooldown}s` : "Verify"}
                            </Button>
                          )}
                          <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setDeleteDomainTarget(domain)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                    {customDomains.length < domainLimit ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="yourdomain.com"
                          value={newDomain}
                          onChange={e => setNewDomain(e.target.value)}
                          className="font-mono text-xs h-8"
                          onKeyDown={e => {
                            if (e.key === "Enter") handleAddDomain();
                          }}
                          disabled={isSettingUp}
                        />
                        <Button size="sm" className="h-8 shrink-0" onClick={handleAddDomain} disabled={!newDomain.trim() || isSettingUp}>
                          {isSettingUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5" /> Add</>}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Domain limit reached.{" "}
                        <a href={`/clusters/${clusterId}/settings/billing`} className="underline underline-offset-2 hover:text-foreground">
                          Upgrade your plan
                        </a>{" "}
                        to add more.
                      </p>
                    )}
                  </div>
                </div>

                {/* Service actions */}
                <div className="rounded-xl border bg-background/40 px-4 py-2.5 flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-2">Controls</span>
                  <div className="h-3.5 w-px bg-border mx-0.5" />
                  {!isStopped && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" disabled={!selectedInstanceName || !service} onClick={() => setStopOpen(true)}>
                      <Square className="h-3 w-3" /> Stop
                    </Button>
                  )}
                  {isStopped && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" disabled={startService.isPending || !selectedInstanceName || !service} onClick={handleStart}>
                      {startService.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                      Start
                    </Button>
                  )}
                  <div className="h-3.5 w-px bg-border mx-1" />
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDecommissionOpen(true)}>
                    Decommission
                  </Button>
                </div>
              </TabsContent>

              {/* ── Blueprint ── */}
              <TabsContent value="blueprint" className="mt-4">
                <BlueprintViewer name={service.name} blueprintFormat={blueprintFormat} yamlConfig={yamlConfig} jsonConfig={jsonConfig} setBlueprintFormat={setBlueprintFormat} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Stop confirmation dialog */}
        <Dialog
          open={stopOpen}
          onOpenChange={open => {
            setStopOpen(open);
            if (!open) setStopConfirm("");
          }}
        >
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Stop service</DialogTitle>
              <DialogDescription>
                This will stop <span className="font-mono font-medium text-foreground">{service.name}</span> and take it offline until you start it again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-1">
              <p className="text-sm text-muted-foreground">
                Type <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{service.name}</span> to confirm.
              </p>
              <Input
                value={stopConfirm}
                onChange={e => setStopConfirm(e.target.value)}
                placeholder={service.name}
                className="font-mono text-sm"
                onKeyDown={e => {
                  if (e.key === "Enter" && stopConfirm === service.name) handleStop();
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStopOpen(false);
                  setStopConfirm("");
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" size="sm" disabled={stopConfirm !== service.name || stopService.isPending} onClick={handleStop}>
                {stopService.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Stop service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decommission confirmation dialog */}
        <Dialog
          open={decommissionOpen}
          onOpenChange={open => {
            setDecommissionOpen(open);
            if (!open) setDecommissionConfirm("");
          }}
        >
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Decommission service</DialogTitle>
              <DialogDescription>
                This permanently stops and removes <span className="font-mono font-medium text-foreground">{service.name}</span> from your instance. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-1">
              <p className="text-sm text-muted-foreground">
                Type <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{service.name}</span> to confirm.
              </p>
              <Input
                value={decommissionConfirm}
                onChange={e => setDecommissionConfirm(e.target.value)}
                placeholder={service.name}
                className="font-mono text-sm"
                onKeyDown={e => {
                  if (e.key === "Enter" && decommissionConfirm === service.name) handleDecommission();
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDecommissionOpen(false);
                  setDecommissionConfirm("");
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" size="sm" disabled={decommissionConfirm !== service.name} onClick={handleDecommission}>
                Decommission
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Domain delete confirmation dialog */}
        <Dialog
          open={!!deleteDomainTarget}
          onOpenChange={open => {
            if (!open) { setDeleteDomainTarget(null); setDeleteDomainConfirm(""); }
          }}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Remove domain?</DialogTitle>
              <DialogDescription>
                This will remove <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{deleteDomainTarget}</span> and the service will no longer be reachable through it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-1">
              <p className="text-sm text-muted-foreground">
                Type <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{deleteDomainTarget}</span> to confirm.
              </p>
              <Input
                value={deleteDomainConfirm}
                onChange={e => setDeleteDomainConfirm(e.target.value)}
                placeholder={deleteDomainTarget ?? ""}
                className="font-mono text-sm"
                onKeyDown={e => { if (e.key === "Enter" && deleteDomainConfirm === deleteDomainTarget) handleDeleteDomain(); }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => { setDeleteDomainTarget(null); setDeleteDomainConfirm(""); }}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" disabled={deleteDomainConfirm !== deleteDomainTarget || isDeletingDomain} onClick={handleDeleteDomain}>
                {isDeletingDomain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Remove domain"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unsaved changes — tab switch */}
        <Dialog open={unsavedOpen} onOpenChange={setUnsavedOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Undeployed changes</DialogTitle>
              <DialogDescription>You have configuration changes that haven't been deployed yet. Leave this tab without saving?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setUnsavedOpen(false)}>
                Stay
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setUnsavedOpen(false);
                  if (pendingTabChange) {
                    setTabState({ tab: pendingTabChange as any });
                    setPendingTabChange(null);
                  }
                }}
              >
                Leave anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unsaved changes — SPA navigation */}
        <Dialog
          open={blockerStatus === "blocked"}
          onOpenChange={open => {
            if (!open) resetNavigation?.();
          }}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Undeployed changes</DialogTitle>
              <DialogDescription>You have configuration changes that haven't been deployed yet. Leave this page without saving?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => resetNavigation?.()}>
                Stay
              </Button>
              <Button variant="destructive" size="sm" onClick={() => proceedNavigation?.()}>
                Leave anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      <DomainConnectDialog
        setupDetails={setupDetails}
        domains={allDomains}
        open={dnsDialogOpen}
        onOpenChange={open => { setDnsDialogOpen(open); if (!open) stopPolling(); }}
      />
      </AppLayout>
    </ProtectedRoute>
  );
}
