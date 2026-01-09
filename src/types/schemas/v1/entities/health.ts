// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Health status value (v1 format)
 */
export const healthStatusValue = z.enum(["ok", "degraded", "down", "error"]).or(z.string());

/**
 * Health schema (v1 format)
 */
export const healthSchema = z.object({
  overall: healthStatusValue,
  ws: healthStatusValue.optional(),
  tasks: healthStatusValue.optional(),
  auth: healthStatusValue.optional(),
});

export type HealthStatus = z.infer<typeof healthStatusValue>;
export type Health = z.infer<typeof healthSchema>;