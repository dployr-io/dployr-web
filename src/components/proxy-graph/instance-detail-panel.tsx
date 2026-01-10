// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Server, Activity, HardDrive, Cpu, ExternalLink, RotateCcw, Power } from "lucide-react";
import type { InstanceStream, InstanceStreamUpdateV1, InstanceStreamUpdateV1_1 } from "@/types";

// Normalize instance update data to handle both v1 and v1.1 formats
function normalizeInstanceUpdate(update: InstanceStreamUpdateV1 | InstanceStreamUpdateV1_1 | undefined) {
  if (!update) return null;
  
  const isV1_1 = (update as any).schema === "v1.1";
  
  if (isV1_1) {
    const u = update as InstanceStreamUpdateV1_1;
    return {
      status: u.status?.state || u.health?.overall || "unknown",
      uptime: u.status?.uptime_seconds ? formatSeconds(u.status.uptime_seconds) : undefined,
      platform: u.agent ? { os: u.agent.os, arch: u.agent.arch } : null,
      version: u.agent?.version || null,
      cpu: u.resources?.cpu ? {
        user: u.resources.cpu.user_percent,
        system: u.resources.cpu.system_percent,
        idle: u.resources.cpu.idle_percent,
      } : null,
      memory: u.resources?.memory ? {
        used_bytes: u.resources.memory.used_bytes,
        total_bytes: u.resources.memory.total_bytes,
      } : null,
    };
  }
  
  // v1 format
  const u = update as InstanceStreamUpdateV1;
  return {
    status: u.status || "unknown",
    uptime: u.uptime,
    platform: u.platform,
    version: u.build_info?.version || null,
    cpu: u.top?.cpu ? {
      user: u.top.cpu.user,
      system: u.top.cpu.system,
      idle: u.top.cpu.idle,
    } : null,
    memory: u.top?.memory ? {
      used_bytes: u.top.memory.used,
      total_bytes: u.top.memory.total,
    } : null,
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
  onReboot,
  onOpenInstance,
}: {
  instance: { id: string; name: string; status?: string };
  instanceStatus?: InstanceStream | null;
  onClose: () => void;
  onRestart?: () => void;
  onReboot?: () => void;
  onOpenInstance?: () => void;
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

  const normalized = useMemo(() => normalizeInstanceUpdate(instanceStatus?.update), [instanceStatus?.update]);

  return (
    <div className="absolute right-4 bottom-20 w-72 bg-background border border-stone-700 rounded-md shadow-lg z-20 font-mono">
      <div className="flex items-start justify-between p-3 border-b border-stone-700">
        <div className="space-y-0.5">
          <h3 className="text-sm font-mono font-semibold">{instance.name}</h3>
          <p className="text-[10px] text-muted-foreground capitalize font-mono">
            Instance
          </p>
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
            <div className={`h-2 w-2 rounded-full ${
              normalized?.status === 'healthy' ? 'bg-emerald-500' :
              normalized?.status === 'degraded' ? 'bg-yellow-500' :
              normalized?.status === 'unhealthy' ? 'bg-red-500' :
              'bg-stone-500'
            }`} />
            <span className="text-xs font-mono capitalize">
              {normalized?.status || instance.status || 'unknown'}
            </span>
          </div>
        </div>

        {/* Uptime */}
        {normalized?.uptime && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-mono">Uptime</span>
            <code className="text-[10px] bg-muted px-2 py-1 rounded block font-mono">
              {normalized.uptime}
            </code>
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
              {((normalized.cpu.user + normalized.cpu.system) / (normalized.cpu.user + normalized.cpu.system + normalized.cpu.idle) * 100).toFixed(1)}%
            </span>
          </div>
        )}
        {normalized?.memory && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Memory
            </span>
            <span className="text-[10px] tabular-nums font-mono">
              {normalized.memory.total_bytes > 0 ? ((normalized.memory.used_bytes / normalized.memory.total_bytes) * 100).toFixed(1) : '0'}%
            </span>
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
          {onOpenInstance && (
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onOpenInstance} title="Open instance details">
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {onRestart && (
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onRestart} title="Restart daemon">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {onReboot && (
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onReboot} title="Reboot instance">
              <Power className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
