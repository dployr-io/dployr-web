// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Load average schema
 */
export const loadAverageSchema = z.object({
  one_minute: z.number(),
  five_minute: z.number(),
  fifteen_minute: z.number(),
});

/**
 * CPU resources schema
 */
export const cpuSchema = z.object({
  count: z.number(),
  user_percent: z.number(),
  system_percent: z.number(),
  idle_percent: z.number(),
  iowait_percent: z.number(),
  load_average: loadAverageSchema.optional(),
});

/**
 * Memory resources schema
 */
export const memorySchema = z.object({
  total_bytes: z.number(),
  used_bytes: z.number(),
  free_bytes: z.number(),
  available_bytes: z.number(),
  buffer_cache_bytes: z.number(),
});

/**
 * Swap resources schema
 */
export const swapSchema = z.object({
  total_bytes: z.number(),
  used_bytes: z.number(),
  free_bytes: z.number(),
  available_bytes: z.number(),
});

/**
 * Disk information schema
 */
export const diskSchema = z.object({
  filesystem: z.string(),
  mount_point: z.string(),
  total_bytes: z.number(),
  used_bytes: z.number(),
  available_bytes: z.number(),
});

/**
 * Complete resources schema
 */
export const resourcesSchema = z.object({
  cpu: cpuSchema.optional(),
  memory: memorySchema.optional(),
  swap: swapSchema.optional(),
  disks: z.array(diskSchema).optional(),
});

export type LoadAverage = z.infer<typeof loadAverageSchema>;
export type Cpu = z.infer<typeof cpuSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type Swap = z.infer<typeof swapSchema>;
export type Disk = z.infer<typeof diskSchema>;
export type Resources = z.infer<typeof resourcesSchema>;
