// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

/**
 * V1 Schema Module
 */

// Export the main schema and helpers
export {
  instanceStreamUpdateV1Schema,
  parseV1,
  safeParseV1,
  isV1,
  type InstanceStreamUpdateV1,
} from "./schema";

// Re-export all entity schemas and types
export * from "./entities";