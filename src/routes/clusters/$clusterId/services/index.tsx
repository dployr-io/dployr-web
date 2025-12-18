// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Link } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, InstanceStream, InstanceStreamUpdateV1, AgentService } from "@/types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpRightIcon, BoxesIcon, ChevronLeft, ChevronRight, CirclePlus, Globe } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useServices, type AppService } from "@/hooks/use-services";
import { ProtectedRoute } from "@/components/protected-route";
import { useDeploymentCreator } from "@/hooks/use-deployment-creator";
import { Skeleton } from "@/components/ui/skeleton";
import TimeAgo from "react-timeago";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/clusters/$clusterId/services/")({
  component: Services,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Services",
    href: "/services",
  },
];

// Extended service type with instance info
interface ServiceWithInstance extends AppService {
  instanceId?: string;
  instanceTag?: string;
  status?: string;
}

function Services() {
  const {
    services,
    paginatedServices,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    isLoading,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = useServices();
  const { handleStartCreate } = useDeploymentCreator();
  const { clusterId } = Route.useParams();
  const queryClient = useQueryClient();

  // Get all instance statuses and map services to their instances
  const servicesWithInstances = useMemo(() => {
    const allCachedData = queryClient.getQueriesData<InstanceStream>({ queryKey: ['instance-status'] });
    const serviceInstanceMap = new Map<string, { instanceId: string; instanceTag: string; status: string }>();

    allCachedData.forEach(([, data]) => {
      if (!data?.update) return;
      const update = data.update as InstanceStreamUpdateV1;
      const instanceId = update.instance_id;
      
      if (update.services) {
        update.services.forEach((svc: AgentService) => {
          serviceInstanceMap.set(svc.id, {
            instanceId,
            instanceTag: instanceId.slice(-8), // Use last 8 chars as tag fallback
            status: svc.status || update.status,
          });
        });
      }
    });

    return paginatedServices.map(service => ({
      ...service,
      ...serviceInstanceMap.get(service.id),
    })) as ServiceWithInstance[];
  }, [paginatedServices, queryClient]);

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full flex-col gap-6 px-9">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-black">Services</p>
                <p className="text-sm font-normal text-muted-foreground">Manage your services here</p>
              </div>
              <div className="flex items-center gap-2">
                <Button className="flex items-center gap-2" onClick={handleStartCreate}>
                  <CirclePlus className="h-4 w-4" />
                  Deploy Service
                </Button>
              </div>
            </div>

            {paginatedServices.length === 0 && !isLoading ? (
              <div className="flex min-h-[400px] flex-1 items-center justify-center">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BoxesIcon />
                    </EmptyMedia>
                    <EmptyTitle>No services yet</EmptyTitle>
                    <EmptyDescription>You haven&apos;t deployed any services yet. Get started by deploying your first service.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <div className="flex justify-center gap-2">
                      <Button onClick={handleStartCreate}>
                        <CirclePlus className="h-4 w-4" />
                        Deploy Service
                      </Button>
                      <Button variant="link" asChild className="text-muted-foreground" size="sm">
                        <a href="https://dployr.io/docs">
                          Learn More <ArrowUpRightIcon />
                        </a>
                      </Button>
                    </div>
                  </EmptyContent>
                </Empty>
              </div>
            ) : (
              <>
                <Table className="overflow-hidden rounded-t-lg">
                  <TableHeader className="gap-2 rounded-t-xl bg-neutral-50 p-2 dark:bg-neutral-900">
                    <TableRow className="h-14">
                      <TableHead className="h-14 w-[200px] align-middle">Name</TableHead>
                      <TableHead className="h-14 w-[100px] align-middle">Status</TableHead>
                      <TableHead className="h-14 w-[80px] align-middle">Port</TableHead>
                      <TableHead className="h-14 w-[120px] align-middle">Instance</TableHead>
                      <TableHead className="h-14 align-middle">Domains</TableHead>
                      <TableHead className="h-14 w-[140px] text-right align-middle">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!isLoading && servicesWithInstances.length > 0
                      ? servicesWithInstances.map(service => {
                          return (
                          <Link key={service.id} to="/clusters/$clusterId/services/$id" params={{ clusterId, id: service.id }} className="contents">
                            <TableRow className="h-16 cursor-pointer">
                              <TableCell className="h-16 max-w-[200px] align-middle font-medium">
                                <div className="flex flex-col gap-0.5">
                                  <span className="truncate text-sm font-semibold">{service.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="h-16 max-w-[100px] align-middle">
                                {service.status ? (
                                  <StatusBadge status={service.status} variant="compact" />
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="h-16 max-w-[80px] align-middle">
                                <span className="font-mono text-sm">{service.port || "—"}</span>
                              </TableCell>
                              <TableCell className="h-16 max-w-[120px] align-middle">
                                {service.instanceId ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="truncate text-xs font-mono text-muted-foreground">
                                        {service.instanceTag}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{service.instanceId}</TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="h-16 align-middle">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate max-w-[160px]">
                                    {service.domains?.length > 0 ? service.domains[0] : "—"}
                                  </span>
                                  {service.domains?.length > 1 && (
                                    <span className="text-xs text-muted-foreground">+{service.domains.length - 1}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="h-16 w-[140px] text-right align-middle">
                                <TimeAgo date={service.updated_at} />
                              </TableCell>
                            </TableRow>
                          </Link>
                        );
                      })
                      : Array.from({ length: 3 }).map((_, idx) => (
                          <TableRow key={`skeleton-${idx}`} className="h-16">
                            <TableCell className="h-16 max-w-[200px] overflow-hidden align-middle font-medium">
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell className="h-16 max-w-[100px] align-middle">
                              <Skeleton className="h-5 w-16 rounded-full" />
                            </TableCell>
                            <TableCell className="h-16 max-w-[80px] align-middle">
                              <Skeleton className="h-4 w-12" />
                            </TableCell>
                            <TableCell className="h-16 max-w-[120px] align-middle">
                              <Skeleton className="h-4 w-16" />
                            </TableCell>
                            <TableCell className="h-16 align-middle">
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell className="h-16 w-[140px] overflow-hidden text-right align-middle">
                              <Skeleton className="ml-auto h-4 w-20" />
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    {services.length === 0
                      ? "No services found"
                      : services.length === 1
                        ? "Showing 1 of 1 service"
                        : `Showing ${startIndex + 1} to ${Math.min(endIndex, services.length)} of ${services.length} services`}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1} className="flex items-center gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => goToPage(page)} className="h-8 w-8 p-0">
                          {page}
                        </Button>
                      ))}
                    </div>

                    <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages} className="flex items-center gap-1">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
