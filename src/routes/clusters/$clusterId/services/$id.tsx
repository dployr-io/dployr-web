// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, Service } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/protected-route";
import { toJson, toYaml } from "@/lib/utils";
import { useServiceForm } from "@/hooks/use-service-form";
import { useLogs } from "@/hooks/use-logs";
import { LogsWindow } from "@/components/logs-window";
import { BlueprintSection } from "@/components/blueprint";
import { ArrowUpRightIcon, ChevronLeft, CirclePlus, FileX2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useServices } from "@/hooks/use-services";
import { ConfigTable } from "@/components/config-table";
import { useEnv } from "@/hooks/use-env";
import { useDeploymentCreator } from "@/hooks/use-deployment-creator";
export const Route = createFileRoute("/clusters/$clusterId/services/$id")({
  component: ViewService,
});

const ViewProjectBreadcrumbs = (service: Service | undefined, clusterId?: string) => {
  const base = clusterId ? `/clusters/${clusterId}/services` : "/services";

  const breadcrumbs: BreadcrumbItem[] = [
    {
      title: "Services",
      href: base,
    },
    {
      title: service?.name || "",
      href: service?.id ? `${base}/${service.id}` : base,
    },
  ];

  return breadcrumbs;
};

function ViewService() {
  const { selectedService: service, isLoading } = useServices();
  const { handleStartCreate } = useDeploymentCreator();
  const blueprint = service?.blueprint;
  const { clusterId } = Route.useParams();
  const breadcrumbs = ViewProjectBreadcrumbs(service!, clusterId);
  const { logs, filteredLogs, selectedLevel, searchQuery, logsEndRef, setSelectedLevel, setSearchQuery } = useLogs(service?.name, service);
  const { blueprintFormat, setBlueprintFormat } = useServiceForm();

  const yamlConfig = blueprint ? toYaml(blueprint) : "";
  const jsonConfig = blueprint ? toJson(blueprint) : "";
  const handleBlueprintCopy = async () => {
    try {
      if (!service || !blueprint) return;
      await navigator.clipboard.writeText(blueprintFormat === "yaml" ? yamlConfig : jsonConfig);
    } catch {
      return;
    }
  };

  const { config, editValue, editingKey, setEditValue, handleCancel, handleEdit, handleKeyboardPress, handleSave } = useEnv();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
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
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!service) {
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
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
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full min-h-0 flex-col gap-4 rounded-xl p-4">
          <div className="flex min-h-0 flex-1 auto-rows-min flex-col gap-6 px-9 py-2">
            <div className="flex min-h-0 flex-1">
              <Tabs defaultValue="logs" className="flex min-h-0 w-full flex-col">
                <div className="flex items-center justify-between w-full">
                  <TabsList className="self-start">
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                    <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
                    <TabsTrigger value="env">Environment</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <Button size="sm" variant="ghost" onClick={() => window.history.back()} className="h-8 px-3 text-muted-foreground">
                    <ChevronLeft /> Back
                  </Button>
                </div>
                <TabsContent value="logs" className="flex min-h-0 flex-1 flex-col">
                  <LogsWindow
                    logs={logs}
                    filteredLogs={filteredLogs}
                    selectedLevel={selectedLevel}
                    searchQuery={searchQuery}
                    logsEndRef={logsEndRef}
                    setSelectedLevel={setSelectedLevel}
                    setSearchQuery={setSearchQuery}
                  />
                </TabsContent>
                <TabsContent value="blueprint">
                  {blueprint?.name ? (
                    <BlueprintSection
                      name={blueprint.name}
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
                <TabsContent value="env">
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
                <TabsContent value="metrics">
                  <h1>Metrics</h1>
                </TabsContent>
                <TabsContent value="settings">
                  <h1>Settings</h1>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
