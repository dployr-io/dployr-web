// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/lib/utils";
import { HardDrive, Hash, User, Terminal, Cpu, MemoryStick } from "lucide-react";
import type { ProcessInfo, DiskInfo } from "@/types";

interface ProcessViewerProps {
  processes?: ProcessInfo[];
  className?: string;
}

export function ProcessViewer({ processes, className }: ProcessViewerProps) {
  if (!processes || processes.length === 0) return null;

  return (
    <div className={cn("rounded-xl border bg-background/40", className)}>
      <div className="flex items-center px-4 py-2 border-b border-border/50 text-[11px] text-muted-foreground">
        <span className="w-14 flex items-center gap-1"><Hash className="h-3 w-3" />PID</span>
        <span className="w-20 flex items-center gap-1"><User className="h-3 w-3" />User</span>
        <span className="flex-1 flex items-center gap-1"><Terminal className="h-3 w-3" />Command</span>
        <span className="w-14 flex items-center justify-end gap-1"><Cpu className="h-3 w-3" /></span>
        <span className="w-14 flex items-center justify-end gap-1"><MemoryStick className="h-3 w-3" /></span>
      </div>
      <div>
        {processes.slice(0, 8).map((proc: ProcessInfo) => {
          const cpuPercent = proc.cpu_percent ?? 0;
          const memPercent = proc.mem_percent ?? 0;
          return (
            <div key={proc.pid} className="flex items-center px-4 py-1.5 text-xs hover:bg-muted/30 transition-colors">
              <span className="w-14 font-mono text-muted-foreground">{proc.pid}</span>
              <span className="w-20 truncate text-muted-foreground">{proc.user}</span>
              <span className="flex-1 truncate font-mono font-medium">{proc.command}</span>
              <span className={cn(
                "w-14 text-right font-mono tabular-nums",
                cpuPercent >= 50 ? "text-red-400" : cpuPercent >= 10 ? "text-amber-400" : "text-muted-foreground"
              )}>
                {cpuPercent.toFixed(1)}%
              </span>
              <span className={cn(
                "w-14 text-right font-mono tabular-nums",
                memPercent >= 50 ? "text-red-400" : memPercent >= 10 ? "text-amber-400" : "text-muted-foreground"
              )}>
                {memPercent.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DiskViewerProps {
  disks?: DiskInfo[];
  className?: string;
}

export function DiskViewer({ disks, className }: DiskViewerProps) {
  if (!disks || disks.length === 0) return null;

  // Filter to show only meaningful disks (with size > 1GB)
  const meaningfulDisks = disks.filter((d: DiskInfo) => d.size_bytes > 1024 * 1024 * 1024);

  return (
    <div className={cn("rounded-xl border bg-background/40 p-4", className)}>
      <p className="text-xs text-muted-foreground mb-3">Disk Usage</p>
      <div className="space-y-3">
        {meaningfulDisks.map((disk: DiskInfo) => {
          const usedBytes = disk.used_bytes ?? 0;
          const usedPercent = disk.size_bytes > 0 ? (usedBytes / disk.size_bytes) * 100 : 0;
          
          return (
            <div key={disk.mountpoint} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono">{disk.mountpoint}</span>
                  <span className="text-muted-foreground">({disk.filesystem})</span>
                </div>
                <span className="text-muted-foreground">
                  {formatBytes(usedBytes)} / {formatBytes(disk.size_bytes)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full transition-all", usedPercent >= 90 ? "bg-red-500" : usedPercent >= 70 ? "bg-amber-500" : "bg-emerald-500")}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
