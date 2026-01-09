// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Health status values
 */
export const healthStatusValue = z.enum(["ok", "degraded", "down", "error"]).or(z.string());

/**
 * Health check schema
 */
export const healthSchema = z.object({
  overall: healthStatusValue,
  websocket: healthStatusValue.optional(),
  tasks: healthStatusValue.optional(),
  proxy: healthStatusValue.optional(),
  auth: healthStatusValue.optional(),
});

export type HealthStatus = z.infer<typeof healthStatusValue>;
export type Health = z.infer<typeof healthSchema>;