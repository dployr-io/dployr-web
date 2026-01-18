// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useRouter } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import type { BreadcrumbItem } from "@/types";
import { StatusBadge } from "@/components/status-badge";
import { useServices } from "@/hooks/use-services";
import { useDeployments } from "@/hooks/use-deployments";
import { useInstances } from "@/hooks/use-instances";
import { Button } from "@/components/ui/button";
import { BoxesIcon, Globe, ExternalLink } from "lucide-react";
import TimeAgo from "react-timeago";
import { useClusters } from "@/hooks/use-clusters";
import { useQueryClient } from "@tanstack/react-query";
import type { NormalizedInstanceData } from "@/types";
import { useMemo } from "react";

export const Route = createFileRoute("/clusters/$clusterId/dashboard")({
  component: Dashboard,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
  },
];

function Dashboard() {
  const router = useRouter();
  const { services } = useServices();
  const { deployments } = useDeployments();
  const { instances } = useInstances();
  const { clusterId, userCluster } = useClusters();
  const queryClient = useQueryClient();

  const lastDeployment = useMemo(() => {
    if (!deployments || deployments.length === 0) return null;
    return deployments.reduce((latest, current) => {
      return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
    });
  }, [deployments]);

  const clusterHealth = useMemo(() => {
    if (!instances || instances.length === 0) return "healthy";
    const healthStatuses = instances.map(instance => {
      const instanceData = queryClient.getQueryData<NormalizedInstanceData>(["instance-status", instance.tag]);
      return instanceData?.health?.overall || "healthy";
    });
    
    if (healthStatuses.some(status => status === "critical")) return "critical";
    if (healthStatuses.some(status => status === "degraded")) return "degraded";
    if (healthStatuses.every(status => status === "healthy")) return "healthy";
    return "healthy";
  }, [instances, queryClient]);

  const getServiceDomain = (service: any) => {
    if (!service._instanceName) return `${service.name}.${userCluster?.name}.dployr.io`;
    
    const instanceData = queryClient.getQueryData<NormalizedInstanceData>(["instance-status", service._instanceName]);
    if (!instanceData?.proxy?.routes) return `${service.name}.${userCluster?.name}.dployr.io`;
    
    const proxyRoute = instanceData.proxy.routes.find(route => {
      const upstreamPort = route.upstream?.match(/:(\d+)/)?.[1];
      return route.domain.includes(service.name) || 
             route.upstream?.includes(service.name) ||
             upstreamPort === String(service.port);
    });
    
    return proxyRoute?.domain || `${service.name}.${userCluster?.name}.dployr.io`;
  };

  const hasServices = services.length > 0;

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full flex-col gap-8 px-9 py-6">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-tight">Welcome back</h1>
                <p className="mt-2 text-base text-muted-foreground">
                  {hasServices 
                    ? `You have ${services.length} ${services.length === 1 ? 'service' : 'services'} running`
                    : "Get started by deploying your first service"
                  }
                </p>
              </div>
              {!hasServices && (
                <Button 
                  size="lg"
                  className="flex items-center gap-2" 
                  onClick={() => router.navigate({ to: "/clusters/$clusterId/deployments", params: { clusterId }, search: { new: true } })}
                >
                  Deploy Your First Service
                </Button>
              )}
            </div>

            {/* Stats Grid - Only show if there are services */}
            {hasServices && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-linear-to-br from-background to-muted/20 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Active Services</p>
                      <p className="mt-2 text-3xl font-bold">{services.length}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Across {instances.length} {instances.length === 1 ? 'instance' : 'instances'}
                      </p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-3">
                      <BoxesIcon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-linear-to-br from-background to-muted/20 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Cluster Health</p>
                      <div className="mt-2">
                        <StatusBadge status={clusterHealth} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {instances.length} {instances.length === 1 ? 'instance' : 'instances'} monitored
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-linear-to-br from-background to-muted/20 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Last Deployment</p>
                      <p className="mt-2 text-lg font-semibold">
                        {lastDeployment ? <TimeAgo date={lastDeployment.createdAt} /> : "No deployments yet"}
                      </p>
                      {lastDeployment && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {deployments.length} total {deployments.length === 1 ? 'deployment' : 'deployments'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Services Section */}
            {hasServices ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Your Services</h2>
                  <Button 
                    variant="outline"
                    onClick={() => router.navigate({ to: "/clusters/$clusterId/services", params: { clusterId } })}
                  >
                    View All
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {services.slice(0, 6).map(service => (
                    <div
                      key={service.id}
                      className="group cursor-pointer rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/50"
                      onClick={() => router.navigate({ to: "/clusters/$clusterId/services/$id", params: { clusterId, id: service.id } })}
                    >
                      <div className="p-5 pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                              {service.name}
                            </h3>
                            <div className="mt-2 flex items-center gap-2">
                              <StatusBadge status="running" variant="compact" />
                              
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <Globe className="h-4 w-4 shrink-0" />
                          <span className="truncate font-mono text-xs flex-1">{getServiceDomain(service)}</span>
                          <a
                            href={`https://${getServiceDomain(service)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>

                      <div className="border-t bg-muted/30 px-5 py-3 rounded-b-xl">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {service._instanceName && (
                              <span className="font-mono">
                                {service._instanceName}
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            <TimeAgo date={service.updatedAt} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {services.length > 6 && (
                  <div className="flex justify-center pt-2">
                    <Button 
                      variant="ghost"
                      onClick={() => router.navigate({ to: "/clusters/$clusterId/services", params: { clusterId } })}
                    >
                      View {services.length - 6} more {services.length - 6 === 1 ? 'service' : 'services'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed bg-muted/30 p-12">
                <div className="flex flex-col items-center text-center">
                  <div className="rounded-full bg-primary/10 p-4 mb-4">
                    <BoxesIcon className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Deploy your first service</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Get started by deploying a service from your repository. <br /> It only takes a few minutes.
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      size="lg"
                      onClick={() => router.navigate({ to: "/clusters/$clusterId/deployments", params: { clusterId }, search: { new: true } })}
                    >
                      Deploy Service
                    </Button>
                    <Button variant="outline" size="lg" asChild>
                      <a href="https://dployr.io/docs/quickstart.html" target="_blank" rel="noopener noreferrer">
                        View Documentation
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
