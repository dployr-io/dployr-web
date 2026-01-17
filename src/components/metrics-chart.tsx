// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { Cpu, HardDrive, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemoryProfileEntry, ProcessSnapshot } from "@/types";
import type { Process } from "@/types/schemas/v1.1";

interface MetricsAreaChartProps {
  data: MemoryProfileEntry[];
  type: "memory" | "cpu";
  height?: number;
  showAxis?: boolean;
  showTooltip?: boolean;
  className?: string;
  gradientId?: string;
}

export function MetricsAreaChart({
  data,
  type,
  height = 120,
  showAxis = false,
  showTooltip = true,
  className,
  gradientId = "metricsGradient",
}: MetricsAreaChartProps) {
  const chartData = useMemo(() => {
    return data.map((entry, index) => {
      const value = type === "memory" 
        ? entry.mem_used_percent 
        : (entry.cpu_user + entry.cpu_system);
      
      const time = new Date(entry.timestamp);
      const timeLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return {
        index,
        value: Math.round(value * 10) / 10,
        time: timeLabel,
        timestamp: entry.timestamp,
      };
    });
  }, [data, type]);

  const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  
  // Determine color based on current value
  const getColor = (value: number) => {
    if (value >= 90) return { stroke: "#ef4444", fill: "#ef4444" }; // red
    if (value >= 70) return { stroke: "#eab308", fill: "#eab308" }; // yellow
    return { stroke: "#22c55e", fill: "#22c55e" }; // green
  };
  
  const colors = getColor(currentValue);

  if (chartData.length < 2) {
    return (
      <div 
        className={cn("flex items-center justify-center text-sm text-muted-foreground", className)}
        style={{ height }}
      >
        Collecting data...
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: showAxis ? 0 : -20, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.fill} stopOpacity={0.4} />
              <stop offset="50%" stopColor={colors.fill} stopOpacity={0.15} />
              <stop offset="100%" stopColor={colors.fill} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          
          {showAxis && (
            <>
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${value}%`}
                width={35}
              />
            </>
          )}
          
          {showTooltip && (
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                      <p className="text-xs text-muted-foreground">{data.time}</p>
                      <p className="text-sm font-medium">
                        {type === "memory" ? "Memory" : "CPU"}: {data.value}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          )}
          
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DualMetricsChartProps {
  data: MemoryProfileEntry[];
  height?: number;
  className?: string;
}

export function DualMetricsChart({ data, height = 200, className }: DualMetricsChartProps) {
  const chartData = useMemo(() => {
    return data.map((entry, index) => {
      const time = new Date(entry.timestamp);
      const timeLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return {
        index,
        memory: Math.round(entry.mem_used_percent * 10) / 10,
        cpu: Math.round((entry.cpu_user + entry.cpu_system) * 10) / 10,
        time: timeLabel,
        timestamp: entry.timestamp,
      };
    });
  }, [data]);

  if (chartData.length < 2) {
    return null;
  }

  const currentMemory = chartData[chartData.length - 1].memory;
  const currentCpu = chartData[chartData.length - 1].cpu;

  return (
    <div className={cn("w-full rounded-xl border bg-background/40 p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">System Resources</p>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">CPU: {currentCpu.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span className="text-muted-foreground">Memory: {currentMemory.toFixed(1)}%</span>
          </div>
        </div>
      </div>
      
      <div style={{ height: height - 50 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <YAxis 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={false}
              width={0}
            />
            
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <p className="text-muted-foreground mb-1">{d.time}</p>
                      <p>CPU: {d.cpu}%</p>
                      <p>Memory: {d.memory}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            <Area
              type="monotone"
              dataKey="cpu"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fill="url(#cpuGradient)"
              animationDuration={300}
            />
            <Area
              type="monotone"
              dataKey="memory"
              stroke="#a855f7"
              strokeWidth={1.5}
              fill="url(#memoryGradient)"
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface InstanceMetricsChartProps {
  data: MemoryProfileEntry[];
  height?: number;
  className?: string;
  processSnapshots?: ProcessSnapshot[];
  onTimestampClick?: (timestamp: number) => void;
  lockedTimestamp?: number | null;
}

export function InstanceMetricsChart({ data, height = 180, className, processSnapshots = [], onTimestampClick, lockedTimestamp = null }: InstanceMetricsChartProps) {
  const [showCpu, setShowCpu] = useState(true);
  const [showMemory, setShowMemory] = useState(true);

  const findClosestSnapshot = (timestamp: number): Process[] => {
    if (!processSnapshots || processSnapshots.length === 0) return [];
    
    let closest = processSnapshots[0];
    let minDiff = Math.abs(timestamp - closest.timestamp);
    
    for (const snapshot of processSnapshots) {
      const diff = Math.abs(timestamp - snapshot.timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snapshot;
      }
    }
    
    return (closest?.data?.list as Process[]) || [];
  };

  const chartData = useMemo(() => {
    return data.map((entry, index) => {
      const time = new Date(entry.timestamp);
      const timeLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return {
        index,
        memory: Math.round(entry.mem_used_percent * 10) / 10,
        cpu: Math.round((entry.cpu_user + entry.cpu_system) * 10) / 10,
        time: timeLabel,
        timestamp: entry.timestamp,
      };
    });
  }, [data]);

  const lockedIndex = useMemo(() => {
    if (!lockedTimestamp || chartData.length === 0) return null;
    
    let closestIndex = 0;
    let minDiff = Math.abs(chartData[0].timestamp - lockedTimestamp);
    
    for (let i = 1; i < chartData.length; i++) {
      const diff = Math.abs(chartData[i].timestamp - lockedTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  }, [lockedTimestamp, chartData]);

  if (chartData.length < 2) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl border bg-background/40 text-sm text-muted-foreground", className)} style={{ height }}>
        Collecting metrics data...
      </div>
    );
  }

  const currentMemory = chartData[chartData.length - 1].memory;
  const currentCpu = chartData[chartData.length - 1].cpu;

  return (
    <div className={cn("rounded-xl border bg-background/40", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <p className="text-xs text-muted-foreground">Resource Usage</p>
        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={() => setShowCpu(!showCpu)}
            className={cn("flex items-center gap-1.5 transition-opacity", !showCpu && "opacity-40")}
          >
            <Cpu className="h-3.5 w-3.5 text-cyan-500" />
            <span className="text-muted-foreground">CPU</span>
            <span className="font-mono">{currentCpu.toFixed(1)}%</span>
          </button>
          <button
            onClick={() => setShowMemory(!showMemory)}
            className={cn("flex items-center gap-1.5 transition-opacity", !showMemory && "opacity-40")}
          >
            <HardDrive className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-muted-foreground">Memory</span>
            <span className="font-mono">{currentMemory.toFixed(1)}%</span>
          </button>
        </div>
      </div>
      
      <div className="px-4 pb-4 outline-none" style={{ height: Math.max(height - 50, 100), minHeight: 100 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={100} className="outline-none focus:outline-none">
          <AreaChart 
            data={chartData} 
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }} 
            style={{ outline: 'none' }}
            onClick={(e: any) => {
              if (e && e.activeTooltipIndex !== undefined && chartData[e.activeTooltipIndex]) {
                const timestamp = chartData[e.activeTooltipIndex].timestamp;
                onTimestampClick?.(timestamp);
              }
            }}>
            <defs>
              <linearGradient id="instanceCpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="instanceMemoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <YAxis 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={false}
              width={0}
            />
            
            {lockedIndex !== null && (
              <ReferenceLine
                x={lockedIndex}
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: '📍',
                  position: 'top',
                  fontSize: 16,
                  fill: '#3b82f6',
                }}
              />
            )}
            
            <Tooltip
              cursor={{ stroke: lockedTimestamp ? '#3b82f6' : '#6b7280', strokeWidth: 2, strokeDasharray: '5 5' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  const processes = findClosestSnapshot(d.timestamp);
                  
                  const topProcesses = [...processes]
                    .sort((a, b) => (b.cpu_percent || 0) - (a.cpu_percent || 0))
                    .slice(0, 3);
                  
                  const states = { running: 0, sleeping: 0, zombie: 0, total: processes.length };
                  processes.forEach(p => {
                    const state = p.state?.toLowerCase() || '';
                    if (state === 'running' || state === 'r') states.running++;
                    else if (state === 'sleeping' || state === 'sleep' || state === 's') states.sleeping++;
                    else if (state === 'zombie' || state === 'z') states.zombie++;
                  });
                  
                  const isLocked = lockedTimestamp === d.timestamp;
                  
                  return (
                    <div className="rounded-lg border bg-popover/95 backdrop-blur-sm shadow-lg w-[280px]">
                      <div className="px-3 py-2 border-b border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-xs">{d.time}</p>
                          {isLocked && (
                            <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
                              <Pin className="h-3 w-3" />
                              <span>Pinned</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          {showCpu && (
                            <div className="flex items-center gap-1.5">
                              <Cpu className="h-3 w-3 text-cyan-500" />
                              <span className="text-muted-foreground">CPU:</span>
                              <span className="font-mono text-cyan-400">{d.cpu}%</span>
                            </div>
                          )}
                          {showMemory && (
                            <div className="flex items-center gap-1.5">
                              <HardDrive className="h-3 w-3 text-orange-500" />
                              <span className="text-muted-foreground">Memory:</span>
                              <span className="font-mono text-orange-400">{d.memory}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {topProcesses.length > 0 && (
                        <div className="px-3 py-2 border-t border-border/30">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium">Top Processes</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{states.total} total</span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 text-[10px] font-mono font-medium text-muted-foreground pb-1 border-b border-border/30">
                              <span>PID</span>
                              <span className="truncate">Command</span>
                              <span className="text-right">CPU</span>
                              <span className="text-right">MEM</span>
                            </div>
                            {topProcesses.map((proc, idx) => {
                              const isZombie = proc.state?.toLowerCase() === 'zombie' || proc.state?.toLowerCase() === 'z';
                              return (
                                <div key={`${proc.pid}-${idx}`} className={cn(
                                  "grid grid-cols-[auto_1fr_auto_auto] gap-2 text-[10px] font-mono",
                                  isZombie && "text-red-400"
                                )}>
                                  <span className="text-muted-foreground">{proc.pid}</span>
                                  <span className="truncate max-w-[180px]" title={proc.command}>{proc.command}</span>
                                  <span className={cn(
                                    "text-right",
                                    proc.cpu_percent > 80 && "text-red-400 font-semibold",
                                    proc.cpu_percent > 50 && proc.cpu_percent <= 80 && "text-orange-400 font-medium"
                                  )}>{proc.cpu_percent?.toFixed(1)}%</span>
                                  <span className={cn(
                                    "text-right",
                                    proc.memory_percent > 80 && "text-red-400 font-semibold",
                                    proc.memory_percent > 50 && proc.memory_percent <= 80 && "text-orange-400 font-medium"
                                  )}>{proc.memory_percent?.toFixed(1)}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            
            {showCpu && (
              <Area
                type="monotone"
                dataKey="cpu"
                stroke="#06b6d4"
                strokeWidth={1.5}
                fill="url(#instanceCpuGradient)"
                animationDuration={300}
              />
            )}
            {showMemory && (
              <Area
                type="monotone"
                dataKey="memory"
                stroke="#f97316"
                strokeWidth={1.5}
                fill="url(#instanceMemoryGradient)"
                animationDuration={300}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
