// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import {
  normalizedAgentSchema,
  normalizedStatusSchema,
  normalizedHealthSchema,
  normalizedResourcesSchema,
  normalizedWorkloadsSchema,
  normalizedProxySchema,
  normalizedProcessesSchema,
  normalizedFilesystemSchema,
  normalizedDiagnosticsSchema,
  defaultAgent,
  defaultStatus,
  defaultHealth,
  defaultResources,
  defaultWorkloads,
  defaultProxy,
  defaultProcesses,
  defaultFilesystem,
  defaultDiagnostics,
} from "./entities";

/**
 * Schema version enum
 */
export const schemaVersionSchema = z.enum(["v1", "v1.1"]);
export type SchemaVersion = z.infer<typeof schemaVersionSchema>;

/**
 * Normalized instance data schema
 * This is the stable internal representation used by UI components
 */
export const normalizedInstanceDataSchema = z.object({
  schema: schemaVersionSchema,
  agent: normalizedAgentSchema,
  status: normalizedStatusSchema,
  health: normalizedHealthSchema,
  resources: normalizedResourcesSchema,
  workloads: normalizedWorkloadsSchema,
  proxy: normalizedProxySchema.nullable(),
  processes: normalizedProcessesSchema,
  filesystem: normalizedFilesystemSchema.nullable(),
  diagnostics: normalizedDiagnosticsSchema,
});

export type NormalizedInstanceData = z.infer<typeof normalizedInstanceDataSchema>;

/**
 * Create a default normalized instance data object
 */
export function createDefaultNormalizedData(schema: SchemaVersion = "v1.1"): NormalizedInstanceData {
  return {
    schema,
    agent: { ...defaultAgent },
    status: { ...defaultStatus },
    health: { ...defaultHealth },
    resources: { ...defaultResources },
    workloads: { ...defaultWorkloads },
    proxy: defaultProxy,
    processes: { ...defaultProcesses },
    filesystem: defaultFilesystem,
    diagnostics: { ...defaultDiagnostics },
  };
}
