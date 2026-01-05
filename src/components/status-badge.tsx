// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/lib/utils";
import type { DeploymentStatus, ServiceStatus } from "@/types";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string | DeploymentStatus | ServiceStatus;
  variant?: "default" | "compact";
  type?: "service" | "deployment";
}

export function StatusBadge({ status, variant = "default", type }: StatusBadgeProps) {
  const normalized = typeof status === "string" ? status.toLowerCase() : "";
  
  const getStatusColor = () => {
    // For service/deployment types, use specific status values
    if (type === "service" || type === "deployment") {
      if (normalized === "completed" || normalized === "running") {
        return "bg-green-500/10 text-green-500 border-green-500/20";
      }
      if (normalized === "pending") {
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      }
      if (normalized === "stopped" || normalized === "failed") {
        return "bg-red-500/10 text-red-500 border-red-500/20";
      }
      if (normalized === "unknown" || normalized === "in_progress") {
        return "bg-muted text-muted-foreground border-border";
      }
    }
    
    // Generic status colors
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

  const getStatusIcon = () => {
    if (!type) return null;

    const iconSize = variant === "compact" ? 12 : 14;
    const iconClass = "mr-1";

    if (normalized === "running" || normalized === "completed") {
      return <CheckCircle2 width={iconSize} height={iconSize} className={iconClass} />;
    }
    if (normalized === "pending" || normalized === "in_progress" || normalized === "unknown") {
      return <Loader2 width={iconSize} height={iconSize} className={cn(iconClass, "animate-spin")} />;
    }
    if (normalized === "stopped" || normalized === "failed") {
      return <XCircle width={iconSize} height={iconSize} className={iconClass} />;
    }
    return null;
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        variant === "compact" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs",
        getStatusColor()
      )}
    >
      {getStatusIcon()}
      {typeof status === "string" ? status.charAt(0).toUpperCase() + status.slice(1) : "-"}
    </span>
  );
}
