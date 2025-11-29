// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, InstanceStatus, Instance } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, CirclePlus, MoreHorizontal } from "lucide-react";
import TimeAgo from "react-timeago";
import { formatWithoutSuffix } from "@/lib/utils";
import { useInstances } from "@/hooks/use-instances";
import { useInstancesForm } from "@/hooks/use-instances-form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUrlState } from "@/hooks/use-url-state";
import { useClusterId } from "@/hooks/use-cluster-id";

export const Route = createFileRoute("/clusters/$clusterId/instances/")({
  component: Instances,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Instances",
    href: "/instances",
  },
];

function Instances() {
  const { paginatedInstances, instances, isLoading, currentPage, totalPages, startIndex, endIndex, goToPage, goToPreviousPage, goToNextPage, addInstance } = useInstances();
  const clusterId = useClusterId();
  const navigate = Route.useNavigate();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { useInstancesDialog } = useUrlState();
  const [{ new: isNewInstanceOpen }, setInstancesDialog] = useInstancesDialog();
  const { address, tag, validationError, setAddress, setTag, getFormData } = useInstancesForm();

  async function handleCreateInstance() {
    const data = getFormData();
    if (!data) return;

    try {
      await addInstance.mutateAsync({
        address: data.address,
        tag: data.tag,
        publicKey: data.publicKey,
      });

      setInstancesDialog({ new: false });
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full items-start justify-between gap-4 px-9 pt-6">
            <div className="flex flex-col gap-1">
              <p className="text-2xl font-black">Instances</p>
              <p className="text-sm text-muted-foreground">Manage dployr instances in this cluster.</p>
            </div>

            <Dialog open={isNewInstanceOpen} onOpenChange={open => setInstancesDialog({ new: open })}>
              <DialogTrigger asChild>
                <Button>
                  <CirclePlus className="h-4 w-4" />
                  New Instance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Instance</DialogTitle>
                  <DialogDescription>Setup dployr on a new instance.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-4">
                    <Label htmlFor="instance-address">IPv4 Address</Label>
                    <Input
                      id="instance-address"
                      placeholder="52.222.52.222"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-4">
                    <Label htmlFor="instance-tag">Tag</Label>
                    <Input
                      id="instance-tag"
                      placeholder="my-instance-1"
                      value={tag}
                      maxLength={15}
                      onChange={e => setTag(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" onClick={handleCreateInstance}>
                    Create Instance
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex w-full flex-1 flex-col gap-4 px-9 pb-6">
            <Table className="overflow-hidden rounded-t-lg">
              <TableHeader className="gap-2 rounded-t-xl bg-neutral-50 p-2 dark:bg-neutral-900">
                <TableRow className="h-12">
                  <TableHead className="w-[240px]">Instance</TableHead>
                  <TableHead className="w-[220px]">Address</TableHead>
                  <TableHead className="w-[140px]">Created</TableHead>
                  <TableHead className="w-[80px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 3 }).map((_, idx) => (
                      <TableRow key={`skeleton-${idx}`} className="h-16">
                        <TableCell className="h-16 max-w-[240px] align-middle font-medium">
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell className="h-16 max-w-[220px] align-middle">
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell className="h-16 max-w-[140px] align-middle">
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="h-16 max-w-[80px] align-middle text-right">
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : paginatedInstances.map((instance: Instance) => {
                      return (
                      <TableRow
                        key={instance.id}
                        className="h-16 cursor-pointer"
                        onClick={() => {
                          if (!clusterId) return;
                          navigate({
                            to: "/clusters/$clusterId/instances/$id",
                            params: { clusterId, id: instance.id },
                          });
                        }}
                      >
                        <TableCell className="h-16 max-w-[140px] align-middle font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate text-sm font-semibold">{instance.tag}</span>
                            <span className="truncate text-[11px] text-muted-foreground">{timeZone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="h-16 max-w-[80px] align-middle">
                          <span className="truncate font-mono text-sm text-muted-foreground">{instance.address}</span>
                        </TableCell>
                        <TableCell className="h-16 max-w-[80px] align-middle">
                          <span className="text-sm text-muted-foreground">
                            {instance.createdAt ? (
                              <TimeAgo date={instance.createdAt} formatter={formatWithoutSuffix} />
                            ) : (
                              "N/A"
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="h-16 max-w-[80px] align-middle text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={e => {
                                  e.stopPropagation();
                                  if (!clusterId) return;
                                  navigate({
                                    to: "/clusters/$clusterId/instances/$id",
                                    params: { clusterId, id: instance.id },
                                    search: { tab: "settings" },
                                  });
                                }} className="cursor-pointer">
                                Settings
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}} className="cursor-pointer">
                                Restart
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                    })}

                {!isLoading && instances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No instances yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                {instances.length === 0
                  ? "No instances yet"
                  : instances.length === 1
                  ? "Showing 1 of 1 instance"
                  : `Showing ${startIndex + 1} to ${Math.min(endIndex, instances.length)} of ${instances.length} instances`}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="h-8 w-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
