// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import {
  platformSchema,
  buildInfoSchema,
  healthSchema,
  debugSchema,
  topSchema,
  deploymentSchema,
  serviceSchema,
  proxyStatusSchema,
  proxyAppSchema,
  fsSnapshotSchema,
} from "./entities";

/**
 * Instance stream update schema (v1 format)
 */
export const instanceStreamUpdateV1Schema = z.object({
  schema: z.literal("v1").optional(),
  seq: z.number(),
  epoch: z.string(),
  full: z.boolean(),
  instance_id: z.string(),
  build_info: buildInfoSchema.optional(),
  platform: platformSchema.optional(),
  status: z.enum(["healthy", "degraded", "unhealthy"]).optional(),
  mode: z.enum(["ready", "updating"]).optional(),
  uptime: z.string(),
  deployments: z.array(deploymentSchema).optional(),
  services: z.array(serviceSchema).optional(),
  proxy: proxyStatusSchema.optional(),
  proxies: z.array(proxyAppSchema).optional(),
  health: healthSchema.optional(),
  debug: debugSchema.optional(),
  fs: fsSnapshotSchema.optional(),
  top: topSchema.optional(),
});

export type InstanceStreamUpdateV1 = z.infer<typeof instanceStreamUpdateV1Schema>;

/**
 * Parse and validate v1 instance stream update data
 * @throws {z.ZodError} if validation fails
 */
export function parseV1(data: unknown): InstanceStreamUpdateV1 {
  return instanceStreamUpdateV1Schema.parse(data);
}

/**
 * Safely parse v1 instance stream update data without throwing
 * @returns parsed data or null if validation fails
 */
export function safeParseV1(data: unknown): InstanceStreamUpdateV1 | null {
  const result = instanceStreamUpdateV1Schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Type guard to check if data is a v1 instance stream update
 */
export function isV1(data: unknown): data is InstanceStreamUpdateV1 {
  return instanceStreamUpdateV1Schema.safeParse(data).success;
}