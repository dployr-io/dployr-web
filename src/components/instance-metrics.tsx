// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MemoryProfileEntry } from "@/types";
import { Activity } from "lucide-react";

interface MiniSparklineProps {
  data: MemoryProfileEntry[];
  type: "memory" | "cpu";
  width?: number;
  height?: number;
  className?: string;
}

export function MiniSparkline({ data, type, width = 60, height = 20, className }: MiniSparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div className={cn("flex items-center justify-center text-xs text-muted-foreground", className)} style={{ width, height }}>
        <Activity className="h-3 w-3 opacity-30" />
      </div>
    );
  }

  const values = data.map(d => type === "memory" ? d.mem_used_percent : (d.cpu_user + d.cpu_system));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const currentValue = values[values.length - 1];
  const strokeColor = currentValue >= 90 ? "#ef4444" : currentValue >= 70 ? "#eab308" : "#22c55e";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <svg width={width} height={height} className={cn("overflow-visible", className)}>
          <polyline
            points={points}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </TooltipTrigger>
      <TooltipContent>
        {type === "memory" ? "Memory" : "CPU"}: {currentValue.toFixed(1)}%
      </TooltipContent>
    </Tooltip>
  );
}

// Helper to format bytes
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

// Helper to format uptime
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
