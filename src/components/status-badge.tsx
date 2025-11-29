// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "default" | "compact";
}

export function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() || "";
  
  const getStatusColor = () => {
    if (normalized === "healthy" || normalized === "ok" || normalized === "running" || normalized === "ready") {
      return "bg-green-500/10 text-green-500 border-green-500/20";
    }
    if (normalized === "down" || normalized === "error" || normalized === "failed") {
      return "bg-red-500/10 text-red-500 border-red-500/20";
    }
    if (normalized === "warning" || normalized === "degraded") {
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        variant === "compact" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs",
        getStatusColor()
      )}
    >
      {status}
    </span>
  );
}
