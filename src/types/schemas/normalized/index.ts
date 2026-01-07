// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

/**
 * Normalized Schema Module
 *
 * Stable internal representation for UI components.
 * Both v1 and v1.1 data is normalized to this format.
 */

// Export the main schema and helpers
export {
  schemaVersionSchema,
  normalizedInstanceDataSchema,
  createDefaultNormalizedData,
  type SchemaVersion,
  type NormalizedInstanceData,
} from "./schema";

// Re-export all entity schemas and types
export * from "./entities";
