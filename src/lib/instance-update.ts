// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import {
  parseAndNormalize,
  type NormalizedInstanceData,
  type InstanceStreamUpdate,
} from "@/types/schemas";

// Re-export types for backward compatibility
export type { NormalizedInstanceData, InstanceStreamUpdate as InstanceUpdate };

/**
 * Normalize instance stream update data
 * Automatically detects schema version and converts to stable internal format
 */
export function normalizeInstanceUpdate(
  update: InstanceStreamUpdate | null
): NormalizedInstanceData | null {
  return parseAndNormalize(update);
}

/**
 * Format uptime seconds to human-readable string
 */
export function formatUptime(seconds: number): string {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number | undefined | null): string {
  if (bytes == null || isNaN(bytes)) return "0B";
  const gb = 1024 * 1024 * 1024;
  const mb = 1024 * 1024;
  const kb = 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(1)}GB`;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)}MB`;
  if (bytes >= kb) return `${(bytes / kb).toFixed(0)}KB`;
  return `${bytes}B`;
}
