// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, InstanceStream, Service } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { useQueryClient } from "@tanstack/react-query";
import { ProxyGraphVisualizer } from "@/components/proxy-graph-visualizer";
import { ProxyServiceList } from "@/components/proxy-service-list";
import { ProxyAddDialog } from "@/components/proxy-add-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Activity,
  CirclePlus,
  Network,
  RotateCcw,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useInstances } from "@/hooks/use-instances";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { useProxyOperations } from "@/hooks/use-proxy-operations";
import { useUrlState } from "@/hooks/use-url-state";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/clusters/$clusterId/graph")({
  component: GraphPage,
});

const graphBreadcrumbs = (clusterId?: string): BreadcrumbItem[] => [
  { title: "Dashboard", href: `/clusters/${clusterId}/dashboard` },
  { title: "Proxy Graph", href: `/clusters/${clusterId}/graph` },
];

// Proxy status card
function ProxyStatusCard({
  status,
  appCount,
  isLoading,
  onRestart,
  isRestarting,
}: {
  status: "running" | "stopped" | "error" | "unknown";
  appCount: number;
  isLoading: boolean;
  onRestart: () => void;
  isRestarting: boolean;
}) {
  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "stopped":
        return <XCircle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "running":
        return <Badge variant="default">Running</Badge>;
      case "stopped":
        return <Badge variant="secondary">Stopped</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-4 w-4" />
            Proxy Status
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isLoading ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                {getStatusIcon()}
              </div>
            )}
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </>
              ) : (
                <>
                  <p className="font-medium">{appCount} Routes</p>
                  <p className="text-sm text-muted-foreground">Active proxy routes</p>
                </>
              )}
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onRestart}
                disabled={isRestarting || status === "unknown"}
              >
                <RotateCcw className={cn("h-4 w-4 mr-2", isRestarting && "animate-spin")} />
                Restart
              </Button>
            </TooltipTrigger>
            <TooltipContent>Restart proxy server</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}

function GraphPage() {
  const { clusterId } = Route.useParams();
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();

  // State
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"graph" | "list">("graph");
  const [isRestarting, setIsRestarting] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

  // Hooks
  const { instances, isLoading: instancesLoading } = useInstances();
  useInstanceStream(); // Ensure stream is active

  // Auto-select first instance
  useEffect(() => {
    if (!selectedInstance && instances?.length) {
      setSelectedInstance(instances[0].id);
    }
  }, [instances, selectedInstance]);

  // Get current instance
  const currentInstance = useMemo(() => {
    if (!selectedInstance || !instances) return null;
    return instances.find((i) => i.id === selectedInstance) ?? null;
  }, [selectedInstance, instances]);

  // Get proxy operations for the selected instance
  const {
    apps,
    status: proxyStatus,
    isLoading: proxyLoading,
    error: proxyError,
    restart,
    addService,
    removeService,
  } = useProxyOperations(currentInstance?.tag);

  // Get services from instance stream to show all services on graph
  const queryClient = useQueryClient();
  const services = useMemo(() => {
    if (!currentInstance?.tag) return [];
    
    const data = queryClient.getQueryData<InstanceStream>(["instance-status", currentInstance.tag]);
    const update = data?.update as any;
    return (update?.services || []) as Service[];
  }, [currentInstance?.tag, queryClient]);

  const _services = useMemo(() => {
    return services.map((service) => ({
      id: service.id,
      name: service.name,
      port: service.port,
    }));
  }, [services]);

  // Handle error display
  useEffect(() => {
    if (proxyError) {
      setAppError({
        appError: {
          message: proxyError,
          helpLink: "https://docs.dployr.io/proxy/troubleshooting",
        },
      });
    }
  }, [proxyError, setAppError]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    // Proxy data refreshes automatically from instance stream
    toast.success("Proxy status refreshed");
  }, []);

  const handleRestart = useCallback(async () => {
    if (!currentInstance) return;

    setIsRestarting(true);
    try {
      await restart(currentInstance.tag, clusterId);
      toast.success("Proxy restart initiated");
      setRestartDialogOpen(false);
    } catch {
      toast.error("Failed to restart proxy");
    } finally {
      setIsRestarting(false);
    }
  }, [currentInstance, clusterId, restart]);

  const handleAddService = useCallback(
    async (data: {
      serviceName: string;
      upstream: string;
      domain?: string;
      root?: string;
      template?: string;
    }) => {
      if (!currentInstance) return;

      setIsAddingService(true);
      try {
        await addService(currentInstance.tag, clusterId, data.serviceName, data.upstream, {
          domain: data.domain,
          root: data.root,
          template: data.template,
        });
        toast.success(`Service "${data.serviceName}" added successfully`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add service";
        toast.error(message);
        throw error;
      } finally {
        setIsAddingService(false);
      }
    },
    [currentInstance, clusterId, addService]
  );

  const handleRemoveService = useCallback(
    async (serviceName: string) => {
      if (!currentInstance) return;

      try {
        await removeService(currentInstance.tag, clusterId, serviceName);
        toast.success(`Service "${serviceName}" removed`);
      } catch {
        toast.error("Failed to remove service");
      }
    },
    [currentInstance, clusterId, removeService]
  );

  const appCount = apps ? Object.keys(apps).length : 0;

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={graphBreadcrumbs(clusterId)}>
        <div className="flex flex-col gap-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Resource Graph</h1>
              <p className="text-sm text-muted-foreground">
                Quick overview of your services
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Instance Selector */}
              <Select
                value={selectedInstance ?? ""}
                onValueChange={setSelectedInstance}
                disabled={instancesLoading}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select instance" />
                </SelectTrigger>
                <SelectContent>
                  {instances?.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        {instance.tag}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={() => setAddDialogOpen(true)} disabled={!selectedInstance}>
                <CirclePlus className="h-4 w-4 mr-2" />
                Add Route
              </Button>
            </div>
          </div>

          {/* Status Card */}
          <ProxyStatusCard
            status={proxyStatus}
            appCount={appCount}
            isLoading={proxyLoading}
            onRestart={() => setRestartDialogOpen(true)}
            isRestarting={isRestarting}
          />

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "graph" | "list")}>
            <TabsList>
              <TabsTrigger value="graph" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Graph View
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                List View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="graph" className="mt-4">
              <ProxyGraphVisualizer
                apps={apps}
                services={services}
                instanceName={currentInstance?.tag ?? "Instance"}
                isLoading={proxyLoading}
                onRefresh={handleRefresh}
                onSelectApp={(domain, app) => {
                  console.log("Selected:", domain, app);
                }}
                className="min-h-[500px]"
              />
            </TabsContent>

            <TabsContent value="list" className="mt-4">
              <ProxyServiceList
                apps={apps}
                onRemove={handleRemoveService}
                isLoading={proxyLoading}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Add Service Dialog */}
        <ProxyAddDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSubmit={handleAddService}
          isSubmitting={isAddingService}
          services={_services}
        />

        {/* Restart Confirmation Dialog */}
        <AlertDialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restart proxy server?</AlertDialogTitle>
              <AlertDialogDescription>
                This will briefly interrupt all proxy routes on{" "}
                <strong>{currentInstance?.tag}</strong>. Active connections may be dropped.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRestarting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestart} disabled={isRestarting}>
                {isRestarting && <RotateCcw className="h-4 w-4 mr-2 animate-spin" />}
                {isRestarting ? "Restarting..." : "Restart"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppLayout>
    </ProtectedRoute>
  );
}