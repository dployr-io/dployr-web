// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Clock, AlertTriangle, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrafficDataPoint, TrafficSummary } from "@/hooks/use-service-traffic";

interface TrafficMetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  className?: string;
}

function TrafficMetricCard({ label, value, sub, icon, className }: TrafficMetricCardProps) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl border bg-background/40 p-4", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

interface LatencyChartProps {
  data: TrafficDataPoint[];
  height?: number;
}

function LatencyChart({ data, height = 140 }: LatencyChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No latency data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
        <defs>
          <linearGradient id="p50Gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="p99Gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          interval="preserveStartEnd"
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}ms`} width={38} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload?.length) {
              const d = payload[0].payload as TrafficDataPoint;
              return (
                <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                  <p className="text-muted-foreground mb-1">{d.time}</p>
                  <p className="text-blue-400">P50: {d.p50LatencyMs}ms</p>
                  <p className="text-orange-400">P99: {d.p99LatencyMs}ms</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area type="monotone" dataKey="p50LatencyMs" stroke="#3b82f6" strokeWidth={1.5} fill="url(#p50Gradient)" animationDuration={300} />
        <Area type="monotone" dataKey="p99LatencyMs" stroke="#f97316" strokeWidth={1.5} fill="url(#p99Gradient)" animationDuration={300} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface RpsChartProps {
  data: TrafficDataPoint[];
  height?: number;
}

function RpsChart({ data, height = 140 }: RpsChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No request data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
        <defs>
          <linearGradient id="rpsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="errGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          interval="preserveStartEnd"
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}/s`} width={38} />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload?.length) {
              const d = payload[0].payload as TrafficDataPoint;
              return (
                <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                  <p className="text-muted-foreground mb-1">{d.time}</p>
                  <p className="text-green-400">Req/s: {d.requestsPerSecond.toFixed(1)}</p>
                  <p className="text-red-400">Errors: {d.errorRate.toFixed(1)}%</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area type="monotone" dataKey="requestsPerSecond" stroke="#22c55e" strokeWidth={1.5} fill="url(#rpsGradient)" animationDuration={300} />
        <Area type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={1.5} fill="url(#errGradient)" animationDuration={300} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface ServiceTrafficChartProps {
  data: TrafficDataPoint[];
  summary: TrafficSummary | null;
  isLoading?: boolean;
}

export function ServiceTrafficChart({ data, summary, isLoading }: ServiceTrafficChartProps) {
  const hasData = data.length > 0;

  const errorColor = useMemo(() => {
    if (!summary) return "";
    if (summary.errorRate >= 5) return "text-red-500";
    if (summary.errorRate >= 1) return "text-yellow-500";
    return "text-green-500";
  }, [summary]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TrafficMetricCard
          label="Requests / sec"
          value={isLoading ? "—" : hasData && summary ? `${summary.currentRps.toFixed(1)}` : "—"}
          sub={hasData && summary ? `${summary.totalRequests.toLocaleString()} total` : "No data"}
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <TrafficMetricCard
          label="P99 Latency"
          value={isLoading ? "—" : hasData && summary ? `${summary.p99LatencyMs}ms` : "—"}
          sub="99th percentile"
          icon={<Clock className="h-3.5 w-3.5" />}
        />
        <TrafficMetricCard
          label="Error Rate"
          value={isLoading ? "—" : hasData && summary ? `${summary.errorRate.toFixed(2)}%` : "—"}
          sub="4xx + 5xx responses"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          className={hasData && summary ? errorColor : ""}
        />
        <TrafficMetricCard
          label="Connections"
          value={isLoading ? "—" : hasData && summary ? `${summary.activeConnections}` : "—"}
          sub="Active right now"
          icon={<Wifi className="h-3.5 w-3.5" />}
        />
      </div>

      {!hasData && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-background/40 py-16 gap-2">
          <Activity className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No traffic data available</p>
          <p className="text-xs text-muted-foreground/60">Metrics will appear here once your service receives requests</p>
        </div>
      )}

      {hasData && (
        <>
          {/* Req/s + error rate chart */}
          <div className="rounded-xl border bg-background/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Request Rate</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" /> Req/s</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" /> Error %</span>
              </div>
            </div>
            <RpsChart data={data} />
          </div>

          {/* Latency chart */}
          <div className="rounded-xl border bg-background/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">Response Latency</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" /> P50</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-orange-500 inline-block" /> P99</span>
              </div>
            </div>
            <LatencyChart data={data} />
          </div>
        </>
      )}
    </div>
  );
}
