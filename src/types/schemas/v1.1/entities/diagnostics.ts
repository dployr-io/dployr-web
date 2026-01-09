// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * WebSocket diagnostics schema
 */
export const websocketDiagnosticsSchema = z.object({
  is_connected: z.boolean(),
  last_connected_at: z.string().optional(),
  reconnect_count: z.number(),
  last_error: z.string().nullable().optional(),
});

/**
 * Tasks diagnostics schema
 */
export const tasksDiagnosticsSchema = z.object({
  inflight_count: z.number(),
  unsent_count: z.number(),
  last_task_id: z.string().optional(),
  last_task_status: z.string().optional(),
  last_task_duration_ms: z.number().optional(),
  last_task_at: z.string().optional(),
});

/**
 * Auth diagnostics schema
 */
export const authDiagnosticsSchema = z.object({
  token_age_seconds: z.number(),
  token_expires_in_seconds: z.number(),
  bootstrap_token_preview: z.string().optional(),
});

/**
 * Worker diagnostics schema
 */
export const workerDiagnosticsSchema = z.object({
  max_concurrent: z.number(),
  active_jobs: z.number(),
});

/**
 * Certificate diagnostics schema
 */
export const certDiagnosticsSchema = z.object({
  not_after: z.string(),
  days_remaining: z.number(),
});

/**
 * Complete diagnostics schema
 */
export const diagnosticsSchema = z.object({
  websocket: websocketDiagnosticsSchema.optional(),
  tasks: tasksDiagnosticsSchema.optional(),
  auth: authDiagnosticsSchema.optional(),
  worker: workerDiagnosticsSchema.optional(),
  cert: certDiagnosticsSchema.optional(),
});

export type WebsocketDiagnostics = z.infer<typeof websocketDiagnosticsSchema>;
export type TasksDiagnostics = z.infer<typeof tasksDiagnosticsSchema>;
export type AuthDiagnostics = z.infer<typeof authDiagnosticsSchema>;
export type WorkerDiagnostics = z.infer<typeof workerDiagnosticsSchema>;
export type CertDiagnostics = z.infer<typeof certDiagnosticsSchema>;
export type Diagnostics = z.infer<typeof diagnosticsSchema>;