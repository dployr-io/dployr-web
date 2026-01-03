// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, Instance, InstanceStream, InstanceStreamUpdateV1 } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, CirclePlus, MoreHorizontal, Settings2, RotateCcw, Trash2, Copy, Check, Boxes, HardDrive } from "lucide-react";
import TimeAgo from "react-timeago";
import { formatWithoutSuffix } from "@/lib/utils";
import { useInstances } from "@/hooks/use-instances";
import { useInstancesForm } from "@/hooks/use-instances-form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUrlState } from "@/hooks/use-url-state";
import { useClusterId } from "@/hooks/use-cluster-id";
import { use2FA } from "@/hooks/use-2fa";
import { TwoFactorDialog } from "@/components/two-factor-dialog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useInstanceStream } from "@/hooks/use-instance-stream";
import { StatusBadge } from "@/components/status-badge";
import { DiskBrowserDialog } from "@/components/disk-browser";

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
  const { paginatedInstances, instances, isLoading, currentPage, totalPages, startIndex, endIndex, goToPage, goToPreviousPage, goToNextPage, addInstance, deleteInstance } = useInstances();
  const clusterId = useClusterId();
  const navigate = Route.useNavigate();
  const { useInstancesDialog } = useUrlState();
  const [{ new: isNewInstanceOpen }, setInstancesDialog] = useInstancesDialog();
  const { address, tag, setAddress, setTag, getFormData } = useInstancesForm();
  const twoFactor = use2FA({ enabled: true });
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdInstanceData, setCreatedInstanceData] = useState<{ tag: string; token: string } | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<"linux" | "windows">("linux");
  const [copied, setCopied] = useState(false);
  
  const queryClient = useQueryClient();
  useInstanceStream(); // Ensure stream is active
  
  // Get instance status data from cache using instance tag
  const getInstanceStatus = (instanceTag: string): InstanceStreamUpdateV1 | null => {
    const data = queryClient.getQueryData<InstanceStream>(["instance-status", instanceTag]);
    if (data?.update?.schema === "v1") {
      return data.update as InstanceStreamUpdateV1;
    }
    return null;
  };

  async function handleCreateInstance() {
    const data = getFormData();
    if (!data) return;

    try {
      const result = await addInstance.mutateAsync({
        address: data.address,
        tag: data.tag,
        publicKey: data.publicKey,
      });

      const token = (result as any)?.data?.token as string | undefined;
      if (token) {
        setCreatedInstanceData({ tag: data.tag, token });
        setShowSuccessDialog(true);
      }

      setInstancesDialog({ new: false });
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const handleCopyInstallCommand = async () => {
    if (!createdInstanceData) return;
    const command = selectedPlatform === "linux"
      ? `curl -sSL https://raw.githubusercontent.com/dployr-io/dployr/master/install.sh | bash -s -- --token "${createdInstanceData.token}" --instance "${createdInstanceData.tag}"`
      : `iwr "https://raw.githubusercontent.com/dployr-io/dployr/master/install.ps1" -OutFile install.ps1\n.\\install.ps1 -Token "${createdInstanceData.token}" -Instance "${createdInstanceData.tag}"`;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full items-start justify-between gap-4 px-9">
            <div className="flex flex-col gap-1">
              <p className="text-2xl font-black">Instances</p>
              <p className="text-sm text-muted-foreground">Manage dployr instances in this cluster.</p>
            </div>

            <Dialog open={isNewInstanceOpen} onOpenChange={open => setInstancesDialog({ new: open })}>
              <DialogTrigger asChild>
                <Button>
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
                  <TableHead className="w-[200px]">Instance</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Services</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[60px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 3 }).map((_, idx) => (
                      <TableRow key={`skeleton-${idx}`} className="h-16">
                        <TableCell className="h-16 max-w-[200px] align-middle font-medium">
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell className="h-16 max-w-[100px] align-middle">
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </TableCell>
                        <TableCell className="h-16 max-w-[100px] align-middle">
                          <Skeleton className="h-4 w-8" />
                        </TableCell>
                        <TableCell className="h-16 max-w-[120px] align-middle">
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell className="h-16 max-w-[60px] align-middle text-right">
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : paginatedInstances.map((instance: Instance) => {
                      const status = getInstanceStatus(instance.tag);
                      const servicesCount = status?.services?.length ?? 0;
                      const hasFs = !!status?.fs;
                      const disks = status?.debug?.system?.disks;
                      
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
                        <TableCell className="h-16 max-w-[200px] align-middle font-medium">
                          <div className="flex flex-col gap-0.5">
                            <span className="truncate text-sm font-semibold">{instance.tag}</span>
                            <span className="truncate font-mono text-[11px] text-muted-foreground">{instance.address}</span>
                          </div>
                        </TableCell>
                        <TableCell className="h-16 max-w-[100px] align-middle">
                          {status ? (
                            <StatusBadge status={status.status} variant="compact" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="h-16 max-w-[100px] align-middle">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5">
                                <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">{servicesCount}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {servicesCount === 0 ? "No services running" : `${servicesCount} service${servicesCount > 1 ? "s" : ""} running`}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="h-16 max-w-[120px] align-middle">
                          <span className="text-sm text-muted-foreground">
                            {(() => {
                              if (!instance.createdAt) return "N/A";

                              const createdDate = new Date(Number(instance.createdAt));
                              if (Number.isNaN(createdDate.getTime())) return "N/A";

                              return <TimeAgo date={createdDate} formatter={formatWithoutSuffix} />;
                            })()}
                          </span>
                        </TableCell>
                        <TableCell className="h-16 max-w-[60px] align-middle text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!clusterId) return;
                                  navigate({
                                    to: "/clusters/$clusterId/instances/$id",
                                    params: { clusterId, id: instance.id },
                                    search: { tab: "settings" },
                                  });
                                }}
                                className="cursor-pointer"
                              >
                                <Settings2 className="h-4 w-4 text-foreground" />
                                Settings
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}} className="cursor-pointer">
                                <RotateCcw className="h-4 w-4 text-foreground" />
                                Restart
                              </DropdownMenuItem>
                              {(hasFs || (disks && disks.length > 0)) && (
                                <DropdownMenuItem
                                  onClick={e => {
                                    e.stopPropagation();
                                  }}
                                  className="cursor-pointer p-0"
                                  asChild
                                >
                                  <div>
                                    <DiskBrowserDialog
                                      disks={disks}
                                      fs={status?.fs}
                                      trigger={
                                        <button className="flex w-full items-center gap-2 px-2 py-1.5 text-sm">
                                          <HardDrive className="h-4 w-4 text-foreground" />
                                          Browse Files
                                        </button>
                                      }
                                    />
                                  </div>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation();
                                  twoFactor.requireAuth(async () => {
                                    try {
                                      await deleteInstance.mutateAsync({ id: instance.id });
                                    } catch {
                                      // Error handling is managed by the mutation's onError
                                    }
                                  });
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                                Remove
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

          <TwoFactorDialog
            open={twoFactor.isOpen}
            onOpenChange={twoFactor.setIsOpen}
            onVerify={twoFactor.verify}
            isSubmitting={twoFactor.isVerifying}
          />

          <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Instance Created Successfully</DialogTitle>
                <DialogDescription>
                  Run the command below on your instance to complete the installation.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Platform Selector */}
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium min-w-[80px]">Platform</Label>
                  <Select value={selectedPlatform} onValueChange={(value: "linux" | "windows") => setSelectedPlatform(value)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linux">Linux / macOS</SelectItem>
                      <SelectItem value="windows">Windows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Install Command */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Install Command</Label>
                    <Button
                      type="button"
                      variant={copied ? "default" : "outline"}
                      size="sm"
                      onClick={handleCopyInstallCommand}
                    >
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="w-full overflow-x-auto rounded-md border bg-muted p-4">
                    <pre className="font-mono text-sm whitespace-pre-wrap break-all">
                      {selectedPlatform === "linux" ? (
                        <code>curl -sSL https://raw.githubusercontent.com/dployr-io/dployr/master/install.sh | bash -s -- --token "{createdInstanceData?.token}" --instance "{createdInstanceData?.tag}"</code>
                      ) : (
                        <code>
                          iwr "https://raw.githubusercontent.com/dployr-io/dployr/master/install.ps1" -OutFile install.ps1{"\n"}
                          .\install.ps1 -Token "{createdInstanceData?.token}" -Instance "{createdInstanceData?.tag}"
                        </code>
                      )}
                    </pre>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" onClick={() => setShowSuccessDialog(false)}>
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
