// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Process summary schema
 */
export const processSummarySchema = z.object({
  total: z.number(),
  running: z.number(),
  sleeping: z.number(),
  stopped: z.number(),
  zombie: z.number(),
});

/**
 * Individual process schema (v1.1 format)
 */
export const processSchema = z.object({
  pid: z.number(),
  user: z.string(),
  priority: z.number(),
  nice: z.number(),
  virtual_memory_bytes: z.number(),
  resident_memory_bytes: z.number(),
  shared_memory_bytes: z.number(),
  state: z.string(),
  cpu_percent: z.number(),
  memory_percent: z.number(),
  cpu_time: z.string(),
  command: z.string(),
});

/**
 * Processes container schema
 */
export const processesSchema = z.object({
  summary: processSummarySchema.optional(),
  list: z.array(processSchema).optional(),
});

export type ProcessSummary = z.infer<typeof processSummarySchema>;
export type Process = z.infer<typeof processSchema>;
export type Processes = z.infer<typeof processesSchema>;