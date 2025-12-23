// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, Service } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowUpRightIcon, BoxesIcon, ChevronLeft, ChevronRight, CirclePlus, Globe } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useServices } from "@/hooks/use-services";
import { ProtectedRoute } from "@/components/protected-route";
import { useDeploymentCreator } from "@/hooks/use-deployment-creator";
import { Skeleton } from "@/components/ui/skeleton";
import TimeAgo from "react-timeago";
import { useMemo } from "react";
import { StatusBadge } from "@/components/status-badge";
import { useClusters } from "@/hooks/use-clusters";
import { useInstances } from "@/hooks/use-instances";

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
interface ServiceWithInstance extends Service {
  instanceId?: string;
  instanceTag?: string;
}

function Services() {
  const { services, paginatedServices, currentPage, totalPages, startIndex, endIndex, isLoading, goToPage, goToPreviousPage, goToNextPage } = useServices();
  const { handleStartCreate } = useDeploymentCreator();
  const { clusterId, userCluster } = useClusters();
  const navigate = useNavigate();
  const { instances } = useInstances();

  // Map services to their instances using the _instanceId field from useServices
  const servicesWithInstances = useMemo(() => {
    return paginatedServices.map(service => {
      const instanceId = (service as any)._instanceId;
      const instanceTag = instances.find(i => i.tag === instanceId)?.tag || instanceId;
      
      return {
        ...service,
        instanceId,
        instanceTag,
      } as ServiceWithInstance;
    });
  }, [paginatedServices, instances]);

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
                      <TableHead className="h-14 align-middle">Instance</TableHead>
                      <TableHead className="h-14 align-middle">Domains</TableHead>
                      <TableHead className="h-14 w-[140px] text-right align-middle">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!isLoading && servicesWithInstances.length > 0
                      ? servicesWithInstances.map(service => {
                          return (
                            <TableRow 
                              key={service.id} 
                              className="h-16 cursor-pointer"
                              onClick={() => navigate({ to: "/clusters/$clusterId/services/$id", params: { clusterId, id: service.id } })}
                            >
                              <TableCell className="h-16 max-w-[200px] align-middle font-medium">
                                <div className="flex flex-col gap-0.5">
                                  <span className="truncate text-sm font-semibold">{service.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="h-16 max-w-[100px] align-middle">
                                {service.status ? <StatusBadge status={service.status} variant="compact" /> : <span className="text-xs text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="h-16 max-w-[80px] align-middle">
                                <span className="font-mono text-sm">{service.blueprint?.port || "—"}</span>
                              </TableCell>
                              <TableCell className="h-16 align-middle">
                                {service.instanceTag ? (
                                  <span className="inline-flex items-center rounded-full border border-sidebar-border px-2 py-0.5 text-xs font-mono text-muted-foreground">
                                    {service.instanceTag}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="h-16 align-middle">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate text-xs font-mono text-muted-foreground">{service.domain ? service.domain : `${service.name}.${userCluster?.name}.dployr.io`}</span>
                                </div>
                              </TableCell>
                              <TableCell className="h-16 w-[140px] text-right align-middle">
                                <TimeAgo date={service.updated_at} />
                              </TableCell>
                            </TableRow>
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
