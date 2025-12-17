// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Log, LogLevel } from "@/types";

export type LogStreamMode = "tail" | "historical";

export const LOG_LEVEL_HIERARCHY = ["DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY"] as const;

export interface LogBufferRefs {
  logCounterRef: React.RefObject<number>;
  logBufferRef: React.RefObject<Log[]>;
  flushTimerRef: React.RefObject<NodeJS.Timeout | null>;
}

/**
 * Parse a raw log entry into a Log object
 */
export function parseLogEntry(entry: any, logCounter: number): Log {
  const { msg, message: entryMessage, level, time, timestamp, ...rest } = entry || {};
  const metadata: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(rest || {})) {
    if (value !== undefined && value !== null) {
      metadata[key] = value;
    }
  }

  return {
    id: `log-${logCounter}`,
    message: msg ?? entryMessage ?? "",
    level: (level?.toUpperCase() || "INFO") as LogLevel,
    timestamp: new Date(time ?? timestamp ?? Date.now()),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

/**
 * Parse multiple log entries from a message
 */
export function parseLogEntries(entries: any[], logCounterRef: React.MutableRefObject<number>): Log[] {
  return entries.map((entry: any) => parseLogEntry(entry, logCounterRef.current++));
}

/**
 * Create a buffered flush function for batching log updates
 */
export function createLogFlusher(
  logBufferRef: React.MutableRefObject<Log[]>,
  flushTimerRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setLogs: React.Dispatch<React.SetStateAction<Log[]>>,
  batchMs: number = 100,
) {
  const flushLogs = () => {
    if (logBufferRef.current.length > 0) {
      setLogs(prev => [...prev, ...logBufferRef.current]);
      logBufferRef.current = [];
    }
  };

  const scheduleFlush = () => {
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushLogs();
        flushTimerRef.current = null;
      }, batchMs);
    }
  };

  const cancelFlush = () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  };

  return { flushLogs, scheduleFlush, cancelFlush };
}

/**
 * Filter logs by level and search query
 */
export function filterLogs(
  logs: Log[],
  selectedLevel: "ALL" | LogLevel,
  searchQuery: string,
): Log[] {
  let filtered = logs;

  if (selectedLevel !== "ALL") {
    const selectedLevelIndex = LOG_LEVEL_HIERARCHY.indexOf(selectedLevel as any);
    filtered = filtered.filter(log => {
      if (!log.level) return false;
      const logLevelIndex = LOG_LEVEL_HIERARCHY.indexOf(log.level as any);
      return logLevelIndex >= selectedLevelIndex;
    });
  }

  if (searchQuery) {
    filtered = filtered.filter(log =>
      log.message.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  return filtered;
}

/**
 * Reset log state for historical mode switch
 */
export function resetLogState(
  setLogs: React.Dispatch<React.SetStateAction<Log[]>>,
  logBufferRef: React.RefObject<Log[]>,
  logCounterRef: React.RefObject<number>,
  setLastOffset?: React.Dispatch<React.SetStateAction<number>>,
  lastOffsetRef?: React.RefObject<number>,
) {
  setLogs([]);
  logBufferRef.current = [];
  logCounterRef.current = 0;
  if (setLastOffset) setLastOffset(0);
  if (lastOffsetRef) lastOffsetRef.current = 0;
}

/**
 * Check if scroll container is near bottom
 */
export function isNearBottom(container: HTMLElement, threshold: number = 100): boolean {
  const { scrollTop, scrollHeight, clientHeight } = container;
  return scrollHeight - scrollTop - clientHeight < threshold;
}
