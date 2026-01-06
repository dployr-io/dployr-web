// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Cpu, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemoryProfileEntry } from "@/types";

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
}

export function InstanceMetricsChart({ data, height = 180, className }: InstanceMetricsChartProps) {
  const [showCpu, setShowCpu] = useState(true);
  const [showMemory, setShowMemory] = useState(true);

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
      
      <div className="px-4 pb-4" style={{ height: Math.max(height - 50, 100), minHeight: 100 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={100}>
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
            
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-popover/95 backdrop-blur-sm px-3 py-2 shadow-lg">
                      <p className="font-medium text-xs mb-1.5">{d.time}</p>
                      <div className="space-y-0.5">
                        {showCpu && (
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                            <span className="text-xs text-muted-foreground">CPU:</span>
                            <span className="text-xs font-mono text-cyan-400">{d.cpu}%</span>
                          </div>
                        )}
                        {showMemory && (
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            <span className="text-xs text-muted-foreground">Memory:</span>
                            <span className="text-xs font-mono text-orange-400">{d.memory}%</span>
                          </div>
                        )}
                      </div>
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
