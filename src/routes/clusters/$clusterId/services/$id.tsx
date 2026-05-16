// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem, type BlueprintFormat, type Runtime, type NormalizedService } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/protected-route";
import { ArrowUpRightIcon, ChevronLeft, ExternalLink, FileX2, Globe, Loader2, Plus, Trash2, Copy, Download, CheckCircle2, Clock, XCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useServices } from "@/hooks/use-services";
import { useServiceEnvs } from "@/hooks/use-service-envs";
import { useServiceSecrets } from "@/hooks/use-service-secrets";
import TimeAgo from "react-timeago";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClusters } from "@/hooks/use-clusters";
import { getRuntimeIcon } from "@/lib/runtime-icon";
import { useServiceRemove } from "@/hooks/use-service-remove";
import { KeyValueEditorModal } from "@/components/key-value-editor-modal";
import { toJson, toYaml, cn } from "@/lib/utils";
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

interface BlueprintViewerProps {
  name: string;
  yamlConfig: string;
  jsonConfig: string;
  blueprintFormat: BlueprintFormat;
  setBlueprintFormat: (f: BlueprintFormat) => void;
}

function BlueprintViewer({ name, yamlConfig, jsonConfig, blueprintFormat, setBlueprintFormat }: BlueprintViewerProps) {
  const [copied, setCopied] = useState(false);
  const content = blueprintFormat === "yaml" ? yamlConfig : jsonConfig;
  const lines = content ? content.split("\n") : [];
  const hasContent = content.trim().length > 0;

  const handleCopy = useCallback(() => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.${blueprintFormat === "yaml" ? "yml" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, name, blueprintFormat]);

  return (
    <div className="rounded-xl border bg-background/40 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-muted/20">
        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded-md">{name}</code>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-md border overflow-hidden">
            <button
              onClick={() => setBlueprintFormat("yaml")}
              className={cn("px-2.5 py-1 text-xs transition-colors", blueprintFormat === "yaml" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
            >
              YAML
            </button>
            <button
              onClick={() => setBlueprintFormat("json")}
              className={cn("px-2.5 py-1 text-xs transition-colors border-l", blueprintFormat === "json" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
            >
              JSON
            </button>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCopy} disabled={!hasContent}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload} disabled={!hasContent}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Code area */}
      {hasContent ? (
        <div className="overflow-auto max-h-[600px] bg-muted/20">
          <table className="w-full border-collapse text-xs font-mono">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-muted/40 group">
                  <td className="select-none pr-4 pl-4 py-0 text-right text-muted-foreground/40 w-10 border-r border-border/40 group-hover:text-muted-foreground/70 leading-5 align-top">
                    {i + 1}
                  </td>
                  <td className="pl-4 pr-6 py-0 text-foreground leading-5 whitespace-pre">
                    {line || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-muted-foreground">No blueprint data</p>
          <p className="text-xs text-muted-foreground/60">Connect an instance to generate the service blueprint</p>
        </div>
      )}
    </div>
  );
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

  // Service editor state (now lives in Settings)
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Env vars
  const { envs: allEnvs, setEnvs } = useServiceEnvs(service?.id ?? null);
  const { secrets, setSecrets } = useServiceSecrets(service?.id ?? null);

  // Custom domains
  const [newDomain, setNewDomain] = useState("");
  const [customDomains, setCustomDomains] = useState<{ domain: string; status: "pending" | "active" | "failed" }[]>([]);
  const domainLimit = DOMAIN_LIMITS[plan?.toLowerCase() ?? "hobby"] ?? 1;

  const handleAddDomain = useCallback(() => {
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed || customDomains.some(d => d.domain === trimmed)) return;
    setCustomDomains(prev => [...prev, { domain: trimmed, status: "pending" }]);
    setNewDomain("");
  }, [newDomain, customDomains]);

  const { handleRemoveService } = useServiceRemove();

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
    if (proxyRoute?.domain) return proxyRoute.domain;
    return `${service?.name}.dployr.run`;
  }, [proxyRoute, service?.name]);

  // Build a clean Blueprint-schema object — no id, timestamps, or raw internals
  const blueprintData = useMemo(() => {
    if (!service) return null;
    const bp: Record<string, unknown> = {
      name: service.name,
      type: service.type,
      source: service.source,
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
    if (service.runCmd) bp.run_cmd = service.runCmd;
    if (service.buildCmd) bp.build_cmd = service.buildCmd;
    if (service.workingDir) bp.working_dir = service.workingDir;
    if (service.port) bp.port = service.port;
    if (allEnvs && Object.keys(allEnvs).length > 0) bp.env_vars = allEnvs;
    return bp;
  }, [service, allEnvs]);

  const yamlConfig = useMemo(() => blueprintData ? toYaml(blueprintData) : "", [blueprintData]);
  const jsonConfig = useMemo(() => blueprintData ? toJson(blueprintData) : "", [blueprintData]);

  // Traffic
  const { trafficData, totals, isLoading: isTrafficLoading } = useServiceTraffic(service?.name ?? null, clusterId);

  // Logs
  const { logs, filteredLogs, searchQuery, logsEndRef, isStreaming, setSearchQuery, handleScrollPositionChange } = useServiceLogs(
    service?.id,
    service?.name,
    selectedInstanceName ?? undefined,
    { currentTab, logTimeRange, selectedLogLevel, logDuration }
  );

  // Sync editor fields when service loads
  useEffect(() => {
    if (service) {
      setEditedName(service.name ?? "");
      setEditedDescription(service.description ?? "");
    }
  }, [service?.id]);

  if (!service) {
    if (isInstancesLoading) return null;
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
          <div className="flex h-full min-h-[500px] items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><FileX2 /></EmptyMedia>
                <EmptyTitle>No Service Found</EmptyTitle>
                <EmptyDescription>The requested service was not found. Verify the ID and try again.</EmptyDescription>
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

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full min-h-0 flex-col gap-4 rounded-xl">
          <div className="flex min-h-0 flex-1 auto-rows-min flex-col gap-6 px-9 py-2">
            <Tabs value={currentTab} onValueChange={value => setTabState({ tab: value as any })} className="flex min-h-0 flex-1 flex-col w-full">
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
                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{service.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                      <span>Port <span className="font-mono text-foreground">{service.port ?? 3000}</span></span>
                      <span className="text-border">·</span>
                      <TimeAgo date={service.createdAt} />
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
                    values={allEnvs}
                    onChange={newEnvs => setEnvs.mutate(newEnvs)}
                  />
                  <KeyValueEditorModal
                    title="Secrets"
                    description="Add sensitive values like API keys and passwords. These are encrypted at rest."
                    triggerLabel="Configure Secrets"
                    values={secrets}
                    isSecret
                    onChange={newSecrets => setSecrets.mutate(newSecrets)}
                  />
                </div>
              </TabsContent>

              {/* ── Settings ── */}
              <TabsContent value="settings" className="mt-4 space-y-4 overflow-y-auto pb-6">
                {/* Service details */}
                <div className="rounded-xl border bg-background/40 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/20">
                    <p className="text-sm font-medium">Service Details</p>
                  </div>
                  <div className="px-4 py-4 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="svc-name" className="text-xs text-muted-foreground">Name</Label>
                      <Input
                        id="svc-name"
                        value={editedName}
                        onChange={e => setEditedName(e.target.value)}
                        placeholder="Service name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="svc-desc" className="text-xs text-muted-foreground">Description</Label>
                      <Textarea
                        id="svc-desc"
                        value={editedDescription}
                        onChange={e => setEditedDescription(e.target.value)}
                        placeholder="Optional description"
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={isSavingDetails}
                        onClick={async () => {
                          setIsSavingDetails(true);
                          // wire up to service update API
                          setIsSavingDetails(false);
                        }}
                      >
                        {isSavingDetails ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Custom domains */}
                <div className="rounded-xl border bg-background/40 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                    <div>
                      <p className="text-sm font-medium">Custom Domains</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {domainLimit} domain{domainLimit !== 1 ? "s" : ""} on the <span className="capitalize">{plan}</span> plan
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{plan}</Badge>
                  </div>

                  <div className="px-4 py-3 space-y-3">
                    {/* Default domain */}
                    <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs flex-1 text-muted-foreground">{serviceDomain}</span>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">default</Badge>
                      <a href={`https://${serviceDomain}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {/* Custom domain list */}
                    {customDomains.map(({ domain, status }) => (
                      <div key={domain} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                        <StatusDot status={status} />
                        <span className="font-mono text-xs flex-1">{domain}</span>
                        <Badge variant={status === "active" ? "default" : status === "failed" ? "destructive" : "secondary"} className="text-[10px] py-0 px-1.5">
                          {status}
                        </Badge>
                        <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setCustomDomains(p => p.filter(d => d.domain !== domain))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Add domain */}
                    {customDomains.length < domainLimit ? (
                      <div className="flex gap-2 pt-1">
                        <Input
                          placeholder="yourdomain.com"
                          value={newDomain}
                          onChange={e => setNewDomain(e.target.value)}
                          className="font-mono text-xs h-8"
                          onKeyDown={e => { if (e.key === "Enter") handleAddDomain(); }}
                        />
                        <Button size="sm" className="h-8 shrink-0" onClick={handleAddDomain} disabled={!newDomain.trim()}>
                          <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground pt-1">
                        Domain limit reached.{" "}
                        <a href={`/clusters/${clusterId}/settings/billing`} className="underline underline-offset-2 hover:text-foreground">
                          Upgrade your plan
                        </a>{" "}
                        to add more.
                      </p>
                    )}
                  </div>
                </div>

                {/* Danger zone */}
                <div className="rounded-xl border border-destructive/30 bg-background/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-destructive/20 bg-destructive/5">
                    <p className="text-sm font-medium text-destructive">Danger Zone</p>
                  </div>
                  <div className="px-4 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Remove Service</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Stops and removes this service from the instance. This cannot be undone.</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="shrink-0"
                      onClick={async () => {
                        const result = await handleRemoveService(service?.id || "");
                        if (result.success) {
                          navigate({ to: "/clusters/$clusterId/services", params: { clusterId } });
                        }
                      }}
                    >
                      Decommission
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ── Blueprint ── */}
              <TabsContent value="blueprint" className="mt-4">
                <BlueprintViewer
                  name={service.name}
                  blueprintFormat={blueprintFormat}
                  yamlConfig={yamlConfig}
                  jsonConfig={jsonConfig}
                  setBlueprintFormat={setBlueprintFormat}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
