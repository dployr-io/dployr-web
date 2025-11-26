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
export const Route = createFileRoute("/clusters/$clusterId/instances")({
  component: Instances,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Instances",
    href: "/instances",
  },
];

function getStatusChipClasses(status: InstanceStatus) {
  switch (status) {
    case "running":
      return "bg-green-500/25 text-green-600 border-green-400/40 dark:bg-green-500/30 dark:text-green-200 dark:border-green-400/50 shadow-green-500/15";
    default:
      return "bg-red-500/25 text-red-600 border-red-400/40 dark:bg-red-500/30 dark:text-red-200 dark:border-red-400/50 shadow-red-500/15";
  }
}

function UsageBar({ value }: { value: number | null | undefined }) {
  const numericValue = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  const clamped = Math.max(0, Math.min(100, numericValue));
  return (
    <div className="h-1.5 w-full rounded-full bg-neutral-200/70 dark:bg-neutral-800/80 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500/80 via-blue-400/90 to-blue-300/90 shadow-blue-900/30"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function Instances() {
  const { paginatedInstances, instances, isLoading, currentPage, totalPages, startIndex, endIndex, goToPage, goToPreviousPage, goToNextPage, addInstance } = useInstances();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { useInstancesDialog } = useUrlState();
  const [{ new: isNewInstanceOpen }, setInstancesDialog] = useInstancesDialog();
  const { address, tag, publicKey, validationError, setAddress, setTag, setPublicKey, getFormData } = useInstancesForm();

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
                  <div className="space-y-4">
                    <Label htmlFor="instance-public-key">Public key</Label>
                    <textarea
                      id="instance-public-key"
                      placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC"
                      value={publicKey}
                      onChange={e => setPublicKey(e.target.value)}
                      maxLength={255}
                      rows={3}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  {validationError && (
                    <p className="text-sm text-red-500 pt-2">{validationError}</p>
                  )}
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
                <TableRow className="h-14">
                  <TableHead className="w-[240px]">Instance</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[320px]">Resources</TableHead>
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
                        <TableCell className="h-16 max-w-[130px] align-middle">
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </TableCell>
                        <TableCell className="h-16 max-w-[320px] align-middle">
                          <Skeleton className="h-4 w-48" />
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
                      const statusLabel = instance.status
                        ? instance.status.charAt(0).toUpperCase() + instance.status.slice(1)
                        : "Unknown";

                      const cpuCount = instance.cpuCount ?? 0;
                      const memorySizeMb = instance.memorySizeMb ?? 0;

                      const cpuUsage = instance.resources?.cpu;
                      const memoryUsage = instance.resources?.memory;
                      const diskUsage = instance.resources?.disk;

                      return (
                      <TableRow key={instance.id} className="h-16">
                        <TableCell className="h-16 max-w-[140px] align-middle font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate text-sm font-semibold">{instance.tag}</span>
                            <span className="truncate text-[11px] text-muted-foreground">{timeZone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="h-16 max-w-[130px] align-middle">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold backdrop-blur-md border shadow-sm ${getStatusChipClasses(
                              instance.status ?? "stopped",
                            )}`}
                          >
                            {statusLabel}
                          </span>
                        </TableCell>
                        <TableCell className="h-16 max-w-[260px] align-middle">
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span className="text-[11px] text-foreground">
                              {cpuCount} CPU{cpuCount !== 1 ? "s" : ""} · {memorySizeMb} MB
                            </span>
                            <div className="flex items-center gap-3">
                              <div className="w-20">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span>CPU</span>
                                  <span>{cpuUsage ?? 0}%</span>
                                </div>
                                <UsageBar value={cpuUsage} />
                              </div>
                              <div className="w-20">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span>Mem</span>
                                  <span>{memoryUsage ?? 0}%</span>
                                </div>
                                <UsageBar value={memoryUsage} />
                              </div>
                              <div className="w-20">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span>Disk</span>
                                  <span>{diskUsage ?? 0}%</span>
                                </div>
                                <UsageBar value={diskUsage} />
                              </div>
                            </div>
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
                              <DropdownMenuItem onClick={() => {}} className="cursor-pointer">
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
