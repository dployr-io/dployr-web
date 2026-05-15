// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrafficBucket, TrafficTotals } from "@/hooks/use-service-traffic";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatPeakWindow(startMs: number, startLabel: string): string {
  const endLabel = new Date(startMs + 60 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${startLabel} – ${endLabel}`;
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  className?: string;
}

function MetricCard({ label, value, sub, icon, className }: MetricCardProps) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl border bg-background/40 px-4 py-3", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

interface ServiceTrafficChartProps {
  data: TrafficBucket[];
  totals: TrafficTotals | null;
  isLoading?: boolean;
}

export function ServiceTrafficChart({ data, totals, isLoading }: ServiceTrafficChartProps) {
  const hasData = data.length > 0 && (totals?.requests ?? 0) > 0;
  const peakBucket = data.reduce<TrafficBucket | null>((best, b) => (!best || b.requests > best.requests ? b : best), null);
  const peakWindow = peakBucket ? formatPeakWindow(peakBucket.bucket, peakBucket.time) : null;

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Total Requests"
          value={isLoading ? "—" : hasData && totals ? formatCount(totals.requests) : "—"}
          sub="Last 24 hours"
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Peak Window"
          value={isLoading ? "—" : peakBucket && hasData ? formatCount(peakBucket.requests) : "—"}
          sub={peakWindow && hasData ? peakWindow : "No data yet"}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Received"
          value={isLoading ? "—" : totals ? formatBytes(totals.bytesIn) : "—"}
          sub="Data from visitors"
          icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
        />
        <MetricCard
          label="Delivered"
          value={isLoading ? "—" : totals ? formatBytes(totals.bytesOut) : "—"}
          sub="Data to visitors"
          icon={<ArrowUpFromLine className="h-3.5 w-3.5" />}
        />
      </div>

      {!hasData && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-background/40 py-12 gap-2">
          <Activity className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No traffic data available</p>
          <p className="text-xs text-muted-foreground/60">Metrics appear once your service receives requests</p>
        </div>
      )}

      {hasData && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Requests per window */}
          <div className="rounded-xl border bg-background/40 p-4">
            <p className="text-xs text-muted-foreground mb-3">Requests / window</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 8 }}>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={formatCount}
                  width={38}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload as TrafficBucket;
                      return (
                        <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                          <p className="text-muted-foreground mb-1">{d.time}</p>
                          <p className="text-green-400">{d.requests.toLocaleString()} requests</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="requests" fill="#22c55e" radius={[2, 2, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bandwidth in/out */}
          <div className="rounded-xl border bg-background/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Bandwidth</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" /> Received</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block" /> Delivered</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 8 }}>
                <defs>
                  <linearGradient id="inGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => formatBytes(v)}
                  width={44}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload as TrafficBucket;
                      return (
                        <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                          <p className="text-muted-foreground mb-1">{d.time}</p>
                          <p className="text-blue-400">Received: {formatBytes(d.bytesIn)}</p>
                          <p className="text-purple-400">Delivered: {formatBytes(d.bytesOut)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="bytesIn" stroke="#3b82f6" strokeWidth={1.5} fill="url(#inGradient)" animationDuration={300} />
                <Area type="monotone" dataKey="bytesOut" stroke="#a855f7" strokeWidth={1.5} fill="url(#outGradient)" animationDuration={300} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
