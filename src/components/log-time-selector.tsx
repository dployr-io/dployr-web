// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown, Clock, Radio } from "lucide-react";

export type LogTimeRange = "live" | "5m" | "15m" | "30m" | "1h" | "3h" | "6h" | "12h" | "24h";

export function getTimeRangeMs(range: LogTimeRange): number | null {
  if (range === "live") return null;
  const multipliers: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
  };
  const match = range.match(/^(\d+)(m|h)$/);
  if (!match) return null;
  return parseInt(match[1], 10) * multipliers[match[2]];
}

interface LogTimeSelectorProps {
  value: LogTimeRange;
  onChange: (value: LogTimeRange) => void;
  isStreaming?: boolean;
  className?: string;
}

const timeRangeOptions: { value: LogTimeRange; label: string; description?: string }[] = [
  { value: "live", label: "Live", description: "Follow new logs" },
  { value: "5m", label: "Last 5 mins" },
  { value: "15m", label: "Last 15 mins" },
  { value: "30m", label: "Last 30 mins" },
  { value: "1h", label: "Last 1 hour" },
  { value: "3h", label: "Last 3 hours" },
  { value: "6h", label: "Last 6 hours" },
  { value: "12h", label: "Last 12 hours" },
  { value: "24h", label: "Last 24 hours" },
];

export function LogTimeSelector({ value, onChange, isStreaming, className }: LogTimeSelectorProps) {
  const selectedOption = timeRangeOptions.find((opt) => opt.value === value);
  const isLive = value === "live";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="default"
          variant="outline"
          className={cn(
            "group min-w-36 text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent",
            isLive,
            className
          )}
        >
          <span className="flex items-center gap-2">
            {isLive ? (
              <>
                <Radio
                  className={cn(
                    "h-3 w-3",
                    isStreaming ? "animate-pulse" : "text-muted-foreground"
                  )}
                />
                <span>Live</span>
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>{selectedOption?.label}</span>
              </>
            )}
          </span>
          <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-44 rounded-lg" align="start">
        <DropdownMenuItem
          onClick={() => onChange("live")}
          className={cn(value === "live" && "bg-accent")}
        >
          <Radio className="mr-2 h-3 w-3" />
          <span>Live</span>
          <span className="ml-auto text-xs text-muted-foreground">Follow</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {timeRangeOptions
          .filter((opt) => opt.value !== "live")
          .map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(value === option.value && "bg-accent")}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
