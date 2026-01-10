// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import {
  agentSchema,
  statusSchema,
  healthSchema,
  resourcesSchema,
  workloadsSchema,
  proxySchema,
  processesSchema,
  filesystemSchema,
  diagnosticsSchema,
} from "./entities";

/**
 * Instance Stream Update v1.1 Schema
 */
export const instanceStreamUpdateV1_1Schema = z.object({
  // Required metadata
  schema: z.literal("v1.1"),
  sequence: z.number().optional(),
  epoch: z.string().optional(),
  instance_id: z.string().optional(),
  timestamp: z.string().optional(),
  is_full_sync: z.boolean().optional(),

  // Instance info (alternative to instance_id)
  instance: z.object({
    tag: z.string(),
  }).optional(),

  // Optional data 
  agent: agentSchema.optional(),
  status: statusSchema.optional(),
  health: healthSchema.optional(),
  resources: resourcesSchema.optional(),
  workloads: workloadsSchema.optional(),
  proxy: proxySchema.optional(),
  processes: processesSchema.optional(),
  filesystem: filesystemSchema.optional(),
  diagnostics: diagnosticsSchema.optional(),
});

export type InstanceStreamUpdateV1_1 = z.infer<typeof instanceStreamUpdateV1_1Schema>;

/**
 * Parse and validate a v1.1 instance stream update
 */
export function parseV1_1(data: unknown): InstanceStreamUpdateV1_1 {
  return instanceStreamUpdateV1_1Schema.parse(data);
}

/**
 * Safely parse a v1.1 instance stream update (returns null on failure)
 */
export function safeParseV1_1(data: unknown): InstanceStreamUpdateV1_1 | null {
  const result = instanceStreamUpdateV1_1Schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Check if data matches v1.1 schema
 */
export function isV1_1(data: unknown): data is InstanceStreamUpdateV1_1 {
  if (!data || typeof data !== "object") return false;
  const result = instanceStreamUpdateV1_1Schema.safeParse(data);
  return result.success;
}