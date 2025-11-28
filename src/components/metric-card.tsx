import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  progress?: number;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({ label, value, progress, trend, className }: MetricCardProps) {
  const valueNode =
    typeof value === "string" || typeof value === "number" ? (
      <p className="font-mono text-sm font-medium">{value}</p>
    ) : (
      <div className="font-mono text-sm font-medium">{value}</div>
    );

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2">
        {valueNode}
        {trend && (
          <span
            className={cn("text-xs", {
              "text-green-500": trend === "up",
              "text-red-500": trend === "down",
              "text-muted-foreground": trend === "neutral",
            })}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
      {typeof progress === "number" && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all duration-300", {
              "bg-green-500": progress < 70,
              "bg-yellow-500": progress >= 70 && progress < 90,
              "bg-red-500": progress >= 90,
            })}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
