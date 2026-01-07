// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Load average header schema (v1 format)
 */
export const loadAvgSchema = z.object({
  one: z.number(),
  five: z.number(),
  fifteen: z.number(),
});

/**
 * Top header schema
 */
export const topHeaderSchema = z.object({
  time: z.string().optional(),
  uptime: z.string().optional(),
  users: z.number().optional(),
  load_avg: loadAvgSchema.optional(),
});

/**
 * CPU metrics schema (v1 format)
 */
export const cpuMetricsSchema = z.object({
  user: z.number(),
  system: z.number(),
  nice: z.number().optional(),
  idle: z.number(),
  wait: z.number().optional(),
  hi: z.number().optional(),
  si: z.number().optional(),
  st: z.number().optional(),
});

/**
 * Memory metrics schema (v1 format - values in MB)
 */
export const memoryMetricsSchema = z.object({
  total: z.number(),
  free: z.number(),
  used: z.number(),
  buffer_cache: z.number().optional(),
});

/**
 * Swap metrics schema (v1 format)
 */
export const swapMetricsSchema = z.object({
  total: z.number(),
  free: z.number(),
  used: z.number(),
  available: z.number().optional(),
});

/**
 * Tasks summary schema
 */
export const tasksSummarySchema = z.object({
  total: z.number(),
  running: z.number(),
  sleeping: z.number(),
  stopped: z.number(),
  zombie: z.number(),
});

/**
 * Process schema (v1 format)
 */
export const processV1Schema = z.object({
  pid: z.number(),
  user: z.string(),
  priority: z.number(),
  nice: z.number(),
  virt_mem: z.number(),
  res_mem: z.number(),
  shr_mem: z.number(),
  state: z.string(),
  cpu_pct: z.number(),
  mem_pct: z.number(),
  time: z.string(),
  command: z.string(),
});

/**
 * Top metrics schema (v1 format)
 */
export const topSchema = z.object({
  header: topHeaderSchema.optional(),
  tasks: tasksSummarySchema.optional(),
  cpu: cpuMetricsSchema.optional(),
  memory: memoryMetricsSchema.optional(),
  swap: swapMetricsSchema.optional(),
  processes: z.array(processV1Schema).optional(),
});

export type LoadAvg = z.infer<typeof loadAvgSchema>;
export type TopHeader = z.infer<typeof topHeaderSchema>;
export type CpuMetrics = z.infer<typeof cpuMetricsSchema>;
export type MemoryMetrics = z.infer<typeof memoryMetricsSchema>;
export type SwapMetrics = z.infer<typeof swapMetricsSchema>;
export type TasksSummary = z.infer<typeof tasksSummarySchema>;
export type ProcessV1 = z.infer<typeof processV1Schema>;
export type Top = z.infer<typeof topSchema>;
