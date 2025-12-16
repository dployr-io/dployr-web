// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem } from "@/types";
import { Button } from "@/components/ui/button";
import TimeAgo from "react-timeago";
import { ArrowUpRightIcon, ChevronLeft, ChevronRight, CirclePlus, Factory, FileText, Rocket, Trash } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RxGithubLogo } from "react-icons/rx";
import { FaGitlab } from "react-icons/fa";
import { getRuntimeIcon } from "@/lib/runtime-icon";
import { StatusChip } from "@/components/status-chip";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useInstances } from "@/hooks/use-instances";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { useRemotes } from "@/hooks/use-remotes";
import { ProtectedRoute } from "@/components/protected-route";
import { formatWithoutSuffix } from "@/lib/utils";
import { APP_LINKS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateServiceForm } from "@/components/create-service";
import { CodeEditor } from "@/components/ui/code-editor";
import { useDeploymentCreator } from "@/hooks/use-deployment-creator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getFileExtension } from "@/lib/blueprint-schema";
export const Route = createFileRoute("/clusters/$clusterId/deployments/")({
  component: Deployments,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Deployments",
    href: "/deployments",
  },
];

function Deployments() {
  const { instances } = useInstances();
  const { remotes, isLoading: isRemotesLoading } = useRemotes();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("all");
  const isAllInstances = selectedInstanceId === "all";
  const targetInstanceId = isAllInstances ? instances?.[0]?.id : selectedInstanceId;
  const { deployments: singleInstanceDeployments, isConnected } = useInstanceStatus(targetInstanceId);
  
  // Aggregate deployments from all instances if "all" is selected
  const allDeployments = isAllInstances 
    ? instances.flatMap((_, idx) => {
        if (idx === 0) return singleInstanceDeployments;
        return [];
      })
    : singleInstanceDeployments;
  
  const deployments = allDeployments;
  const isDeploymentsLoading = !isConnected && deployments.length === 0;
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(deployments.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDeployments = deployments.slice(startIndex, endIndex);
  
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  // Use the deployment creator hook for all creation state and handlers
  const {
    isCreating,
    showExitDialog,
    setShowExitDialog,
    showDrafts,
    setShowDrafts,
    validationErrors,
    currentTab,
    setTab,
    currentDraft,
    drafts,
    blueprintContent,
    blueprintFormat,
    schemaErrors,
    allActiveDomains,
    isLoadingAllDomains,
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
  } = useDeploymentCreator();

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full flex-col gap-6 px-9">
            {!isCreating ? (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-2xl font-black">Deployments</p>
                    <p className="text-sm font-normal text-muted-foreground">Manage your deployments here</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select instance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All Instances
                        </SelectItem>
                        {instances.map(instance => (
                          <SelectItem key={instance.id} value={instance.id}>
                            {instance.tag || instance.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {drafts.length > 0 && (
                      <Button variant="outline" onClick={() => setShowDrafts(!showDrafts)}>
                        <FileText className="h-4 w-4" />
                        Drafts ({drafts.length})
                      </Button>
                    )}
                    <Button onClick={handleStartCreate}>
                      <CirclePlus className="h-4 w-4" />
                      Deploy Service
                    </Button>
                  </div>
                </div>

                {/* Drafts Section */}
                {showDrafts && drafts.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <h3 className="mb-3 text-sm font-medium">Saved Drafts</h3>
                    <div className="space-y-2">
                      {drafts.map(draft => (
                        <div
                          key={draft.id}
                          className="flex items-center justify-between rounded-md border bg-background p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleLoadDraft(draft.id)}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{draft.name || "Untitled"}</span>
                            <span className="text-xs text-muted-foreground">
                              {draft.source} • {draft.runtime} • Last edited <TimeAgo date={draft.updatedAt} />
                            </span>
                          </div>
                          <Button variant="destructive" size="sm" onClick={e => handleDeleteDraft(draft.id, e)} className="cursor-pointer">
                            <Trash className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deployments?.length === 0 && !isDeploymentsLoading ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Factory />
                      </EmptyMedia>
                      <EmptyTitle>No deployments yet</EmptyTitle>
                      <EmptyDescription>You don&apos;t have any deployments yet. Get started by deploying your first service.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <div className="flex gap-2">
                        <Button onClick={handleStartCreate}>
                          <CirclePlus className="h-4 w-4" />
                          Deploy Service
                        </Button>
                        <Button variant="link" asChild className="text-muted-foreground" size="sm">
                          <a href={APP_LINKS.DOCS.DEPLOYMENTS}>
                            Learn More <ArrowUpRightIcon />
                          </a>
                        </Button>
                      </div>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <>
                    <Table className="overflow-hidden rounded-t-lg">
                      <TableHeader className="gap-2 rounded-t-xl bg-neutral-50 p-2 dark:bg-neutral-900">
                        <TableRow className="h-14">
                          <TableHead className="h-14 w-60 align-middle">Name</TableHead>
                          <TableHead className="h-14 align-middle">Duration</TableHead>
                          <TableHead className="h-14 align-middle">Status</TableHead>
                          <TableHead className="h-14 align-middle">Runtime</TableHead>
                          <TableHead className="h-14 align-middle">Remote</TableHead>
                          <TableHead className="h-14 w-[200px] text-right align-middle whitespace-nowrap">Run Command</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!isDeploymentsLoading
                          ? paginatedDeployments.map(deployment => (
                              <TableRow
                                key={deployment.id}
                                className="h-16 cursor-pointer"
                                onClick={() => {
                                  window.location.href = `/deployments/${deployment.id}`;
                                }}
                              >
                                <TableCell className="h-16 w-60 overflow-hidden align-middle font-medium">
                                  <span className="block truncate">{String(deployment.config?.name || "-")}</span>
                                </TableCell>
                                <TableCell className="h-16 w-[120px] align-middle">
                                  {deployment.status === "completed" || deployment.status === "failed" ? (
                                    deployment.updated_at && deployment.created_at ? (
                                      <span className="inline-block">
                                        {(() => {
                                          const ms = new Date(deployment.updated_at).getTime() - new Date(deployment.created_at).getTime();
                                          const seconds = Math.floor(ms / 1000);
                                          const minutes = Math.floor(seconds / 60);
                                          const hours = Math.floor(minutes / 60);
                                          const days = Math.floor(hours / 24);

                                          if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
                                          if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
                                          if (minutes > 0) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
                                          return `${seconds} second${seconds !== 1 ? "s" : ""}`;
                                        })()}
                                      </span>
                                    ) : (
                                      <>-</>
                                    )
                                  ) : (
                                    <>
                                      <TimeAgo date={deployment.created_at} formatter={formatWithoutSuffix} />
                                    </>
                                  )}
                                </TableCell>
                                <TableCell className="h-16 w-[120px] gap-2 align-middle">
                                  <StatusChip status={deployment.status} />
                                </TableCell>
                                <TableCell className="h-16 w-[120px] align-middle">
                                  <div className="flex items-center gap-2">
                                    {getRuntimeIcon(deployment.config?.runtime?.type || "custom")}
                                    <span>{String(deployment.config?.runtime?.type || "-")}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="h-16 max-w-[320px] overflow-hidden align-middle">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {!deployment.config?.remote?.url ? (
                                      <div className="max-w-[320px] overflow-hidden align-middle">
                                        <Skeleton className="h-4 w-40" />
                                      </div>
                                    ) : (
                                      <>
                                        {deployment.config?.remote?.url?.includes("github") ? <RxGithubLogo /> : <FaGitlab />}
                                        <span className="truncate">{deployment.config?.remote ? deployment.config.remote.url?.replace(/^https?:\/\//, "") || "-" : "-"}</span>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="h-16 w-[200px] overflow-hidden text-right align-middle">
                                  <span className="block truncate text-right">{String(deployment.config?.run_cmd || "-")}</span>
                                </TableCell>
                              </TableRow>
                            ))
                          : Array.from({ length: 3 }).map((_, idx) => (
                              <TableRow key={`skeleton-${idx}`} className="h-16">
                                <TableCell className="h-16 max-w-60 overflow-hidden align-middle font-medium">
                                  <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell className="h-16 align-middle">
                                  <Skeleton className="h-4 w-16" />
                                </TableCell>
                                <TableCell className="h-16 align-middle">
                                  <Skeleton className="h-4 w-16" />
                                </TableCell>
                                <TableCell className="h-16 align-middle">
                                  <Skeleton className="h-4 w-20" />
                                </TableCell>
                                <TableCell className="h-16 max-w-[320px] overflow-hidden align-middle">
                                  <Skeleton className="h-4 w-40" />
                                </TableCell>
                                <TableCell className="h-16 w-[200px] overflow-hidden text-right align-middle">
                                  <Skeleton className="ml-auto h-4 w-24" />
                                </TableCell>
                              </TableRow>
                            ))}
                      </TableBody>
                    </Table>

                    <div className="flex items-center justify-between px-2 py-4">
                      <div className="text-sm text-muted-foreground">
                        {(deployments || []).length === 0
                          ? "No deployments found"
                          : deployments!.length === 1
                            ? "Showing 1 of 1 deployment"
                            : `Showing ${startIndex + 1} to ${Math.min(endIndex, (deployments || []).length || 0)} of ${(deployments || []).length} deployments`}{" "}
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
              <>
                <Tabs value={currentTab} onValueChange={value => setTab({ tab: value as "quick" | "blueprint-editor" })} className="flex min-h-0 flex-1 flex-col w-full">
                  <div className="flex items-center justify-between">
                    <TabsList className="flex justify-between w-auto">
                      <TabsTrigger value="quick">Quick Deploy</TabsTrigger>
                      <TabsTrigger value="blueprint-editor">Blueprint Editor</TabsTrigger>
                    </TabsList>

                    <Button variant="outline" size="sm" onClick={handleBack} className="h-8 px-3 text-xs">
                      <ChevronLeft className="h-3 w-3" /> Back
                    </Button>
                  </div>

                  <TabsContent value="quick" className="my-6 space-y-4">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="instance">Target Instance <span className="text-destructive">*</span></Label>
                        <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
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
                        availableDomains={allActiveDomains.map(d => ({ domain: d.domain, provider: d.provider }))}
                        isLoadingDomains={isLoadingAllDomains}
                        envVars={currentDraft?.env_vars || {}}
                        secrets={currentDraft?.secrets || {}}
                        instanceId={selectedInstanceId}
                        setField={setField}
                        onSourceValueChanged={value => updateDraft("source", value)}
                        onRuntimeValueChanged={value => updateDraft("runtime", value)}
                        onDeploy={handleDeploy}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="blueprint-editor" className="my-6 flex flex-col gap-4">
                    <CodeEditor
                      value={blueprintContent}
                      onChange={handleBlueprintChange}
                      language={blueprintFormat}
                      filename={`blueprint.${getFileExtension(blueprintFormat)}`}
                      onFormat={formatBlueprint}
                      onReset={resetBlueprint}
                      onFormatChange={handleFormatChange}
                      errors={schemaErrors}
                      showFormatSelector
                    />
                    <div className="flex justify-end">
                      <Button onClick={() => selectedInstanceId && handleDeploy(selectedInstanceId)} disabled={schemaErrors.length > 0 || !selectedInstanceId} size="lg">
                        <Rocket className="h-4 w-4" />
                        Deploy
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </AppLayout>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>You have an unfinished deployment. Would you like to save it as a draft and continue later?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleDiscardAndExit}>
              Discard
            </Button>
            <Button onClick={handleSaveAndExit}>Save Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
