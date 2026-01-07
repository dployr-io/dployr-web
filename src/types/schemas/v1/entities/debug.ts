// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Disk information schema (v1 format)
 */
export const diskInfoSchema = z.object({
  filesystem: z.string(),
  mountpoint: z.string(),
  size_bytes: z.number(),
  used_bytes: z.number().optional(),
  available_bytes: z.number(),
});

/**
 * System debug information schema
 */
export const systemDebugSchema = z.object({
  cpu_count: z.number(),
  mem_total_bytes: z.number(),
  mem_used_bytes: z.number(),
  mem_free_bytes: z.number(),
  disks: z.array(diskInfoSchema).optional(),
  workers: z.number().optional(),
});

/**
 * WebSocket debug schema
 */
export const wsDebugSchema = z.object({
  connected: z.boolean(),
  last_connect_at: z.string().optional(),
  reconnects_since_start: z.number(),
});

/**
 * Tasks debug schema
 */
export const tasksDebugSchema = z.object({
  inflight: z.number(),
  done_unsent: z.number(),
});

/**
 * Auth debug schema
 */
export const authDebugSchema = z.object({
  agent_token_age_s: z.number(),
  agent_token_expires_in_s: z.number(),
  bootstrap_token: z.string().optional(),
});

/**
 * Complete debug schema (v1 format)
 */
export const debugSchema = z.object({
  ws: wsDebugSchema.optional(),
  tasks: tasksDebugSchema.optional(),
  auth: authDebugSchema.optional(),
  system: systemDebugSchema.optional(),
});

export type DiskInfo = z.infer<typeof diskInfoSchema>;
export type SystemDebug = z.infer<typeof systemDebugSchema>;
export type WsDebug = z.infer<typeof wsDebugSchema>;
export type TasksDebug = z.infer<typeof tasksDebugSchema>;
export type AuthDebug = z.infer<typeof authDebugSchema>;
export type Debug = z.infer<typeof debugSchema>;
