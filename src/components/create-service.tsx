// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyValueEditorModal } from "@/components/key-value-editor-modal";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Link } from "@tanstack/react-router";
import { RemoteSelector } from "@/components/remote-selector";
import { getRuntimeIcon } from "@/lib/runtime-icon";
import type { Remote, Runtime, ServiceSource, ServiceType } from "@/types";
import { runtimes } from "@/types/runtimes";
import { ExternalLink, Info } from "lucide-react";

interface DomainOption {
  domain: string;
  provider: string;
}

interface Props {
  // Form state
  name: string;
  nameError: string;
  remoteError: string;
  description?: string | null;
  version?: string | null;
  image?: string | null;
  imageError?: string;
  buildCmd?: string | null;
  buildCmdError?: string;
  staticDir?: string | null;
  staticDirError?: string;
  workingDir?: string | null;
  workingDirError: string;
  type: ServiceType;
  typeError: string;
  runtime: Runtime;
  runtimeError: string;
  remote?: Remote | null;
  remotes: Remote[];
  isRemotesLoading: boolean;
  runCmd?: string | null;
  runCmdError: string;
  source: ServiceSource;
  processing: boolean;
  errors: Record<string, string>;
  runCmdPlaceholder?: string;
  port?: number | null;
  portError?: string;
  domain?: string | null;
  domainError?: string;
  availableDomains?: DomainOption[];
  isLoadingDomains?: boolean;
  envVars?: Record<string, string>;
  secrets?: Record<string, string>;

  // Route parameters
  clusterId?: string;
  instanceId?: string;

  // Unified handlers
  setField: (field: string, value: unknown) => void;
  onSourceValueChanged: (arg0: ServiceSource) => void;
  onRuntimeValueChanged: (arg0: Runtime) => void;
}

export function CreateServiceForm({
  name,
  nameError,
  description,
  version,
  image,
  imageError,
  buildCmd,
  buildCmdError,
  staticDir,
  staticDirError,
  workingDir,
  workingDirError,
  type,
  typeError,
  runtime,
  runtimeError,
  runCmd,
  runCmdError,
  source,
  processing,
  errors,
  runCmdPlaceholder,
  port,
  portError,
  domain,
  domainError,
  availableDomains,
  isLoadingDomains,
  envVars = {},
  secrets = {},
  remote,
  remotes,
  isRemotesLoading,
  remoteError,
  clusterId,
  instanceId,
  setField,
  onSourceValueChanged,
  onRuntimeValueChanged,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="source">
            Source <span className="text-destructive">*</span>
          </Label>
          <Select value={source} onValueChange={onSourceValueChanged}>
            <SelectTrigger id="source" disabled={processing}>
              <SelectValue>
                <div className="flex items-center">
                  <span>{source === "image" ? "Docker Image" : source === "remote" ? "Remote Repository" : source}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(["image", "remote"] as ServiceSource[]).map(option => {
                let label = "";
                if (option === "image") label = "Docker Image";
                else if (option === "remote") label = "Remote Repository";
                else label = option;
                return (
                  <SelectItem key={option} value={option}>
                    <div className="flex items-center gap-2">
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 md:col-span-1">
          <Label htmlFor="type">
            Type <span className="text-destructive">*</span>
          </Label>
          <Select value={type} onValueChange={(value: string) => setField("type", value)}>
            <SelectTrigger id="type" disabled={processing}>
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="worker">Worker</SelectItem>
              <SelectItem value="static">Static</SelectItem>
              <SelectItem value="job">Job</SelectItem>
            </SelectContent>
          </Select>
          {(typeError || errors.type) && <div className="text-sm text-destructive">{typeError || errors.type}</div>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {source === "remote" && (
          <div className="grid gap-2 md:col-span-2">
            <RemoteSelector value={remote || null} remotes={remotes} isLoading={isRemotesLoading} error={remoteError} disabled={processing} onChange={remote => setField("remote", remote)} />
          </div>
        )}
        {source === "remote" && (
          <div className="grid gap-2 md:col-span-1">
            <Label htmlFor="branch">
              Branch <span className="text-destructive">*</span>
            </Label>
            <Input
              id="branch"
              name="branch"
              placeholder="main"
              value={remote?.branch || "main"}
              onChange={e => setField("remote", { ...remote, url: remote?.url || "", branch: e.target.value, commit_hash: remote?.commit_hash || "", avatar_url: remote?.avatar_url || "" })}
              disabled={processing || !remote?.url}
            />
          </div>
        )}

        <div className="grid gap-2 md:col-span-1">
          <Label htmlFor="runtime">
            Runtime <span className="text-destructive">*</span>
          </Label>
          <Select value={runtime ?? "Select a runtime"} onValueChange={onRuntimeValueChanged}>
            <SelectTrigger id="runtime" disabled={processing}>
              <SelectValue>
                <div className="flex items-center gap-2">
                  {getRuntimeIcon(runtime)}
                  <span>{runtime}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {runtimes
                .filter(option => {
                  const isImage = source === "image";
                  const isRemote = source === "remote";
                  return isImage ? option === "k3s" || option === "docker" : isRemote ? option !== "k3s" && option !== "docker" : true;
                })
                .map(option => (
                  <SelectItem key={option} value={option}>
                    <div className="flex items-center gap-2">
                      {getRuntimeIcon(option)}
                      <span>{option}</span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {(runtimeError || errors.runtime) && <div className="text-sm text-destructive">{runtimeError || errors.runtime}</div>}
        </div>

        <div className="grid gap-2 md:col-span-1">
          <Label htmlFor="version">Version</Label>
          <Input id="version" name="version" placeholder="1.0.0" value={version || ""} onChange={e => setField("version", e.target.value)} disabled={processing} />
        </div>

        <div className="grid gap-2 md:col-span-1">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="port">Port</Label>
            <Tooltip>
              <TooltipTrigger type="button">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Port to listen on. Defaults to <span className="font-mono bg-white/15 rounded px-1 py-0.5">3000</span>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input id="port" name="port" placeholder="3000" value={port || ""} onChange={e => setField("port", e.target.value ? Number(e.target.value) : null)} disabled={processing} />
          {(portError || errors.port) && <div className="text-sm text-destructive">{portError || errors.port}</div>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="my-awesome-project"
            value={name}
            onChange={e =>
              setField(
                "name",
                e.target.value
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-z0-9-]/g, "")
                  .replace(/-+/g, "-")
              )
            }
            disabled={processing}
          />
          {(nameError || errors.name) && <div className="text-sm text-destructive">{nameError || errors.name}</div>}
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            name="description"
            placeholder="Enter a brief description of your service"
            value={description || ""}
            onChange={e => setField("description", e.target.value)}
            disabled={processing}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="domain">Domain</Label>
              <Tooltip>
                <TooltipTrigger type="button">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Defaults to <span className="font-mono bg-white/15 rounded px-1 py-0.5">your-app.dployr.run</span>
                  <br /> You can add your own domain for free
                </TooltipContent>
              </Tooltip>
            </div>
            {clusterId && instanceId && (
              <Link
                to="/clusters/$clusterId/instances/$id"
                params={{ clusterId, id: instanceId }}
                search={{ tab: "config" }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Manage domains <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
          <Select value={domain || ""} onValueChange={(value: string) => setField("domain", value)} disabled={processing || isLoadingDomains || availableDomains?.length === 0}>
            <SelectTrigger id="domain">
              <SelectValue placeholder={isLoadingDomains ? "Loading..." : availableDomains?.length === 0 ? "No domains available" : "Select domain"} />
            </SelectTrigger>
            <SelectContent>
              {availableDomains?.map(d => (
                <SelectItem key={d.domain} value={d.domain}>
                  <div className="flex items-center gap-2">
                    <span>{d.domain}</span>
                    {d.provider && d.provider !== "unknown" && <span className="text-xs text-muted-foreground">({d.provider})</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(domainError || errors.domain) && <div className="text-sm text-destructive">{domainError || errors.domain}</div>}
        </div>

        {source === "remote" && (
          <div className={`grid gap-2 ${source === "remote"}`}>
            <div className="flex items-center gap-1.5">
              <Label htmlFor="working_dir">Working Directory</Label>
              <Tooltip>
                <TooltipTrigger type="button">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Defaults to root folder</TooltipContent>
              </Tooltip>
            </div>
            <Input id="working_dir" name="working_dir" placeholder="src" value={workingDir!} onChange={e => setField("workingDir", e.target.value)} disabled={processing} />
            {(workingDirError || errors.working_dir) && <div className="text-sm text-destructive">{workingDirError || errors.working_dir}</div>}
          </div>
        )}

        <div className="grid gap-2 md:col-span-1">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="static_dir">Static Directory</Label>
            <Tooltip>
              <TooltipTrigger type="button">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>This directory will be mounted on your service</TooltipContent>
            </Tooltip>
          </div>
          <Input id="static_dir" name="static_dir" placeholder="dist" value={staticDir || ""} onChange={e => setField("staticDir", e.target.value)} disabled={processing} />
          {(staticDirError || errors.static_dir) && <div className="text-sm text-destructive">{staticDirError || errors.static_dir}</div>}
        </div>

        {source === "image" && (
          <div className="grid gap-2 md:col-span-1">
            <Label htmlFor="image">
              Docker Image <span className="text-destructive">*</span>
            </Label>
            <Input id="image" name="image" placeholder="node:18-alpine" value={image || ""} onChange={e => setField("image", e.target.value)} disabled={processing} />
            {(imageError || errors.image) && <div className="text-sm text-destructive">{imageError || errors.image}</div>}
          </div>
        )}

        {source === "remote" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 md:col-span-3">
              <div className="grid gap-2">
                <Label htmlFor="build_cmd">Build Command</Label>
                <Input id="build_cmd" name="build_cmd" placeholder="npm run build" value={buildCmd || ""} onChange={e => setField("buildCmd", e.target.value)} disabled={processing} />
                {(buildCmdError || errors.build_cmd) && <div className="text-sm text-destructive">{buildCmdError || errors.build_cmd}</div>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="run_cmd">
                  {runtime === "static" ? "Build Command" : "Run Command"} {runtime !== "static" && <span className="text-destructive">*</span>}
                </Label>
                <Input id="run_cmd" name="run_cmd" placeholder={runCmdPlaceholder} value={runCmd!} onChange={e => setField("runCmd", e.target.value)} disabled={processing} />
                {(runCmdError || errors.run_cmd) && <div className="text-sm text-destructive">{runCmdError || errors.run_cmd}</div>}
              </div>
            </div>
          </>
        )}

        {/* Environment Variables & Secrets */}
        <div className="grid gap-2 md:col-span-3">
          <div className="flex items-center justify-between">
            <Label>Environment Variables & Secrets</Label>
            <a
              href="https://docs.dployr.io/runtime/environments-and-secrets"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors font-medium"
              aria-label="Learn more about environments and secrets"
            >
              Learn more
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="space-y-3">
            <KeyValueEditorModal
              title="Environment Variables"
              description="Add environment variables that will be available at runtime."
              triggerLabel="Configure Environment Variables"
              values={envVars}
              onChange={values => setField("envVars", values)}
              disabled={processing}
            />
            <KeyValueEditorModal
              title="Secrets"
              description="Add sensitive values like API keys and passwords. These are encrypted at rest."
              triggerLabel="Configure Secrets"
              values={secrets}
              onChange={values => setField("secrets", values)}
              isSecret
              disabled={processing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
