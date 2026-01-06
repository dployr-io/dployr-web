// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/status-badge";

interface ProxyBadgeProps {
  type: string;
  status: string;
  version?: string | null;
  routeCount: number;
  className?: string;
}

export function ProxyBadge({ type, status, version, routeCount, className }: ProxyBadgeProps) {
  const displayType = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StatusBadge status={status} variant="compact" />
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" />
            <span>{displayType}</span>
            {version && <span className="opacity-60">v{version}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{displayType} {version ? `v${version}` : ""}</p>
          <p>{routeCount} {routeCount === 1 ? "route" : "routes"} configured</p>
        </TooltipContent>
      </Tooltip>
      {routeCount > 0 && (
        <span className="text-xs text-muted-foreground">
          {routeCount} {routeCount === 1 ? "route" : "routes"}
        </span>
      )}
    </div>
  );
}