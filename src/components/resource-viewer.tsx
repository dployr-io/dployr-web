// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Activity, Clock, ChevronDown, ChevronUp, Cpu, MemoryStick, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Area, AreaChart, ResponsiveContainer,  YAxis } from "recharts";
import type { NormalizedProcess, ProcessSnapshot, ProcessTimeWindow } from "@/types";
import type { NormalizedProcessSummary } from "@/types/schemas/normalized/entities/";
import type { Process } from "@/types/schemas/v1.1";

function formatBytes(bytes: number | undefined | null): string {
  if (bytes == null || isNaN(bytes)) return "0B";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${bytes}B`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type SortField = "cpu" | "memory" | "pid" | "command";
type SortDirection = "asc" | "desc";

interface ProcessViewerProps {
  processes?: NormalizedProcess[];
  processSummary?: NormalizedProcessSummary;
  historySnapshots?: ProcessSnapshot[];
  timeWindow?: ProcessTimeWindow;
  onTimeWindowChange?: (window: ProcessTimeWindow) => void;
  isLoadingHistory?: boolean;
  className?: string;
  lockedTimestamp?: number | null;
  isHistoricalMode?: boolean;
  onReturnToLive?: () => void;
}

export function ProcessViewer({
  processes,
  processSummary,
  historySnapshots = [],
  timeWindow = "live",
  onTimeWindowChange,
  isLoadingHistory = false,
  className,
  lockedTimestamp = null,
  isHistoricalMode = false,
  onReturnToLive,
}: ProcessViewerProps) {
  const [sortField, setSortField] = useState<SortField>("cpu");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expanded, setExpanded] = useState(false);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState<number>(0);
  const [showHistoricalChart, setShowHistoricalChart] = useState(true);

  // Find snapshot for locked timestamp
  const lockedSnapshot = useMemo(() => {
    if (!lockedTimestamp || !historySnapshots.length) return null;
    
    let closest = historySnapshots[0];
    let minDiff = Math.abs(lockedTimestamp - closest.timestamp);
    
    for (const snapshot of historySnapshots) {
      const diff = Math.abs(lockedTimestamp - snapshot.timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snapshot;
      }
    }
    
    return closest;
  }, [lockedTimestamp, historySnapshots]);

  // Convert locked snapshot processes to NormalizedProcess format
  const lockedProcesses = useMemo(() => {
    if (!lockedSnapshot?.data?.list) return null;
    
    const procs = lockedSnapshot.data.list as Process[];
    return procs.map(p => ({
      pid: p.pid,
      user: p.user,
      command: p.command,
      cpuPercent: p.cpu_percent || 0,
      memPercent: p.memory_percent || 0,
      resMem: p.resident_memory_bytes || 0,
      virtMem: p.virtual_memory_bytes || 0,
      state: p.state || 'unknown',
      time: p.cpu_time || '-',
    }));
  }, [lockedSnapshot]);

  const displayProcesses = useMemo(() => {
    // Use locked processes if in historical mode, otherwise use live processes
    const sourceProcesses = isHistoricalMode && lockedProcesses ? lockedProcesses : processes;
    if (!sourceProcesses) return [];
    
    const sortedProcesses = [...sourceProcesses];
    sortedProcesses.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "cpu": cmp = a.cpuPercent - b.cpuPercent; break;
        case "memory": cmp = a.memPercent - b.memPercent; break;
        case "pid": cmp = a.pid - b.pid; break;
        case "command": cmp = a.command.localeCompare(b.command); break;
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });

    return sortedProcesses;
  }, [isHistoricalMode, lockedProcesses, processes, sortField, sortDirection]);

  const visibleProcesses = expanded ? displayProcesses : displayProcesses?.slice(0, 5);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortHeader = ({ field, label, icon }: { field: SortField; label: string; icon?: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className={cn(
        "flex items-center gap-1 text-xs font-mono font-medium transition-colors hover:text-foreground",
        sortField === field ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {icon}
      {label}
      {sortField === field && <span className="ml-0.5 font-mono">{sortDirection === "desc" ? "↓" : "↑"}</span>}
    </button>
  );

  const currentSnapshotTime = historySnapshots[selectedSnapshotIndex]?.timestamp;

  // Generate historical system load data - shows process count trends over time
  const historicalChartData = useMemo(() => {
    if (historySnapshots.length < 2) return [];

    return historySnapshots.map((snapshot, idx) => {
      const procs = (snapshot?.data?.list as Process[]) || [];
      const time = new Date(snapshot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Count processes by state
      const states = { running: 0, sleeping: 0, stopped: 0, zombie: 0, other: 0 };
      let totalCpu = 0;
      let totalMem = 0;
      
      procs.forEach(p => {
        const state = p.state.toLowerCase();
        
        if (state === 'running' || state === 'r') states.running++;
        else if (state === 'sleeping' || state === 'sleep' || state === 's') states.sleeping++;
        else if (state === 'stopped' || state === 't') states.stopped++;
        else if (state === 'zombie' || state === 'z') states.zombie++;
        else states.other++;
        
        totalCpu += p.cpu_percent;
        totalMem += p.memory_percent;
      });
      
      return {
        time,
        timestamp: snapshot.timestamp,
        index: idx,
        total: procs.length,
        running: states.running,
        sleeping: states.sleeping,
        stopped: states.stopped,
        zombie: states.zombie,
        other: states.other,
        avgCpu: procs.length > 0 ? totalCpu / procs.length : 0,
        avgMem: procs.length > 0 ? totalMem / procs.length : 0,
      };
    });
  }, [historySnapshots]);

  return (
    <div className={cn(
      "rounded-xl border bg-background/40 transition-all",
      isHistoricalMode && "opacity-90",
      className
    )}>
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isHistoricalMode && (
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            )}
            <p className="text-xs text-muted-foreground">Process Activity</p>
          </div>
          {isHistoricalMode && lockedTimestamp && (
            <>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium font-mono">
                {new Date(lockedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onReturnToLive}
                className="h-6 px-2 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                Back to Live
                <kbd className="hidden sm:inline-block ml-1.5 px-1 py-0.5 text-[9px] font-mono bg-blue-500/20 rounded border border-blue-500/30">ESC</kbd>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          {processSummary && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Processes</span>
                <span className="font-mono font-medium">{processSummary.total}</span>
              </div>
              {processSummary.running > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="font-mono text-muted-foreground">{processSummary.running}</span>
                </div>
              )}
              {processSummary.sleeping > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="font-mono text-muted-foreground">{processSummary.sleeping}</span>
                </div>
              )}
              {processSummary.stopped > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  <span className="font-mono text-muted-foreground">{processSummary.stopped}</span>
                </div>
              )}
              {processSummary.zombie > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="font-mono text-muted-foreground">{processSummary.zombie}</span>
                </div>
              )}
            </>
          )}
          {timeWindow !== "live" && historySnapshots.length > 0 && (
            <button
              onClick={() => setShowHistoricalChart(!showHistoricalChart)}
              className={cn("flex items-center gap-1.5 transition-opacity hover:opacity-100", !showHistoricalChart && "opacity-50")}
            >
              <TrendingUp className="h-3 w-3" />
              <span className="text-muted-foreground">History</span>
            </button>
          )}
          {isLoadingHistory && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {timeWindow !== "live" && historySnapshots.length > 0 && showHistoricalChart && historicalChartData.length > 1 && (
        <div className="border-b border-border/50 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">System Load Over Time</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] font-mono text-muted-foreground">Running</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span className="text-[10px] font-mono text-muted-foreground">Sleeping</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                <span className="text-[10px] font-mono text-muted-foreground">Total</span>
              </div>
            </div>
          </div>
          <div style={{ height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalChartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="runningGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="sleepingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6b7280" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6b7280" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6b7280"
                  strokeWidth={1}
                  fill="url(#totalGradient)"
                  animationDuration={300}
                />
                <Area
                  type="monotone"
                  dataKey="sleeping"
                  stackId="1"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  fill="url(#sleepingGradient)"
                  animationDuration={300}
                />
                <Area
                  type="monotone"
                  dataKey="running"
                  stackId="1"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  fill="url(#runningGradient)"
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {timeWindow !== "live" && historySnapshots.length > 0 && (
        <div className="border-b border-border/50 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="range"
              min={0}
              max={historySnapshots.length - 1}
              value={selectedSnapshotIndex}
              onChange={(e) => setSelectedSnapshotIndex(Number(e.target.value))}
              className="flex-1 h-1.5 accent-primary"
            />
            <span className="text-xs font-mono text-foreground min-w-[75px] text-right font-medium">
              {currentSnapshotTime ? formatTimestamp(currentSnapshotTime) : "-"}
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 px-1">
            <span className="font-mono">{historySnapshots[0]?.timestamp ? formatTimestamp(historySnapshots[0].timestamp) : ""}</span>
            <span className="font-mono">{historySnapshots.length} snapshots</span>
            <span className="font-mono">{historySnapshots[historySnapshots.length - 1]?.timestamp ? formatTimestamp(historySnapshots[historySnapshots.length - 1].timestamp) : ""}</span>
          </div>
        </div>
      )}

      {displayProcesses.length === 0 && !isLoadingHistory && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Activity className="h-8 w-8 mb-2 opacity-50" />
          <span className="text-sm">
            {timeWindow === "live" ? "No process data available" : "No historical data for this time range"}
          </span>
        </div>
      )}

      {displayProcesses.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-4 py-2.5 text-left"><SortHeader field="pid" label="PID" /></th>
                  <th className="px-4 py-2.5 text-left text-xs font-mono font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-2.5 text-right"><SortHeader field="cpu" label="CPU" icon={<Cpu className="h-3 w-3" />} /></th>
                  <th className="px-4 py-2.5 text-right"><SortHeader field="memory" label="MEM" icon={<MemoryStick className="h-3 w-3" />} /></th>
                  <th className="px-4 py-2.5 text-right text-xs font-mono font-medium text-muted-foreground">RES</th>
                  <th className="px-4 py-2.5 text-right text-xs font-mono font-medium text-muted-foreground">VIRT</th>
                  <th className="px-4 py-2.5 text-center text-xs font-mono font-medium text-muted-foreground">State</th>
                  <th className="px-4 py-2.5 text-right text-xs font-mono font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-2.5 text-left"><SortHeader field="command" label="Command" /></th>
                </tr>
              </thead>
              <tbody>
                {visibleProcesses.map((proc, idx) => (
                  <tr
                    key={`${proc.pid}-${idx}`}
                    className={cn(
                      "border-b border-border/40 hover:bg-muted/30 transition-colors",
                      proc.cpuPercent > 50 && "bg-red-500/5",
                      proc.memPercent > 50 && "bg-orange-500/5"
                    )}
                  >
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{proc.pid}</td>
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{proc.user}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn(
                        "font-mono text-[11px]",
                        proc.cpuPercent > 80 && "text-red-500 font-semibold",
                        proc.cpuPercent > 50 && proc.cpuPercent <= 80 && "text-orange-500 font-medium",
                        proc.cpuPercent <= 50 && "text-foreground"
                      )}>
                        {proc.cpuPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn(
                        "font-mono text-[11px]",
                        proc.memPercent > 80 && "text-red-500 font-semibold",
                        proc.memPercent > 50 && proc.memPercent <= 80 && "text-orange-500 font-medium",
                        proc.memPercent <= 50 && "text-foreground"
                      )}>
                        {proc.memPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-muted-foreground">{formatBytes(proc.resMem)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-muted-foreground">{formatBytes(proc.virtMem)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <span className={cn(
                            "inline-block w-2 h-2 rounded-full",
                            proc.state === "running" && "bg-green-500",
                            proc.state === "sleep" && "bg-blue-500",
                            proc.state === "sleeping" && "bg-blue-500",
                            proc.state === "stopped" && "bg-yellow-500",
                            proc.state === "zombie" && "bg-red-500",
                            !["running", "sleep", "sleeping", "stopped", "zombie"].includes(proc.state) && "bg-gray-500"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent className="font-mono text-xs">{proc.state}</TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-muted-foreground">{proc.time}</td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate font-mono text-[11px] text-foreground">{proc.command}</span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[400px] break-all font-mono text-xs">{proc.command}</TooltipContent>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {displayProcesses.length > 5 && (
            <div className="flex justify-center border-t border-border/50 py-2">
              <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-7 text-xs font-medium">
                {expanded ? <><ChevronUp className="h-3 w-3 mr-1" />Show less</> : <><ChevronDown className="h-3 w-3 mr-1" />Show all ({displayProcesses.length})</>}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
