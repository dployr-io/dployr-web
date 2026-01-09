// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

/**
 * v1.1 Instance Stream Schema
 */

// Re-export main schema and types
export {
  instanceStreamUpdateV1_1Schema,
  parseV1_1,
  safeParseV1_1,
  isV1_1,
  type InstanceStreamUpdateV1_1,
} from "./schema";

// Re-export all entity schemas and types for granular access
export * from "./entities";