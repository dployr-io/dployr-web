// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized load average
 */
export const normalizedLoadAverageSchema = z.object({
  oneMinute: z.number(),
  fiveMinute: z.number(),
  fifteenMinute: z.number(),
});

/**
 * Normalized CPU metrics
 * All values are percentages (0-100)
 */
export const normalizedCpuSchema = z.object({
  count: z.number(),
  userPercent: z.number(),
  systemPercent: z.number(),
  idlePercent: z.number(),
  iowaitPercent: z.number(),
  loadAverage: normalizedLoadAverageSchema.optional(),
});

/**
 * Normalized memory metrics
 * All values in bytes
 */
export const normalizedMemorySchema = z.object({
  totalBytes: z.number(),
  usedBytes: z.number(),
  freeBytes: z.number(),
  availableBytes: z.number(),
  bufferCacheBytes: z.number(),
});

/**
 * Normalized swap metrics
 * All values in bytes
 */
export const normalizedSwapSchema = z.object({
  totalBytes: z.number(),
  usedBytes: z.number(),
  freeBytes: z.number(),
  availableBytes: z.number(),
});

/**
 * Normalized disk metrics
 * All values in bytes
 */
export const normalizedDiskSchema = z.object({
  filesystem: z.string(),
  mountPoint: z.string(),
  totalBytes: z.number(),
  usedBytes: z.number(),
  availableBytes: z.number(),
});

/**
 * Normalized resources (CPU, memory, swap, disks)
 */
export const normalizedResourcesSchema = z.object({
  cpu: normalizedCpuSchema.nullable(),
  memory: normalizedMemorySchema.nullable(),
  swap: normalizedSwapSchema.nullable(),
  disks: z.array(normalizedDiskSchema),
});

export type NormalizedLoadAverage = z.infer<typeof normalizedLoadAverageSchema>;
export type NormalizedCpu = z.infer<typeof normalizedCpuSchema>;
export type NormalizedMemory = z.infer<typeof normalizedMemorySchema>;
export type NormalizedSwap = z.infer<typeof normalizedSwapSchema>;
export type NormalizedDisk = z.infer<typeof normalizedDiskSchema>;
export type NormalizedResources = z.infer<typeof normalizedResourcesSchema>;

export const defaultResources: NormalizedResources = {
  cpu: null,
  memory: null,
  swap: null,
  disks: [],
};
