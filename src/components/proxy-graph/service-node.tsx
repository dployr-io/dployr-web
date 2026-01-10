// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/lib/utils";
import { Box } from "lucide-react";
import type { NormalizedProxyRoute, NormalizedService } from "@/types";

export function ServiceNode({
  service,
  proxyApp,
  isProxied,
  x,
  y,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
}: {
  service: NormalizedService;
  proxyApp?: NormalizedProxyRoute | null;
  isProxied: boolean;
  x: number;
  y: number;
  isSelected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={cn(onContextMenu && "cursor-context-menu", onClick && "cursor-pointer")}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={onContextMenu}
    >
      {/* Card background */}
      <rect
        x="-80"
        y="-40"
        width="160"
        height="80"
        rx="8"
        className="fill-stone-300 dark:fill-stone-800"
      />
      <rect
        x="-80"
        y="-40"
        width="160"
        height="80"
        rx="8"
        fill="none"
        className="stroke-stone-400 dark:stroke-stone-700"
        strokeWidth="1.5"
        strokeDasharray={isProxied ? undefined : "6 4"}
      />
      
      {/* Content */}
      <foreignObject x="-75" y="-35" width="150" height="70">
        <div className="flex flex-col h-full p-1 select-none"
          onContextMenu={onContextMenu}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" title={service.name}>
                {service.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isProxied ? "Proxied" : "Not Proxied"}
              </p>
            </div>
          </div>
          <div className="mt-auto">
            <code className="text-[9px] bg-stone-400 dark:bg-stone-900 px-1.5 py-0.5 rounded block truncate">
              {proxyApp?.domain ?? proxyApp?.upstream}
            </code>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
