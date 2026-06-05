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
import { BoxesIcon, ExternalLink, Globe, Rocket, ChevronRight } from "lucide-react";
import TimeAgo from "react-timeago";
import { useClusters } from "@/hooks/use-clusters";
import { useQueryClient } from "@tanstack/react-query";
import type { NormalizedInstanceData, Runtime } from "@/types";
import { useMemo } from "react";
import { getRuntimeIcon } from "@/lib/runtime-icon";

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
  const { clusterId } = useClusters();
  const queryClient = useQueryClient();

  const lastDeployment = useMemo(() => {
    if (!deployments || deployments.length === 0) return null;
    return deployments.reduce((latest, current) =>
      new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
    );
  }, [deployments]);

  const clusterHealth = useMemo(() => {
    if (!instances || instances.length === 0) return "healthy";
    const healthStatuses = instances.map(instance => {
      const instanceData = queryClient.getQueryData<NormalizedInstanceData>(["instance-status", instance.tag]);
      return instanceData?.health?.overall || "healthy";
    });
    if (healthStatuses.some(s => s === "critical")) return "critical";
    if (healthStatuses.some(s => s === "degraded")) return "degraded";
    return "healthy";
  }, [instances, queryClient]);

  const getServiceDomain = (service: any) => {
    if (!service._instanceName) return `${service.name}.dployr.run`;
    const instanceData = queryClient.getQueryData<NormalizedInstanceData>(["instance-status", service._instanceName]);
    if (!instanceData?.proxy?.routes) return `${service.name}.dployr.run`;
    const proxyRoute = instanceData.proxy.routes.find(route => {
      const upstreamPort = route.upstream?.match(/:(\d+)/)?.[1];
      return route.domain.includes(service.name) || route.upstream?.includes(service.name) || upstreamPort === String(service.port);
    });
    return proxyRoute?.domain || `${service.name}.dployr.run`;
  };

  const hasServices = services.length > 0;
  const runningServices = services.filter(s => s.status === "running" || !s.status);
  const degradedServices = services.filter(s => s.health === "degraded");

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full flex-col gap-6 px-9 py-4">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {hasServices
                    ? `${runningServices.length} of ${services.length} ${services.length === 1 ? "service" : "services"} running`
                    : "No services deployed yet"}
                </p>
              </div>
              <Button
                onClick={() => router.navigate({ to: "/clusters/$clusterId/services", params: { clusterId }, search: { deploy: true, page: 1 } })}
              >
                <Rocket className="h-4 w-4" />
                Deploy Service
              </Button>
            </div>

            {/* ── Metric strip ── */}
            <div className="grid grid-cols-3 gap-3">
              {/* Active services */}
              <div className="rounded-xl border bg-background px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Services</p>
                  <p className="text-2xl font-bold mt-0.5">{runningServices.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    across {instances.length} {instances.length === 1 ? "instance" : "instances"}
                  </p>
                </div>
                <div className="rounded-full bg-muted p-2.5">
                  <BoxesIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {/* Cluster health */}
              <div className="rounded-xl border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">Cluster Health</p>
                <div className="mt-2">
                  <StatusBadge status={clusterHealth} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {degradedServices.length > 0
                    ? `${degradedServices.length} service${degradedServices.length > 1 ? "s" : ""} degraded`
                    : "All services healthy"}
                </p>
              </div>

              {/* Last deployment */}
              <div className="rounded-xl border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">Last Deployment</p>
                <p className="text-base font-semibold mt-2 truncate">
                  {lastDeployment ? <TimeAgo date={lastDeployment.createdAt} /> : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {deployments.length > 0
                    ? `${deployments.length} total ${deployments.length === 1 ? "deployment" : "deployments"}`
                    : "No deployments yet"}
                </p>
              </div>
            </div>

            {/* ── Services list ── */}
            {hasServices ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Services</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-muted-foreground"
                    onClick={() => router.navigate({ to: "/clusters/$clusterId/services", params: { clusterId } })}
                  >
                    View all <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="rounded-xl border overflow-hidden divide-y">
                  {services.slice(0, 8).map(service => {
                    const domain = getServiceDomain(service);
                    return (
                      <div
                        key={service.id ?? service.name}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() =>
                          router.navigate({ to: "/clusters/$clusterId/services/$id", params: { clusterId, id: service.name ?? "" } })
                        }
                      >
                        {/* Runtime icon */}
                        <div className="shrink-0 text-muted-foreground">
                          {getRuntimeIcon((service.runtime?.type || "custom") as Runtime)}
                        </div>

                        {/* Name + description */}
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm truncate block">{service.name}</span>
                          {service.description && (
                            <span className="text-xs text-muted-foreground truncate block">{service.description}</span>
                          )}
                        </div>

                        {/* Status + Health */}
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={service.status ?? "running"} variant="compact" type="service" />
                          {service.health && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${service.health === "degraded" ? "text-amber-500" : "text-emerald-500"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${service.health === "degraded" ? "bg-amber-500" : "bg-emerald-500"}`} />
                              {service.health === "degraded" ? "Degraded" : "Healthy"}
                            </span>
                          )}
                        </div>

                        {/* Domain */}
                        <div className="hidden md:flex items-center gap-1.5 shrink-0 min-w-0 max-w-[200px]">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs text-muted-foreground truncate">{domain}</span>
                          <a
                            href={`https://${domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>

                        {/* Instance + time */}
                        <div className="hidden lg:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                          {service._instanceName && (
                            <span className="font-mono px-1.5 py-0.5 rounded border border-border/60 bg-muted/50">
                              {service._instanceName}
                            </span>
                          )}
                          {service.updatedAt && <TimeAgo date={service.updatedAt} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {services.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{services.length - 8} more —{" "}
                    <button
                      className="underline underline-offset-2 hover:text-foreground"
                      onClick={() => router.navigate({ to: "/clusters/$clusterId/services", params: { clusterId } })}
                    >
                      view all
                    </button>
                  </p>
                )}
              </div>
            ) : (
              /* ── Empty state ── */
              <div className="rounded-xl border-2 border-dashed bg-muted/20 px-6 py-14 flex flex-col items-center text-center gap-4">
                <div className="rounded-full bg-muted p-4">
                  <BoxesIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Deploy your first service</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Connect a repository or push a Docker image and you'll be live in minutes.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => router.navigate({ to: "/clusters/$clusterId/services", params: { clusterId }, search: { deploy: true, page: 1 } })}>
                    <Rocket className="h-4 w-4" />
                    Deploy Service
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="https://dployr.io/docs/quickstart" target="_blank" rel="noopener noreferrer">
                      Read the docs
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
