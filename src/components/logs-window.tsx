// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { Log, LogLevel, LogTimeRange } from "@/types";
import { formatMetadata, getLabelColor } from "@/lib/format-metadata";
import { ArrowDown, ChevronDown, ChevronRight, Pause } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVirtualizer } from "@tanstack/react-virtual";
import { LogTimeSelector, getTimeRangeMs } from "@/components/log-time-selector";
export { getTimeRangeMs };

interface LogFilterOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

interface LogFilter<TValue extends string = string> {
  id: string;
  label: string;
  value: TValue;
  options: LogFilterOption<TValue>[];
  onChange: (value: TValue) => void;
}

interface Props<TFilterValue extends string = string> {
  logs: Log[];
  filteredLogs: Log[];
  selectedLevel: "ALL" | LogLevel;
  setSelectedLevel: (level: "ALL" | LogLevel) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
  extraFilters?: LogFilter<TFilterValue>[];
  onScrollPositionChange?: (isAtBottom: boolean) => void;
  timeRange?: LogTimeRange;
  onTimeRangeChange?: (range: LogTimeRange) => void;
  isStreaming?: boolean;
  showTimeFilter?: boolean;
}

const getLevelColor = (level: Log["level"]) => {
  switch (level) {
    case "DEBUG":
      return "dark:text-sky-400 text-sky-600";
    case "INFO":
      return "dark:text-muted-foreground text-muted-foreground";
    case "WARNING":
      return "dark:text-orange-400 text-orange-600";
    case "ERROR":
    case "CRITICAL":
    case "ALERT":
    case "EMERGENCY":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
};

const LogEntry = memo(({ log }: { log: Log }) => {
  const [expanded, setExpanded] = useState(false);
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
  const levelColor = getLevelColor(log.level);

  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  return (
    <div className="border-b p-3">
      <div className="flex items-start gap-2">
        {/* Expand toggle for metadata */}
        {hasMetadata ? (
          <button
            type="button"
            onClick={toggleExpanded}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "Collapse metadata" : "Expand metadata"}
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {/* Timestamp */}
        {log.timestamp && (
          <span className={`min-w-16 shrink-0 whitespace-nowrap text-xs ${levelColor}`}>
            {log.timestamp.toLocaleString()}
          </span>
        )}

        {/* Message */}
        <span className={`text-xs font-medium ${levelColor}`}>{log.message}</span>
      </div>

      {/* Collapsible metadata */}
      {expanded && hasMetadata && (
        <div className="ml-5 mt-2 space-y-0.5 text-xs font-mono">
          {formatMetadata(log.metadata!).map((entry, idx) => (
            <div
              key={`${entry.label}-${idx}`}
              className="flex gap-1"
              style={{ paddingLeft: `${entry.indent * 12}px` }}
            >
              <span className={`shrink-0 ${getLabelColor(entry.label)}`}>
                {entry.label}:
              </span>
              {entry.value !== null && (
                <span className="text-foreground/80 break-all">{entry.value}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

LogEntry.displayName = "LogEntry";

export function LogsWindow<TFilterValue extends string = string>({
  logs,
  filteredLogs,
  selectedLevel,
  setSelectedLevel,
  searchQuery,
  setSearchQuery,
  logsEndRef,
  extraFilters,
  onScrollPositionChange,
  timeRange = "live",
  onTimeRangeChange,
  isStreaming,
  showTimeFilter = true,
}: Props<TFilterValue>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [followMode, setFollowMode] = useState(true);

  // Apply time-based filtering
  const timeFilteredLogs = useMemo(() => {
    const rangeMs = getTimeRangeMs(timeRange);
    if (!rangeMs) return filteredLogs; // "live" mode shows all logs
    
    const cutoffTime = Date.now() - rangeMs;
    return filteredLogs.filter(log => log.timestamp && log.timestamp.getTime() >= cutoffTime);
  }, [filteredLogs, timeRange]);

  const virtualizer = useVirtualizer({
    count: timeFilteredLogs.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 56, // Estimated height of each log entry
    overscan: 10, // Render 10 extra items above/below viewport
  });

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onScrollPositionChange) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      onScrollPositionChange(atBottom);
      
      // Auto-disable follow mode if user scrolls up
      if (!atBottom && followMode) {
        setFollowMode(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [onScrollPositionChange, followMode]);

  // Auto-scroll when follow mode is enabled and new logs arrive
  useEffect(() => {
    if (followMode && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [timeFilteredLogs, followMode]);
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border">
      <div className="flex shrink-0 gap-2 bg-neutral-50 p-2 dark:bg-neutral-900">
        {/* Time Range Selector */}
        {onTimeRangeChange && showTimeFilter && (
          <LogTimeSelector
            value={timeRange}
            onChange={onTimeRangeChange}
            isStreaming={isStreaming}
          />
        )}

        {/* Log Level Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="default" variant={"outline"} className="group min-w-40 text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent">
              {selectedLevel === "ALL" ? "All logs" : selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1).toLowerCase()}
              <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-40 rounded-lg" align="start">
            <DropdownMenuItem onClick={() => setSelectedLevel("DEBUG")}>Debug</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedLevel("INFO")}>Info</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedLevel("WARNING")}>Warning</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedLevel("ERROR")}>Error</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedLevel("ALL")}>All logs</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {extraFilters?.map(filter => {
          const selectedOption = filter.options.find(option => option.value === filter.value);

          return (
            <DropdownMenu key={filter.id}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="default"
                  variant={"outline"}
                  className="group min-w-40 text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
                >
                  {selectedOption ? selectedOption.label : filter.label}
                  <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-40 rounded-lg" align="start">
                {filter.options.map(option => (
                  <DropdownMenuItem key={option.value} onClick={() => filter.onChange(option.value)}>
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}

        {/* Search Input */}
        <Input
          id="search"
          type="search"
          name="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoFocus
          tabIndex={1}
          autoComplete="search"
          placeholder="Search for a log entry..."
          className="dark:bg-neutral-950"
        />

        {/* Follow Mode Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={followMode ? "default" : "outline"}
              onClick={() => {
                setFollowMode(!followMode);
                if (!followMode) {
                  logsEndRef.current?.scrollIntoView({ behavior: "auto" });
                }
              }}
              className="shrink-0"
            >
              {followMode ? (
                <Pause className="animate-pulse" />
              ) : (
                <ArrowDown />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {followMode ? "Following new logs" : "Click to follow"}
          </TooltipContent>
        </Tooltip>
      </div>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto">
          {timeFilteredLogs.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">No logs entries</p>
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map(virtualRow => (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <LogEntry log={timeFilteredLogs[virtualRow.index]} />
                </div>
              ))}
            </div>
          )}
          <div ref={logsEndRef} />
        </div>
        <div className="border-t border-accent bg-neutral-50 p-2 dark:bg-neutral-800">
          <p className="text-center text-xs text-muted-foreground">
            Showing {timeFilteredLogs.length} of {logs.length} log entries
          </p>
        </div>
      </div>
    </div>
  );
}
