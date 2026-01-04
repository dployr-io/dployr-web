// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/lib/utils";
import { getStatusColor } from "./utils";
import { ServerIcon } from "./server-icon";

export interface InstanceNodeProps extends React.SVGProps<SVGGElement> {
  name: string;
  status?: string;
  x: number;
  y: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function InstanceNode({ 
  name, 
  status,
  x, 
  y,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
}: InstanceNodeProps) {
  return (
    <g transform={`translate(${x}, ${y})`} className={cn(onContextMenu && "cursor-context-menu", onClick && "cursor-pointer")} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onContextMenu={onContextMenu}>
      {/* Card background */}
      <rect
        x="-70"
        y="-45"
        width="140"
        height="90"
        rx="8"
        className="fill-stone-300 dark:fill-stone-800 stroke-stone-400 dark:stroke-stone-700"
        strokeWidth="1.5"
      />
      
      {/* Content */}
      <foreignObject x="-60" y="-38" width="120" height="76" className="pointer-events-none">
        <div 
          className="flex flex-col items-center justify-center h-full gap-2 select-none"
          style={{ pointerEvents: 'auto' }}
          onContextMenu={onContextMenu}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {/* Icon */}
          <ServerIcon className="h-12 w-12 text-stone-700 dark:text-stone-400" />
          {/* Label */}
          <div className="text-center">
            <p className="text-xs font-medium truncate max-w-[110px] font-mono">{name}</p>
          </div>
        </div>
      </foreignObject>
      
      {/* Status indicator */}
      <circle cx="55" cy="-30" r="5" fill={getStatusColor(status)} />
    </g>
  );
}
