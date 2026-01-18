// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUrlState } from "@/hooks/use-url-state";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem } from "@/types";
import { Button } from "@/components/ui/button";
import TimeAgo from "react-timeago";
import { ArrowUpRightIcon, ChevronLeft, ChevronRight, Factory, FileText, Rocket, Trash } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RxGithubLogo } from "react-icons/rx";
import { FaGitlab } from "react-icons/fa";
import { getRuntimeIcon } from "@/lib/runtime-icon";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useInstances } from "@/hooks/use-instances";
import { useDeployments } from "@/hooks/use-deployments";
import { useRemotes } from "@/hooks/use-remotes";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/protected-route";
import { formatWithoutSuffix } from "@/lib/utils";
import { APP_LINKS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateServiceForm } from "@/components/create-service";
import { CodeEditor } from "@/components/ui/code-editor-cm";
import { useDeploymentCreator } from "@/hooks/use-deployment-creator";
import "@/css/code-editor.css";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getFileExtension } from "@/lib/blueprint-schema";
import { StatusBadge } from "@/components/status-badge";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { instances } = useInstances();
  const { remotes, isLoading: isRemotesLoading } = useRemotes();
  const { useDeploymentsUrlState } = useUrlState();
  const [{ instance: selectedInstanceId, new: isCreatingFromUrl }, setInstanceFilter] = useDeploymentsUrlState();
  const { clusterId } = Route.useParams();
  const [blueprintInstanceId, setBlueprintInstanceId] = useState<string>("");
  const [quickDeployInstanceId, setQuickDeployInstanceId] = useState<string>("");

  const {
    isCreating,
    setIsCreating,
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

  // Use the fixed useDeployments hook - now properly aggregates from all instances
  const {
    paginatedDeployments,
    deployments,
    isLoading: isDeploymentsLoading,
    currentPage,
    totalPages,
    paginationRange,
    goToPage,
    goToPreviousPage,
    goToNextPage,
  } = useDeployments(selectedInstanceId);

  // Sync URL 'new' parameter to isCreating state
  useEffect(() => {
    if (isCreatingFromUrl && !isCreating) {
      handleStartCreate();
    } else if (!isCreatingFromUrl && isCreating) {
      setIsCreating(false);
    }
  }, [isCreatingFromUrl, isCreating, handleStartCreate, setIsCreating]);

  // Wrapper for back button that clears URL state
  const handleBackClick = useCallback(() => {
    handleBack();
    if (isCreatingFromUrl) {
      setInstanceFilter({ new: false });
    }
  }, [handleBack, isCreatingFromUrl, setInstanceFilter]);

  // Track previous isCreating state to detect when deployment widget gets disabled
  const prevIsCreatingRef = useRef(isCreating);
  
  useEffect(() => {
    if (prevIsCreatingRef.current === true && isCreating === false) {
      if (selectedInstanceId && selectedInstanceId !== 'all') {
        setInstanceFilter({ instance: 'all' });
      }
    }
    prevIsCreatingRef.current = isCreating;
  }, [isCreating, selectedInstanceId, setInstanceFilter]);

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
                    <Select value={selectedInstanceId} onValueChange={(value) => setInstanceFilter({ instance: value })}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select instance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Instances</SelectItem>
                        {instances.map(instance => (
                          <SelectItem key={instance.tag} value={instance.tag}>
                            {instance.tag}
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
                    <Button onClick={() => setInstanceFilter({ new: true })}>
                      Deploy Service
                    </Button>
                  </div>
                </div>

                {/* Drafts Section */}
                {showDrafts && drafts.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="space-y-2">
                      {drafts.map(draft => (
                        <div
                          key={draft.id}
                          className="flex items-center justify-between rounded-md border bg-background p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            handleLoadDraft(draft.id);
                            setInstanceFilter({ new: true });
                          }}
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
                        <Button onClick={() => setInstanceFilter({ new: true })}>
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
                          <TableHead className="h-14 align-middle">Deployed</TableHead>
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
                              <TableRow key={deployment.id} className="h-16 cursor-pointer">
                                <TableCell className="h-16 w-60 overflow-hidden align-middle font-medium">
                                  <Link to="/clusters/$clusterId/deployments/$id" params={{ clusterId, id: deployment.id }} className="block truncate">
                                    {String(deployment.name || "-")}
                                  </Link>
                                </TableCell>
                                <TableCell className="h-16 w-[120px] align-middle whitespace-nowrap">
                                  <Link to="/clusters/$clusterId/deployments/$id" params={{ clusterId, id: deployment.id }}><TimeAgo date={deployment.createdAt} /></Link>
                                </TableCell>
                                <TableCell className="h-16 w-[120px] align-middle whitespace-nowrap">
                                  <Link to="/clusters/$clusterId/deployments/$id" params={{ clusterId, id: deployment.id }} className="block">
                                    {deployment.status === "completed" || deployment.status === "failed" ? (
                                      deployment.updatedAt && deployment.createdAt ? (
                                        <span className="inline-block">
                                          {(() => {
                                            const ms = new Date(deployment.updatedAt).getTime() - new Date(deployment.createdAt).getTime();
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
                                        <TimeAgo date={deployment.createdAt} formatter={formatWithoutSuffix} />
                                      </>
                                    )}
                                  </Link>
                                </TableCell>
                                <TableCell className="h-16 w-[120px] gap-2 align-middle">
                                  <Link to="/clusters/$clusterId/deployments/$id" params={{ clusterId, id: deployment.id }} className="block">
                                    <StatusBadge status={deployment.status} />
                                  </Link>
                                </TableCell>
                                <TableCell className="h-16 w-[120px] align-middle">
                                  <Link to="/clusters/$clusterId/deployments/$id" params={{ clusterId, id: deployment.id }} className="flex items-center gap-2">
                                    {getRuntimeIcon(deployment.runtime?.type || "custom")}
                                    <span>{String(deployment.runtime?.type || "-")}</span>
                                  </Link>
                                </TableCell>
                                <TableCell className="h-16 max-w-[320px] overflow-hidden align-middle">
                                  <Link to="/clusters/$clusterId/deployments/$id" params={{ clusterId, id: deployment.id }} className="flex min-w-0 items-center gap-2 text-muted-foreground">
                                    {!deployment.remote?.url ? (
                                      <div className="max-w-[320px] overflow-hidden align-middle">
                                        <Skeleton className="h-4 w-40" />
                                      </div>
                                    ) : (
                                      <>
                                        {deployment.remote?.url?.includes("github") ? <RxGithubLogo /> : <FaGitlab />}
                                        <span className="truncate">{deployment.remote ? deployment.remote.url?.replace(/^https?:\/\//, "") || "-" : "-"}</span>
                                      </>
                                    )}
                                  </Link>
                                </TableCell>
                                <TableCell className="h-16 w-[200px] overflow-hidden text-right align-middle">
                                  <Link to="/clusters/$clusterId/deployments/$id" params={{ clusterId, id: deployment.id }} className="block truncate text-right font-mono text-sm text-muted-foreground">
                                    {String(deployment.runCmd || "-")}
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))
                          : Array.from({ length: 3 }).map((_, idx) => (
                              <TableRow key={`skeleton-${idx}`} className="h-16">
                                <TableCell className="h-16 max-w-60 overflow-hidden align-middle font-medium">
                                  <Skeleton className="h-4 w-32" />
                                </TableCell>
                                <TableCell className="h-16 align-middle">
                                  <Skeleton className="h-4 w-24" />
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
                        {deployments.length === 0
                          ? "No deployments found"
                          : deployments.length === 1
                            ? "Showing 1 of 1 deployment"
                            : `Showing ${paginatedDeployments.length} of ${deployments.length} deployments`}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1} className="flex items-center gap-1">
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>

                        <div className="flex items-center space-x-1">
                          {paginationRange.map((item, index) => {
                            if (item === "dots") {
                              return (
                                <Button key={`dots-${index}`} variant="outline" size="sm" disabled className="h-8 w-8 p-0">
                                  ...
                                </Button>
                              );
                            }

                            const page = item as number;
                            return (
                              <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => goToPage(page)} className="h-8 w-8 p-0">
                                {page}
                              </Button>
                            );
                          })}
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
                <Tabs value={currentTab} onValueChange={(value) => {
                  const newTab = value as "quick" | "blueprint-editor";
                  if (newTab === "blueprint-editor" && currentTab === "quick") {
                    syncBlueprintFromDraft();
                  } else if (newTab === "quick" && currentTab === "blueprint-editor") {
                    syncDraftFromBlueprint();
                  }
                  setTab({ tab: newTab });
                }} className="flex min-h-0 flex-1 flex-col w-full">
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
                        setField={setField}
                        onSourceValueChanged={value => updateDraft("source", value)}
                        onRuntimeValueChanged={value => updateDraft("runtime", value)}
                      />
                      <div className="flex justify-end">
                        <Button onClick={() => {
                          
                          if (quickDeployInstanceId) {
                            const instance = instances?.find(i => i.id === quickDeployInstanceId);
                            console.log("Deploying...", instance?.tag);
                            if (instance) {
                              handleDeploy(instance.tag);
                              navigate({ to: "/clusters/$clusterId/deployments", params: { clusterId } });
                              queryClient.invalidateQueries({ queryKey: ["instance-status", instance.tag] });
                            }
                          }
                        }} disabled={!quickDeployInstanceId} size="lg">
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
                      filename={`blueprint.${getFileExtension(blueprintFormat)}`}
                      onFormat={formatBlueprint}
                      onReset={resetBlueprint}
                      onFormatChange={handleFormatChange}
                      errors={schemaErrors}
                      showFormatSelector
                      instanceSelector={
                        <Select value={blueprintInstanceId} onValueChange={(value) => setBlueprintInstanceId(value)}>
                          <SelectTrigger className="h-6 w-[140px] bg-transparent border-neutral-600 text-xs text-neutral-300">
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
                      <Button onClick={() => {
                        if (blueprintInstanceId) {
                          const instance = instances?.find(i => i.id === blueprintInstanceId);
                          if (instance) {
                            handleDeploy(instance.tag);
                            navigate({ to: "/clusters/$clusterId/deployments", params: { clusterId } });
                            queryClient.invalidateQueries({ queryKey: ["instance-status", instance.tag] })
                          }
                        }
                      }} disabled={schemaErrors.length > 0 || !blueprintInstanceId} size="lg">
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
