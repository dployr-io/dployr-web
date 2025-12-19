// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, Service } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/protected-route";
import { ArrowUpRightIcon, ChevronLeft, CirclePlus, FileX2, Globe, Loader2, Network, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useServices } from "@/hooks/use-services";
import { ConfigTable } from "@/components/config-table";
import { useEnv } from "@/hooks/use-env";
import { useDeploymentCreator } from "@/hooks/use-deployment-creator";
import { useUrlState } from "@/hooks/use-url-state";
import { MetricCard } from "@/components/metric-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import TimeAgo from "react-timeago";
import { useClusters } from "@/hooks/use-clusters";

export const Route = createFileRoute("/clusters/$clusterId/services/$id")({
  component: ViewService,
});

const viewServiceBreadcrumbs = (service: Service | null, clusterId?: string): BreadcrumbItem[] => {
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
  const { selectedService: service, isLoading } = useServices();
  const { handleStartCreate } = useDeploymentCreator();
  const { clusterId, userCluster } = useClusters();
  const breadcrumbs = viewServiceBreadcrumbs(service, clusterId);
  const { useServiceTabsState } = useUrlState();
  const [{ tab }, setTabState] = useServiceTabsState();
  const currentTab = (tab || "overview") as "overview" | "logs" | "env" | "settings";

  const { config, editValue, editingKey, setEditValue, handleCancel, handleEdit, handleKeyboardPress, handleSave } = useEnv();

  // Settings form state
  const [serviceName, setServiceName] = useState(service?.name || "");
  const [servicePort, setServicePort] = useState(service?.port?.toString() || "");
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddDomain = () => {
    if (newDomain.trim() && !domains.includes(newDomain.trim())) {
      setDomains([...domains, newDomain.trim()]);
      setNewDomain("");
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setDomains(domains.filter(d => d !== domain));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    // TODO: Implement save via WebSocket task message
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
  };

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
                  <Button onClick={handleStartCreate}>
                    <CirclePlus className="h-4 w-4" />
                    Deploy Service
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
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <Button size="sm" variant="ghost" onClick={() => window.history.back()} className="h-8 px-3 text-muted-foreground">
                  <ChevronLeft /> Back
                </Button>
              </div>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4">
                  <MetricCard label="Name" value={service.name} />
                  <MetricCard label="Port" value={<span className="font-mono">{service.port}</span>} />
                  <MetricCard label="Updated" value={<TimeAgo date={service.updated_at} />} />
                </div>

                <div className="rounded-xl border bg-background/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Domains</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                      <Network className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{service.domain ? service.domain : `${service.name}.${service.name}.${userCluster?.name}.dployr.io`}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-background/40 p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service ID</span>
                      <span className="font-mono">{service.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <TimeAgo date={service.created_at} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="env" className="mt-4">
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
              </TabsContent>

              <TabsContent value="settings" className="mt-4 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                    <CardDescription>Configure basic service settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="service-name">Service Name</Label>
                      <Input id="service-name" value={serviceName} onChange={e => setServiceName(e.target.value)} placeholder="my-service" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="service-port">Port</Label>
                      <Input id="service-port" type="number" value={servicePort} onChange={e => setServicePort(e.target.value)} placeholder="3000" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Domains</CardTitle>
                    <CardDescription>Manage custom domains for this service</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="example.com" onKeyDown={e => e.key === "Enter" && handleAddDomain()} />
                      <Button onClick={handleAddDomain} variant="outline">
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                    {domains.length > 0 && (
                      <div className="space-y-2">
                        {domains.map((domain, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-md border px-3 py-2">
                            <span className="font-mono text-sm">{domain}</span>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveDomain(domain)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>Permanently delete this service and all associated data. This action cannot be undone.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                      Delete Service
                    </Button>
                  </CardContent>
                </Card>

                <div className="flex justify-end mb-6">
                  <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
