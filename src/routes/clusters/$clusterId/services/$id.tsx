// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem, type BlueprintFormat, type Runtime, type NormalizedService, denormalize, type InstanceStreamUpdateV1_1 } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/protected-route";
import { ArrowUpRightIcon, ChevronLeft, Edit2, ExternalLink, FileX2, Globe, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useServices } from "@/hooks/use-services";
import { ConfigTable } from "@/components/config-table";
import { useServiceEnv } from "@/hooks/use-service-env";
import { useServiceEditor } from "@/hooks/use-service-editor";
import { useDeploymentCreator } from "@/hooks/use-deployment-creator";
import { MetricCard } from "@/components/metric-card";
import TimeAgo from "react-timeago";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClusters } from "@/hooks/use-clusters";
import { getRuntimeIcon } from "@/lib/runtime-icon";
import { useServiceRemove } from "@/hooks/use-service-remove";
import { ulid } from "ulid";
import { BlueprintSection } from "@/components/blueprint";
import { toJson, toYaml } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { useServiceTabs } from "@/hooks/use-standardized-tabs";
import { useQueryClient } from "@tanstack/react-query";
import type { NormalizedInstanceData } from "@/types";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/clusters/$clusterId/services/$id")({
  component: ViewService,
});

const viewServiceBreadcrumbs = (service: NormalizedService | null, clusterId?: string): BreadcrumbItem[] => {
  const base = clusterId ? `/clusters/${clusterId}/services` : "/services";

  return [
    {
      title: "Services",
      href: base,
    },
    {
      title: service?.name || "",
      href: service?.id ? `${base}/${service.id}` : base,
    },
  ];
};

function ViewService() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // useServices now includes selectedInstanceName from the aggregated data
  const { selectedService: service, selectedInstanceName, isLoading } = useServices();
  const { handleStartCreate } = useDeploymentCreator();
  const { clusterId, userCluster } = useClusters();
  const breadcrumbs = viewServiceBreadcrumbs(service, clusterId);

  // Use standardized tabs hook
  const { currentTab, setTabState } = useServiceTabs();
  const navigate = useNavigate();
  const [blueprintFormat, setBlueprintFormat] = useState<BlueprintFormat>("yaml");

  const { config, editValue, editingKey, setEditValue, handleCancel, handleEdit, handleKeyboardPress, handleSave } = useServiceEnv(service);

  const {
    isEditMode,
    editedName,
    editedDescription,
    setEditedName,
    setEditedDescription,
    handleStartEdit,
    handleCancelEdit,
    handleSave: handleSaveEdit,
  } = useServiceEditor(service, clusterId || "", selectedInstanceName || "");

  const { handleRemoveService } = useServiceRemove();

  // Get instance status for blueprint - now using the instance name from useServices
  const { update } = useInstanceStatus(selectedInstanceName);
  const denormalizedData = useMemo(() => denormalize(update, "v1.1") as InstanceStreamUpdateV1_1 | null, [update]);

  // Get proxy route for this service
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
    return `${service?.name}.${userCluster?.name}.dployr.io`;
  }, [proxyRoute, service?.name, userCluster?.name]);

  const yamlConfig = useMemo(() => {
    if (!denormalizedData?.workloads?.services?.length) return "";
    // Find the specific service in the denormalized data
    const serviceBlueprint = denormalizedData.workloads.services.find((s: any) => s.id === service?.id);
    if (!serviceBlueprint) return "";
    return toYaml(serviceBlueprint);
  }, [denormalizedData, service?.id]);

  const jsonConfig = useMemo(() => {
    if (!denormalizedData?.workloads?.services?.length) return "";
    // Find the specific service in the denormalized data
    const serviceBlueprint = denormalizedData.workloads.services.find((s: any) => s.id === service?.id);
    if (!serviceBlueprint) return "";
    return toJson(serviceBlueprint);
  }, [denormalizedData, service?.id]);

  const handleBlueprintCopy = useCallback(() => {
    const content = blueprintFormat === "yaml" ? yamlConfig : jsonConfig;
    navigator.clipboard.writeText(content);
  }, [blueprintFormat, yamlConfig, jsonConfig]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
          <div className="flex h-full min-h-[500px] items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </EmptyMedia>
                <EmptyTitle>Retrieving Service...</EmptyTitle>
                <EmptyDescription>This shouldn&apos;t take too long! Try refreshing your browser if you see this.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex justify-center gap-2">
                  <Button onClick={handleStartCreate}>Deploy Service</Button>
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

  if (!service) {
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
          <div className="flex h-full min-h-[500px] items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileX2 />
                </EmptyMedia>
                <EmptyTitle>No Service Found!</EmptyTitle>
                <EmptyDescription>The requested service was not found. Please verify the ID and try again.</EmptyDescription>
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
            <Tabs value={currentTab} onValueChange={value => setTabState({ tab: value as any })} className="flex min-h-0 flex-1 flex-col w-full">
              <div className="flex items-center justify-between">
                <TabsList className="flex justify-between w-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="env">Environment</TabsTrigger>
                  <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
                </TabsList>

                <div className="flex gap-3">
                  <Button size="sm" variant="ghost" onClick={() => router.history.back()} className="h-8 px-3 text-muted-foreground">
                    <ChevronLeft /> Back
                  </Button>

                  {currentTab === "overview" && !isEditMode && (
                    <Button size="sm" onClick={handleStartEdit}>
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              <TabsContent value="overview" className="mt-4 space-y-4">
                {!isEditMode ? (
                  <>
                    <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4">
                      <MetricCard label="Name" value={service.name} />
                      <MetricCard label="Port" value={<span className="font-mono">{service.port}</span>} />
                      <MetricCard
                        label="Runtime"
                        value={
                          <div className="flex items-center gap-2">
                            {getRuntimeIcon((service.runtime?.type || "custom") as Runtime)}
                            <span>{service.runtime?.type}</span>
                          </div>
                        }
                      />
                      <MetricCard label="Created" value={<TimeAgo date={service.createdAt} />} />
                    </div>

                    {service.description && (
                      <div className="rounded-xl border bg-background/40 p-2">
                        <div className="px-2 py-1">
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border bg-background/40 p-2">
                      <div className="p-1">
                        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm flex-1">{serviceDomain}</span>
                          <a
                            href={`https://${serviceDomain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-background/40 p-2">
                      <div className="px-2 py-1 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-muted-foreground">Name</Label>
                          <Input id="name" value={editedName} onChange={e => setEditedName(e.target.value)} placeholder="Enter service name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-muted-foreground">Description</Label>
                          <Textarea id="description" value={editedDescription} onChange={e => setEditedDescription(e.target.value)} placeholder="Enter service description" rows={3} />
                        </div>
                        {currentTab === "overview" && isEditMode && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit}>
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background/40 p-2">
                      <div className="px-2 py-1">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <div className="text-base font-semibold">Remove Service</div>
                            <div className="text-sm text-muted-foreground">This will remove the service from the instance. This action cannot be undone.</div>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const result = handleRemoveService(service?.name || "", ulid());
                              if (result.success) {
                                navigate({ to: "/clusters/$clusterId/services", params: { clusterId } });
                              }
                            }}
                          >
                            Stop & Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="env" className="mt-4">
                {config && Object.keys(config).length > 0 ? (
                  <ConfigTable
                    config={config}
                    editingKey={editingKey}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    handleEdit={handleEdit}
                    handleSave={handleSave}
                    handleKeyboardPress={handleKeyboardPress}
                    handleCancel={handleCancel}
                  />
                ) : (
                  <div className="flex h-[400px] items-center justify-center">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <FileX2 />
                        </EmptyMedia>
                        <EmptyTitle>No Environment Variables</EmptyTitle>
                        <EmptyDescription>This service doesn&apos;t have any environment variables configured yet.</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="blueprint" className="mt-4">
                {service ? (
                  <BlueprintSection
                    name={service.name}
                    blueprintFormat={blueprintFormat}
                    yamlConfig={yamlConfig}
                    jsonConfig={jsonConfig}
                    setBlueprintFormat={setBlueprintFormat}
                    handleBlueprintCopy={handleBlueprintCopy}
                  />
                ) : (
                  <div className="flex items-center justify-center p-8 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-muted-foreground">Loading blueprint...</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
