// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Log, LogLevel, LogSource } from "@/types";

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
export function parseLogEntry(entry: any, logCounter: number, source?: LogSource): Log {
  let { msg, message: entryMessage, level, time, timestamp, ...rest } = entry || {};

  // Loki stores log lines verbatim, so msg may arrive as a JSON-stringified object.
  // Unwrap it so the user sees structured fields rather than a raw JSON blob.
  if (typeof msg === "string" && msg.startsWith("{")) {
    try {
      const inner = JSON.parse(msg) as Record<string, unknown>;
      msg = (inner.msg ?? inner.message ?? msg) as string;
      level = level ?? inner.level;
      rest = { ...inner, ...rest };
      delete (rest as any).msg;
      delete (rest as any).message;
      delete (rest as any).level;
      delete (rest as any).time;
      delete (rest as any).timestamp;
    } catch {}
  }

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
    ...(source ? { source } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

export function parseLogEntries(entries: any[], logCounterRef: React.MutableRefObject<number>, source?: LogSource): Log[] {
  return entries.map((entry: any) => parseLogEntry(entry, logCounterRef.current++, source));
}

/**
 * Sort logs by timestamp in ascending order (oldest first)
 */
export function sortLogsByTimestamp(logs: Log[]): Log[] {
  return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Merge two sorted log arrays efficiently
 * Assumes both arrays are already sorted by timestamp
 * Returns a new sorted array without modifying inputs
 */
export function mergeSortedLogs(existing: Log[], incoming: Log[]): Log[] {
  if (incoming.length === 0) return existing;
  if (existing.length === 0) return incoming;

  const result: Log[] = [];
  let i = 0;
  let j = 0;

  while (i < existing.length && j < incoming.length) {
    if (existing[i].timestamp.getTime() <= incoming[j].timestamp.getTime()) {
      result.push(existing[i]);
      i++;
    } else {
      result.push(incoming[j]);
      j++;
    }
  }

  // Append remaining elements
  while (i < existing.length) {
    result.push(existing[i]);
    i++;
  }

  while (j < incoming.length) {
    result.push(incoming[j]);
    j++;
  }

  return result;
}

/**
 * Create a buffered flush function for batching log updates
 * Sorts buffer by timestamp before merging with existing logs
 */
export function createLogFlusher(
  logBufferRef: React.RefObject<Log[]>,
  flushTimerRef: React.RefObject<NodeJS.Timeout | null>,
  setLogs: React.Dispatch<React.SetStateAction<Log[]>>,
  batchMs: number = 100,
) {
  const flushLogs = () => {
    if (logBufferRef.current.length > 0) {
      const sortedBuffer = sortLogsByTimestamp([...logBufferRef.current]);
      
      setLogs(prev => mergeSortedLogs(prev, sortedBuffer));
      
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

// Ordered most-specific first. All patterns are anchored to the start of the string so
// timestamps embedded mid-message (e.g. Apache combined log IP prefix) are never stripped.
const LEADING_TIMESTAMP_PATTERNS: RegExp[] = [
  // PHP built-in server / Apache ErrorLog: [Sat Jun 13 09:14:57 2026] or [Sat Jun  3 09:14:57 2026]
  /^\[\w{3} \w{3}\s+\d{1,2} \d{2}:\d{2}:\d{2} \d{4}\]\s*/,
  // ISO 8601: 2026-06-13T09:14:57Z  2026-06-13T09:14:57.123Z  2026-06-13T09:14:57+00:00
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\s*/,
  // Date with space separator: 2026-06-13 09:14:57  2026-06-13 09:14:57.123
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?\s*/,
  // nginx / Go stdlib: 2026/06/13 09:14:57
  /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\s*/,
];

export function stripMessageTimestamp(message: string): string {
  for (const pattern of LEADING_TIMESTAMP_PATTERNS) {
    const stripped = message.replace(pattern, "");
    if (stripped !== message) return stripped;
  }
  return message;
}
