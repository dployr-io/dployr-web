// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { forwardRef } from "react";
import { ProxyIcon } from "./proxy-icon";
import { getStatusColor } from "./utils";
import { cn } from "@/lib/utils";

interface ProxyNodeProps extends React.SVGProps<SVGGElement> {
  x: number;
  y: number;
  routeCount: number;
  status: string;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const ProxyNode = forwardRef<SVGGElement, ProxyNodeProps>(({ 
  x, 
  y, 
  routeCount,
  status,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  className,
  ...props
}, ref) => {
  return (
    <g 
      ref={ref}
      transform={`translate(${x}, ${y})`} 
      className={cn(onContextMenu && "cursor-context-menu", className)} 
      {...props}
    >
      {/* Outer ring */}
      <circle
        r="55"
        fill="none"
        className="stroke-stone-400 dark:stroke-stone-600"
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0.5"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0"
          to="360"
          dur="20s"
          repeatCount="indefinite"
        />
      </circle>
      
      {/* Main circle */}
      <circle
        r="45"
        className="fill-stone-300 dark:fill-stone-800 stroke-stone-400 dark:stroke-stone-700"
        strokeWidth="2"
      />
      
      {/* Content */}
      <foreignObject x="-35" y="-35" width="70" height="70" className="pointer-events-none">
        <div 
          className="flex flex-col items-center justify-center h-full gap-1 select-none"
          style={{ pointerEvents: 'auto' }}
          onContextMenu={onContextMenu}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <ProxyIcon className="h-12 w-12 text-stone-700 dark:text-stone-400" />
        </div>
      </foreignObject>
      
      {/* Status indicator */}
      <circle cx="32" cy="-32" r="6" fill={getStatusColor(status)} />
    </g>
  );
});
ProxyNode.displayName = "ProxyNode";
