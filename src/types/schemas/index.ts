// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

/**
 * Schema Registry
 *
 * Unified entry point for all schema versions and normalization.
 *
 * Architecture:
 * - Each schema version has its own folder (v1, v1.1, etc.)
 * - Each folder contains entity schemas in an 'entities' subfolder
 * - Normalized schema is the stable internal representation
 * - Normalizers convert from versioned to normalized format
 *
 * To add a new schema version:
 * 1. Create a new folder (e.g., src/types/schemas/v2/)
 * 2. Add entity schemas in entities/ subfolder
 * 3. Create schema.ts with the main update schema
 * 4. Create index.ts re-exporting everything
 * 5. Add a normalizer in normalizers/from-v2.ts
 * 6. Update this file to detect and handle the new version
 */

import { isV1, type InstanceStreamUpdateV1 } from "./v1";
import { isV1_1, type InstanceStreamUpdateV1_1 } from "./v1.1";
import type { NormalizedInstanceData, SchemaVersion } from "./normalized";
import { normalizeFromV1 } from "./normalizers/from-v1";
import { normalizeFromV1_1 } from "./normalizers/from-v1.1";

// Re-export schema modules
export * as v1 from "./v1";
export * as v1_1 from "./v1.1";
export * as normalized from "./normalized";
export * from "./normalizers";

// Re-export commonly used types from normalized
export type {
  NormalizedInstanceData,
  NormalizedAgent,
  NormalizedStatus,
  NormalizedHealth,
  NormalizedResources,
  NormalizedCpu,
  NormalizedMemory,
  NormalizedSwap,
  NormalizedDisk,
  NormalizedLoadAverage,
  NormalizedWorkloads,
  NormalizedService,
  NormalizedDeployment,
  NormalizedRuntime,
  NormalizedRemote,
  NormalizedProxy,
  NormalizedProxyRoute,
  NormalizedProcesses,
  NormalizedProcess,
  NormalizedProcessSummary,
  NormalizedFilesystem,
  NormalizedFsNode,
  NormalizedFsPermissions,
  NormalizedDiagnostics,
  NormalizedCertDiagnostics,
  SchemaVersion,
} from "./normalized";

// Re-export defaults
export {
  createDefaultNormalizedData,
  defaultAgent,
  defaultStatus,
  defaultHealth,
  defaultResources,
  defaultWorkloads,
  defaultProxy,
  defaultProcesses,
  defaultFilesystem,
  defaultDiagnostics,
} from "./normalized";

/**
 * Union type of all supported schema versions
 */
export type InstanceStreamUpdate = InstanceStreamUpdateV1 | InstanceStreamUpdateV1_1;

/**
 * Detect the schema version of an update
 */
export function detectSchemaVersion(data: unknown): SchemaVersion | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // v1.1 has explicit schema field
  if (obj.schema === "v1.1") return "v1.1";

  // v1 has optional schema field or no schema field with v1 structure
  if (obj.schema === "v1") return "v1";

  // Detect v1 by structure: has build_info or debug (v1 specific fields)
  if ("build_info" in obj || "debug" in obj || "top" in obj) return "v1";

  // Detect v1.1 by structure: has agent or status object (v1.1 specific)
  if ("agent" in obj || "status" in obj) return "v1.1";

  return null;
}

/**
 * Parse and normalize instance stream update data
 * Automatically detects schema version and normalizes to internal format
 *
 * @returns Normalized data or null if parsing fails
 */
export function parseAndNormalize(data: unknown): NormalizedInstanceData | null {
  if (!data) return null;

  const version = detectSchemaVersion(data);

  switch (version) {
    case "v1.1":
      if (isV1_1(data)) {
        return normalizeFromV1_1(data);
      }
      break;

    case "v1":
      if (isV1(data)) {
        return normalizeFromV1(data);
      }
      break;
  }

  return null;
}

/**
 * Type guard to check if data is any supported instance stream update
 */
export function isInstanceStreamUpdate(data: unknown): data is InstanceStreamUpdate {
  return detectSchemaVersion(data) !== null;
}
