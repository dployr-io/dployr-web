// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, Runtime, Service } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/protected-route";
import { ArrowUpRightIcon, ChevronLeft, CirclePlus, Edit2, FileX2, Globe, Loader2, Save, StopCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useServices } from "@/hooks/use-services";
import { ConfigTable } from "@/components/config-table";
import { useServiceEnv } from "@/hooks/use-service-env";
import { useServiceEditor } from "@/hooks/use-service-editor";
import { useDeploymentCreator } from "@/hooks/use-deployment-creator";
import { useUrlState } from "@/hooks/use-url-state";
import { MetricCard } from "@/components/metric-card";
import TimeAgo from "react-timeago";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClusters } from "@/hooks/use-clusters";
import { getRuntimeIcon } from "@/lib/runtime-icon";
import { useServiceRemove } from "@/hooks/use-service-remove";
import { ulid } from "ulid";

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
  } = useServiceEditor(service, clusterId || "");

  const {
    handleRemoveService,
  } = useServiceRemove();

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
                </TabsList>

                <div className="flex gap-3">
                  <Button size="sm" variant="ghost" onClick={() => window.history.back()} className="h-8 px-3 text-muted-foreground">
                    <ChevronLeft /> Back
                  </Button>

                  <Button size="sm" onClick={handleStartEdit}>
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </div>

              <TabsContent value="overview" className="mt-4 space-y-4">
                {!isEditMode ? (
                  <>
                    <div className="flex justify-between gap-x-6 gap-y-4 rounded-xl border bg-background/40 p-4">
                      <MetricCard label="Name" value={service.name} />
                      <MetricCard label="Port" value={<span className="font-mono">{service.port || service.blueprint?.port}</span>} />
                      <MetricCard
                        label="Runtime"
                        value={
                          <div className="flex items-center gap-2">
                            {getRuntimeIcon((service.runtime || "custom") as Runtime)}
                            <span>{service.runtime}</span>
                          </div>
                        }
                      />
                      <MetricCard label="Created" value={<TimeAgo date={service.created_at} />} />
                    </div>

                    {service.description && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm font-medium">Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </CardContent>
                      </Card>
                    )}

                    <div className="rounded-xl border bg-background/40 p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{service.domain ? service.domain : `${service.name}.${userCluster?.name}.dployr.io`}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Edit</h2>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4" />
                          Save & Deploy
                        </Button>
                      </div>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Update the service name and description</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Service Name</Label>
                          <Input id="name" value={editedName} onChange={e => setEditedName(e.target.value)} placeholder="Enter service name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea id="description" value={editedDescription} onChange={e => setEditedDescription(e.target.value)} placeholder="Enter service description" rows={3} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-red-600">Remove Service</CardTitle>
                            <CardDescription>This will remove the service from the instance. This action cannot be undone.</CardDescription>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleRemoveService(service?.id || "", ulid())}>
                            <StopCircle className="h-4 w-4" />
                            Stop & Remove
                          </Button>
                        </div>
                      </CardHeader>
               
                    </Card>
                  </>
                )}
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
            </Tabs>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
