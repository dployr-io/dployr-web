// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useRouter } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import { type BreadcrumbItem, type BlueprintFormat, denormalize, type InstanceStreamUpdateV1_1 } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/protected-route";
import { toJson, toYaml } from "@/lib/utils";
import { useCallback, useMemo, useState } from "react";
import { LogsWindow } from "@/components/logs-window";
import { BlueprintSection } from "@/components/blueprint";
import { useDeployments } from "@/hooks/use-deployments";
import { ArrowUpRightIcon, ChevronLeft, FileX2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { useDeploymentTabs } from "@/hooks/use-standardized-tabs";
import { useDeploymentLogs } from "@/hooks/use-standardized-logs";
export const Route = createFileRoute("/clusters/$clusterId/deployments/$id")({
  component: ViewDeployment,
});

const viewDeploymentBreadcrumbs = (clusterId?: string, deploymentId?: string, deploymentName?: string): BreadcrumbItem[] => {
  const base = clusterId ? `/clusters/${clusterId}/deployments` : "/deployments";

  return [
    {
      title: "Deployments",
      href: base,
    },
    {
      title: deploymentName || "",
      href: deploymentId ? `${base}/${deploymentId}` : base,
    },
  ];
};

function ViewDeployment() {
  const router = useRouter();
  const { clusterId } = Route.useParams();
  const { selectedDeployment: deployment, selectedInstanceName } = useDeployments();
  const breadcrumbs = viewDeploymentBreadcrumbs(clusterId, deployment?.id, deployment?.name);

  // Use standardized tabs hook - manages tab state via URL
  const {
    currentTab,
    logTimeRange,
    selectedLogLevel,
    logDuration,
    setTabState,
  } = useDeploymentTabs();
  
  const [blueprintFormat, setBlueprintFormat] = useState<BlueprintFormat>("yaml");

  // Use standardized logs hook - handles streaming lifecycle automatically
  const {
    logs,
    filteredLogs,
    searchQuery,
    logsEndRef,
    isStreaming,
    setSearchQuery,
    handleScrollPositionChange,
  } = useDeploymentLogs(deployment?.id, selectedInstanceName, {
    currentTab,
    logTimeRange,
    selectedLogLevel,
    logDuration,
  });

  // Get instance status for blueprint
  const { update } = useInstanceStatus(selectedInstanceName);
  
  const config = useMemo(
    () => denormalize(update, "v1.1") as InstanceStreamUpdateV1_1 | null,
    [update]
  );  

  const deploymentBlueprint = useMemo(() => config?.workloads?.deployments?.find((d) => d?.id === deployment?.id), [config, deployment?.id]);
  const yamlConfig = useMemo(() => deploymentBlueprint ? toYaml(deploymentBlueprint) : "", [deploymentBlueprint]);
  const jsonConfig = useMemo(() => deploymentBlueprint ? toJson(deploymentBlueprint) : "", [deploymentBlueprint]);

  const handleBlueprintCopy = useCallback(() => {
    const content = blueprintFormat === "yaml" ? yamlConfig : jsonConfig;
    navigator.clipboard.writeText(content);
  }, [blueprintFormat, yamlConfig, jsonConfig]);

  if (!deployment) {
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileX2 />
              </EmptyMedia>
              <EmptyTitle>No Deployment Found!</EmptyTitle>
              <EmptyDescription>The requested deployment was not found. Please verify the ID and try again.</EmptyDescription>
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
              <Tabs value={currentTab} onValueChange={(value) => setTabState({ tab: value as "logs" | "blueprint" })} className="flex min-h-0 w-full flex-col">
                <div className="flex items-center justify-between w-full">
                  <TabsList className="self-start">
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                    <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
                  </TabsList>
                  <Button size="sm" variant="ghost" onClick={() => router.history.back()} className="h-8 px-3 text-muted-foreground">
                    <ChevronLeft /> Back
                  </Button>
                </div>
                <TabsContent value="logs" className="flex min-h-0 flex-1 flex-col">
                  <LogsWindow
                    logs={logs}
                    filteredLogs={filteredLogs}
                    selectedLevel={selectedLogLevel}
                    setSelectedLevel={(level) => setTabState({ logLevel: level })}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    logsEndRef={logsEndRef}
                    onScrollPositionChange={handleScrollPositionChange}
                    timeRange={logTimeRange}
                    onTimeRangeChange={(range) => {
                      setTabState({ logRange: range, duration: range });
                    }}
                    isStreaming={isStreaming}
                    showTimeFilter={false}
                  />
                </TabsContent>
                <TabsContent value="blueprint">
                  {config?.workloads?.services?.length ? (
                    <BlueprintSection
                      name={deployment?.name || "Deployment"}
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
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
