// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import "@/css/app.css";
import "@/css/code-editor.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowUpRightIcon, BoxesIcon, ChevronLeft, ChevronRight, ExternalLink, FileText, Globe, Rocket, Trash } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useServices } from "@/hooks/use-services";
import { ProtectedRoute } from "@/components/protected-route";
import { Skeleton } from "@/components/ui/skeleton";
import TimeAgo from "react-timeago";
import { StatusBadge } from "@/components/status-badge";
import { useClusters } from "@/hooks/use-clusters";
import { useQueryClient } from "@tanstack/react-query";
import type { NormalizedInstanceData } from "@/types";
import { useUrlState } from "@/hooks/use-url-state";
import { useInstances } from "@/hooks/use-instances";
import { useRemotes } from "@/hooks/use-remotes";
import { useDeploymentCreator } from "@/hooks/use-deployment-creator";
import { CreateServiceForm } from "@/components/create-service";
import { CodeEditor } from "@/components/ui/code-editor-cm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getFileExtension } from "@/lib/blueprint-schema";

export const Route = createFileRoute("/clusters/$clusterId/services/")({
  component: Services,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Services",
    href: "/services",
  },
];

function Services() {
  const { useServicesUrlState } = useUrlState();
  const [{ page: servicesPage }, setServicesUrlState] = useServicesUrlState();
  const currentPageRaw = servicesPage ?? 1;

  const { paginatedServices, services, isLoading, currentPage, totalPages, goToPage, goToPreviousPage, goToNextPage } = useServices(null, {
    externalPage: currentPageRaw,
    onPageChange: page => setServicesUrlState({ page }),
  });

  const { clusterId } = useClusters();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { instances } = useInstances();
  const { remotes, isLoading: isRemotesLoading } = useRemotes();

  const [isCreating, setIsCreating] = useState(false);
  const [quickDeployInstanceId, setQuickDeployInstanceId] = useState<string>("");
  const [blueprintInstanceId, setBlueprintInstanceId] = useState<string>("");
  const [showDrafts, setShowDrafts] = useState(false);

  const {
    showExitDialog,
    setShowExitDialog,
    validationErrors,
    currentTab,
    setTab,
    currentDraft,
    drafts,
    blueprintContent,
    blueprintFormat,
    schemaErrors,
    domains,
    isLoadingDomains,
    handleStartCreate,
    handleBack,
    handleSaveAndExit,
    handleDiscardAndExit,
    handleLoadDraft,
    handleDeleteDraft,
    handleDeploy,
    setField,
    updateDraft,
    handleBlueprintChange,
    handleFormatChange,
    formatBlueprint,
    resetBlueprint,
    syncBlueprintFromDraft,
    syncDraftFromBlueprint,
  } = useDeploymentCreator(quickDeployInstanceId);

  // Auto-select most recent instance when creation starts
  useEffect(() => {
    if (!quickDeployInstanceId && instances.length > 0 && isCreating) {
      const mostRecent = instances.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
      setQuickDeployInstanceId(mostRecent.id);
      setBlueprintInstanceId(mostRecent.id);
    }
  }, [instances, quickDeployInstanceId, isCreating]);

  const handleStartDeploy = useCallback(() => {
    handleStartCreate();
    setIsCreating(true);
  }, [handleStartCreate]);

  const handleBackClick = useCallback(() => {
    handleBack();
    setIsCreating(false);
  }, [handleBack]);

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

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full flex-col gap-6 px-9">
            {!isCreating ? (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-2xl font-black">Services</p>
                    <p className="text-sm font-normal text-muted-foreground">Manage your services here</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {drafts.length > 0 && (
                      <Button variant="outline" onClick={() => setShowDrafts(!showDrafts)}>
                        <FileText className="h-4 w-4" />
                        Drafts ({drafts.length})
                      </Button>
                    )}
                    <Button onClick={handleStartDeploy}>Deploy Service</Button>
                  </div>
                </div>

                {showDrafts && drafts.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="space-y-2">
                      {drafts.map(draft => (
                        <div
                          key={draft.id}
                          className="flex items-center justify-between rounded-md border bg-background p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            handleLoadDraft(draft.id);
                            setIsCreating(true);
                          }}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{draft.name || "Untitled"}</span>
                            <span className="text-xs text-muted-foreground">
                              {draft.source} · {draft.runtime} · Last edited <TimeAgo date={draft.updated_at} />
                            </span>
                          </div>
                          <Button variant="destructive" size="sm" onClick={e => handleDeleteDraft(draft.id, e)}>
                            <Trash className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                          <Button onClick={handleStartDeploy}>Deploy Service</Button>
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
                          <TableHead className="h-14 align-middle">Instance</TableHead>
                          <TableHead className="h-14 align-middle">Domains</TableHead>
                          <TableHead className="h-14 w-[140px] text-right align-middle">Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!isLoading && paginatedServices.length > 0
                          ? paginatedServices.map(service => (
                              <TableRow
                                key={service.id}
                                className="h-16 cursor-pointer"
                                onClick={() => router.navigate({ to: "/clusters/$clusterId/services/$id", params: { clusterId, id: service.id } })}
                              >
                                <TableCell className="h-16 max-w-[200px] align-middle font-medium">
                                  <span className="truncate text-sm font-semibold">{service.name}</span>
                                </TableCell>
                                <TableCell className="h-16 max-w-[100px] align-middle">
                                  <StatusBadge status="running" variant="compact" />
                                </TableCell>
                                <TableCell className="h-16 align-middle">
                                  {service._instanceName ? (
                                    <span className="inline-flex items-center rounded-full border border-sidebar-border px-2 py-0.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                                      {service._instanceName}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="h-16 align-middle">
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <span className="truncate text-xs font-mono text-muted-foreground">{getServiceDomain(service)}</span>
                                    <a
                                      href={`https://${getServiceDomain(service)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-foreground transition-colors"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                </TableCell>
                                <TableCell className="h-16 w-[140px] text-right align-middle whitespace-nowrap">
                                  <TimeAgo date={service.updatedAt} />
                                </TableCell>
                              </TableRow>
                            ))
                          : Array.from({ length: 3 }).map((_, idx) => (
                              <TableRow key={`skeleton-${idx}`} className="h-16">
                                <TableCell className="h-16 max-w-[200px] overflow-hidden align-middle font-medium">
                                  <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell className="h-16 max-w-[100px] align-middle">
                                  <Skeleton className="h-5 w-16 rounded-full" />
                                </TableCell>
                                <TableCell className="h-16 max-w-20 align-middle">
                                  <Skeleton className="h-4 w-12" />
                                </TableCell>
                                <TableCell className="h-16 max-w-[120px] align-middle">
                                  <Skeleton className="h-4 w-16" />
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
                        {services.length === 0 ? "No services found" : services.length === 1 ? "Showing 1 of 1 service" : `Showing ${paginatedServices.length} of ${services.length} services`}
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
              </>
            ) : (
              <Tabs
                value={currentTab}
                onValueChange={value => {
                  const newTab = value as "quick" | "blueprint-editor";
                  if (newTab === "blueprint-editor" && currentTab === "quick") {
                    syncBlueprintFromDraft();
                  } else if (newTab === "quick" && currentTab === "blueprint-editor") {
                    syncDraftFromBlueprint();
                  }
                  setTab({ tab: newTab });
                }}
                className="flex min-h-0 flex-1 flex-col w-full"
              >
                <div className="flex items-center justify-between">
                  <TabsList className="flex justify-between w-auto">
                    <TabsTrigger value="quick">Quick Deploy</TabsTrigger>
                    <TabsTrigger value="blueprint-editor">Blueprint Editor</TabsTrigger>
                  </TabsList>
                  <Button size="sm" variant="ghost" onClick={handleBackClick} className="h-8 px-3 text-muted-foreground">
                    <ChevronLeft /> Back
                  </Button>
                </div>

                <TabsContent value="quick" className="my-6 space-y-4">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="instance">
                        Target Instance <span className="text-destructive">*</span>
                      </Label>
                      <Select value={quickDeployInstanceId} onValueChange={setQuickDeployInstanceId}>
                        <SelectTrigger id="instance">
                          <SelectValue placeholder="Select an instance" />
                        </SelectTrigger>
                        <SelectContent>
                          {instances.map(instance => (
                            <SelectItem key={instance.id} value={instance.id}>
                              {instance.tag || instance.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <CreateServiceForm
                      name={currentDraft?.name || ""}
                      nameError={validationErrors.name || ""}
                      description={currentDraft?.description || ""}
                      version={currentDraft?.version || ""}
                      image={currentDraft?.image || ""}
                      imageError={validationErrors.image || ""}
                      buildCmd={currentDraft?.build_cmd || ""}
                      buildCmdError={validationErrors.build_cmd || ""}
                      staticDir={currentDraft?.static_dir || ""}
                      staticDirError={validationErrors.static_dir || ""}
                      remoteError={validationErrors.remote || ""}
                      workingDir={currentDraft?.working_dir || ""}
                      workingDirError={validationErrors.working_dir || ""}
                      type={currentDraft?.type || "web"}
                      typeError={validationErrors.type || ""}
                      runtime={currentDraft?.runtime || "nodejs"}
                      runtimeError={validationErrors.runtime || ""}
                      remote={currentDraft?.remote ? { url: currentDraft.remote.url, branch: currentDraft.remote.branch, commit_hash: currentDraft.remote.commit_hash, avatar_url: "" } : null}
                      remotes={remotes}
                      isRemotesLoading={isRemotesLoading}
                      runCmd={currentDraft?.run_cmd || ""}
                      runCmdError={validationErrors.run_cmd || ""}
                      source={currentDraft?.source || "remote"}
                      processing={false}
                      errors={validationErrors}
                      port={currentDraft?.port ?? null}
                      portError={validationErrors.port || ""}
                      domain={currentDraft?.domain || ""}
                      domainError={validationErrors.domain || ""}
                      availableDomains={domains?.map(d => ({ domain: d.domain, provider: d.provider }))}
                      isLoadingDomains={isLoadingDomains}
                      envVars={currentDraft?.env_vars || {}}
                      secrets={currentDraft?.secrets || {}}
                      clusterId={clusterId!}
                      instanceId={quickDeployInstanceId}
                      setField={setField}
                      onSourceValueChanged={value => {
                        updateDraft("source", value);
                        if (value === "image") {
                          updateDraft("remote", { url: "", branch: "main", commit_hash: "" });
                          updateDraft("run_cmd", "");
                          updateDraft("build_cmd", "");
                          updateDraft("working_dir", "");
                        } else if (value === "remote") {
                          updateDraft("image", "");
                        }
                      }}
                      onRuntimeValueChanged={value => updateDraft("runtime", value)}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          const instance = instances.find(i => i.id === quickDeployInstanceId);
                          if (instance) {
                            handleDeploy(instance.tag);
                            setIsCreating(false);
                            queryClient.invalidateQueries({ queryKey: ["instance-status", instance.tag] });
                          }
                        }}
                        disabled={!quickDeployInstanceId || Object.keys(validationErrors).length > 0}
                        size="lg"
                      >
                        <Rocket className="h-4 w-4" />
                        Deploy
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="blueprint-editor" className="my-6 flex flex-col gap-4">
                  <CodeEditor
                    value={blueprintContent}
                    onChange={handleBlueprintChange}
                    language={blueprintFormat}
                    filename={`${currentDraft?.name || "service"}.${getFileExtension(blueprintFormat)}`}
                    onFormat={formatBlueprint}
                    onReset={resetBlueprint}
                    onFormatChange={handleFormatChange}
                    errors={schemaErrors}
                    showFormatSelector
                    instanceSelector={
                      <Select value={blueprintInstanceId} onValueChange={setBlueprintInstanceId}>
                        <SelectTrigger className="h-6 bg-transparent border-neutral-600 text-xs text-neutral-300 w-auto min-w-fit max-w-none">
                          <SelectValue placeholder="Select instance" />
                        </SelectTrigger>
                        <SelectContent>
                          {instances.map(instance => (
                            <SelectItem key={instance.id} value={instance.id}>
                              {instance.tag || instance.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        const instance = instances.find(i => i.id === blueprintInstanceId);
                        if (instance) {
                          handleDeploy(instance.tag);
                          setIsCreating(false);
                          queryClient.invalidateQueries({ queryKey: ["instance-status", instance.tag] });
                        }
                      }}
                      disabled={schemaErrors.length > 0 || !blueprintInstanceId}
                      size="lg"
                    >
                      <Rocket className="h-4 w-4" />
                      Deploy
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </AppLayout>

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>You have an unfinished deployment. Would you like to save it as a draft and continue later?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => { handleDiscardAndExit(); setIsCreating(false); }}>
              Discard
            </Button>
            <Button onClick={() => { handleSaveAndExit(); setIsCreating(false); }}>Save Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
