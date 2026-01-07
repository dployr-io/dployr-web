// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized process summary
 */
export const normalizedProcessSummarySchema = z.object({
  total: z.number(),
  running: z.number(),
  sleeping: z.number(),
  stopped: z.number(),
  zombie: z.number(),
});

/**
 * Normalized process
 * Unified representation from v1 and v1.1 process formats
 */
export const normalizedProcessSchema = z.object({
  pid: z.number(),
  user: z.string(),
  priority: z.number(),
  nice: z.number(),
  virtMem: z.number(),
  resMem: z.number(),
  shrMem: z.number(),
  state: z.string(),
  cpuPercent: z.number(),
  memPercent: z.number(),
  time: z.string(),
  command: z.string(),
});

/**
 * Normalized processes
 */
export const normalizedProcessesSchema = z.object({
  summary: normalizedProcessSummarySchema.nullable(),
  list: z.array(normalizedProcessSchema),
});

export type NormalizedProcessSummary = z.infer<typeof normalizedProcessSummarySchema>;
export type NormalizedProcess = z.infer<typeof normalizedProcessSchema>;
export type NormalizedProcesses = z.infer<typeof normalizedProcessesSchema>;

export const defaultProcesses: NormalizedProcesses = {
  summary: null,
  list: [],
};
