// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

export function ConnectionPath({ 
  from, 
  to, 
  isActive = true,
  animated = false,
}: { 
  from: { x: number; y: number };
  to: { x: number; y: number };
  isActive?: boolean;
  animated?: boolean;
}) {
  const dx = to.x - from.x;
  
  // Create smooth bezier curve
  const midX = from.x + dx * 0.5;
  const path = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={isActive ? "#3b82f6" : "#475569"}
        strokeWidth={isActive ? 2 : 1.5}
        strokeLinecap="round"
        strokeDasharray={isActive ? undefined : "6 4"}
        opacity={isActive ? 0.8 : 0.4}
      />
      {animated && isActive && (
        <circle r="4" fill="#3b82f6">
          <animateMotion dur="2s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </g>
  );
}
