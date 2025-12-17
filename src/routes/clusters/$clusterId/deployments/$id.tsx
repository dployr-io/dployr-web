// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Link } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, Deployment } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/protected-route";
import { toJson, toYaml } from "@/lib/utils";
import { useServiceForm } from "@/hooks/use-service-form";
import { useDeploymentLogs } from "@/hooks/use-deployment-logs";
import { useUrlState } from "@/hooks/use-url-state";
import type { LogLevel } from "@/types";
import type { LogTimeRange } from "@/components/logs-window";
import { useCallback, useEffect, useState } from "react";
import { LogsWindow } from "@/components/logs-window";
import { BlueprintSection } from "@/components/blueprint";
import { useDeployments } from "@/hooks/use-deployments";
import { ArrowUpRightIcon, ChevronLeft, FileX2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { APP_LINKS } from "@/lib/constants";
export const Route = createFileRoute("/clusters/$clusterId/deployments/$id")({
  component: ViewDeployment,
});

const ViewProjectBreadcrumbs = (deployment?: Deployment) => {
  const breadcrumbs: BreadcrumbItem[] = [
    {
      title: "Deployments",
      href: "/deployments",
    },
    {
      title: deployment?.config?.name || "",
      href: `/deployments/${deployment?.id || ""}`,
    },
  ];

  return breadcrumbs;
};

function ViewDeployment() {
  const { selectedDeployment: deployment, isLoading } = useDeployments();
  const config = deployment?.config;
  const breadcrumbs = ViewProjectBreadcrumbs(deployment!);
  const { blueprintFormat, setBlueprintFormat } = useServiceForm();
  const { clusterId } = Route.useParams();

  // URL state for tabs and log settings
  const { useDeploymentTabsState } = useUrlState();
  const [{ tab, logRange, logLevel }, setTabState] = useDeploymentTabsState();
  const currentTab = (tab || "logs") as "logs" | "blueprint";
  const logTimeRange = (logRange || "live") as LogTimeRange;
  const selectedLogLevel = (logLevel || "ALL") as "ALL" | LogLevel;
  
  // Streaming logs
  const [isAtBottom, setIsAtBottom] = useState(true);
  const logMode = isAtBottom ? "tail" : "historical";
  const {
    logs,
    filteredLogs,
    searchQuery,
    logsEndRef,
    isStreaming,
    setSearchQuery,
    startStreaming,
    stopStreaming,
    restartStream,
  } = useDeploymentLogs(deployment?.id, logMode, logTimeRange, selectedLogLevel);

  const handleScrollPositionChange = useCallback(
    (atBottom: boolean) => {
      setIsAtBottom(atBottom);
    },
    [setIsAtBottom]
  );

  // Start/stop log streaming on tab switch
  useEffect(() => {
    if (currentTab === "logs" && deployment?.id) {
      startStreaming();
    } else {
      stopStreaming();
    }
  }, [currentTab, deployment?.id, startStreaming, stopStreaming]);

  const yamlConfig = config ? toYaml(config) : "";
  const jsonConfig = config ? toJson(config) : "";
  const handleBlueprintCopy = async () => {
    try {
      if (!deployment || !config) return;
      await navigator.clipboard.writeText(blueprintFormat === "yaml" ? yamlConfig : jsonConfig);
    } catch {
      return;
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout breadcrumbs={breadcrumbs}>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Loader2 className="h-4 w-4 animate-spin" />
              </EmptyMedia>
              <EmptyTitle>Retrieving Deployment...</EmptyTitle>
              <EmptyDescription>This shouldn&apos;t take too long! Try refreshing your browser if you see this.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex justify-center gap-2">
                <Button asChild>
                  <Link to="/clusters/$clusterId/deployments" params={{ clusterId }}>Deploy Service</Link>
                </Button>
                <Button variant="link" asChild className="text-muted-foreground" size="sm">
                  <a href={APP_LINKS.DOCS.DEPLOYMENTS}>
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
              <Tabs value={currentTab} onValueChange={(value) => setTabState({ tab: value as "logs" | "blueprint" })} className="flex min-h-0 w-full flex-col">
                <div className="flex items-center justify-between w-full">
                  <TabsList className="self-start">
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                    <TabsTrigger value="blueprint">Blueprint</TabsTrigger>
                  </TabsList>
                  <Button size="sm" variant="ghost" onClick={() => window.history.back()} className="h-8 px-3 text-muted-foreground">
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
                      setTabState({ logRange: range });
                      restartStream(range);
                    }}
                    isStreaming={isStreaming}
                  />
                </TabsContent>
                <TabsContent value="blueprint">
                  {config?.name ? (
                    <BlueprintSection
                      name={config.name}
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
