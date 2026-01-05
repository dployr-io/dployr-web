// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Server, Activity, HardDrive, Cpu, ExternalLink, RotateCcw, Power } from "lucide-react";
import type { InstanceStream } from "@/types";

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

  const update = instanceStatus?.update;
  const buildInfo = update?.build_info;
  const platform = update?.platform;
  const top = update?.top;

  // Format uptime string (e.g., "561h17m53s" -> "561h 17m")
  const formatUptimeString = (uptimeStr?: string): string => {
    if (!uptimeStr) return "-";
    const match = uptimeStr.match(/(\d+)d\s*(\d+)h|(\d+)h\s*(\d+)m|(\d+)m/);
    if (!match) return uptimeStr;
    
    if (match[1]) return `${match[1]}d ${match[2]}h`;
    if (match[3]) return `${match[3]}h ${match[4]}m`;
    if (match[5]) return `${match[5]}m`;
    return uptimeStr;
  };

  const uptime = formatUptimeString(update?.uptime);

  return (
    <div className="absolute right-4 bottom-20 w-72 bg-background border border-border shadow-lg z-20">
      <div className="flex items-start justify-between p-3 border-b border-border">
        <div className="space-y-0.5">
          <h3 className="text-sm font-mono font-semibold">{instance.name}</h3>
          <p className="text-[10px] text-muted-foreground capitalize">
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
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Status
          </span>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              update?.status === 'healthy' ? 'bg-emerald-500' :
              update?.status === 'degraded' ? 'bg-yellow-500' :
              update?.status === 'unhealthy' ? 'bg-red-500' :
              'bg-stone-500'
            }`} />
            <span className="text-xs font-mono capitalize">
              {update?.status || instance.status || 'unknown'}
            </span>
          </div>
        </div>

        {/* Uptime */}
        {uptime && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Uptime</span>
            <code className="text-[10px] bg-muted px-2 py-1 rounded block font-mono">
              {uptime}
            </code>
          </div>
        )}

        {/* Platform */}
        {platform && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Server className="h-3 w-3" />
              Platform
            </span>
            <code className="text-[10px] bg-muted px-2 py-1 rounded block font-mono">
              {platform.os}/{platform.arch}
            </code>
          </div>
        )}

        {/* System Metrics */}
        {top && (
          <>
            {top.cpu && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  CPU
                </span>
                <span className="text-[10px] tabular-nums font-mono">
                  {((top.cpu.user + top.cpu.system) / (top.cpu.user + top.cpu.system + top.cpu.idle) * 100).toFixed(1)}%
                </span>
              </div>
            )}
            {top.memory && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  Memory
                </span>
                <span className="text-[10px] tabular-nums font-mono">
                  {top.memory.total_bytes > 0 ? ((top.memory.used_bytes / top.memory.total_bytes) * 100).toFixed(1) : '0'}%
                </span>
              </div>
            )}
          </>
        )}

        {/* Build Info */}
        {buildInfo && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Version</span>
            <code className="text-[10px] bg-muted px-2 py-1 rounded block font-mono truncate" title={buildInfo.version}>
              {buildInfo.version}
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
