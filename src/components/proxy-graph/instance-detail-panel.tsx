// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Server, Activity, HardDrive, Cpu, Settings, RotateCcw, FolderOpen, Trash2, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { NormalizedInstanceData } from "@/types";

// Transform NormalizedInstanceData to display format
function getNormalizedDisplayData(data: NormalizedInstanceData | null | undefined) {
  if (!data) return null;

  return {
    status: data.status?.state || data.health?.overall || "unknown",
    uptime: data.status?.uptimeSeconds ? formatSeconds(data.status.uptimeSeconds) : undefined,
    platform: data.node ? { os: data.node.os, arch: data.node.arch } : null,
    version: data.node?.version || null,
    cpu: data.resources?.cpu
      ? {
          user: data.resources.cpu.userPercent,
          system: data.resources.cpu.systemPercent,
          idle: data.resources.cpu.idlePercent,
        }
      : null,
    memory: data.resources?.memory
      ? {
          used_bytes: data.resources.memory.usedBytes,
          total_bytes: data.resources.memory.totalBytes,
        }
      : null,
  };
}

function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export function InstanceDetailPanel({
  instance,
  instanceStatus,
  onClose,
  onRestart,
  onSettings,
  onBrowseFiles,
  onRemove,
}: {
  instance: { id: string; name: string; status?: string };
  instanceStatus?: NormalizedInstanceData | null;
  onClose: () => void;
  onRestart?: () => void;
  onSettings?: () => void;
  onBrowseFiles?: () => void;
  onRemove?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(instance.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const normalized = useMemo(() => getNormalizedDisplayData(instanceStatus), [instanceStatus]);

  return (
    <div className="absolute right-4 bottom-20 w-72 bg-background border border-stone-700 rounded-md shadow-lg z-20 font-mono">
      <div className="flex items-start justify-between p-3 border-b border-stone-700">
        <div className="space-y-0.5">
          <h3 className="text-sm font-mono font-semibold">{instance.name}</h3>
          <p className="text-[10px] text-muted-foreground capitalize font-mono">Instance</p>
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 text-muted-foreground hover:text-foreground" onClick={onClose}>
          ×
        </Button>
      </div>

      <div className="space-y-3 p-3">
        {/* Status */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Status
          </span>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                normalized?.status === "healthy" ? "bg-emerald-500" : normalized?.status === "degraded" ? "bg-yellow-500" : normalized?.status === "unhealthy" ? "bg-red-500" : "bg-stone-500"
              }`}
            />
            <span className="text-xs font-mono capitalize">{normalized?.status || instance.status || "unknown"}</span>
          </div>
        </div>

        {/* Uptime */}
        {normalized?.uptime && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-mono">Uptime</span>
            <code className="text-[10px] bg-muted px-2 py-1 rounded block font-mono">{normalized.uptime}</code>
          </div>
        )}

        {/* Platform */}
        {normalized?.platform && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <Server className="h-3 w-3" />
              Platform
            </span>
            <code className="text-[10px] bg-muted px-2 py-1 rounded block font-mono">
              {normalized.platform.os}/{normalized.platform.arch}
            </code>
          </div>
        )}

        {/* System Metrics */}
        {normalized?.cpu && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              CPU
            </span>
            <span className="text-[10px] tabular-nums font-mono">
              {(((normalized.cpu.user + normalized.cpu.system) / (normalized.cpu.user + normalized.cpu.system + normalized.cpu.idle)) * 100).toFixed(1)}%
            </span>
          </div>
        )}
        {normalized?.memory && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Memory
            </span>
            <span className="text-[10px] tabular-nums font-mono">{normalized.memory.total_bytes > 0 ? ((normalized.memory.used_bytes / normalized.memory.total_bytes) * 100).toFixed(1) : "0"}%</span>
          </div>
        )}

        {/* Version */}
        {normalized?.version && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-mono">Version</span>
            <code className="text-[10px] bg-muted px-2 py-1 rounded block font-mono truncate" title={normalized.version}>
              {normalized.version}
            </code>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleCopy} title="Copy instance name">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onSettings && (
                <DropdownMenuItem onClick={onSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              )}
              {onRestart && (
                <DropdownMenuItem onClick={onRestart}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart
                </DropdownMenuItem>
              )}
              {onBrowseFiles && (
                <DropdownMenuItem onClick={onBrowseFiles}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Browse Files
                </DropdownMenuItem>
              )}
              {onRemove && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
