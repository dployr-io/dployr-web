// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

/**
 * V1 Schema Module
 *
 * Legacy schema format for backward compatibility.
 * Key differences from v1.1:
 * - Uses 'build_info' instead of 'agent'
 * - Uses 'debug' instead of 'diagnostics'
 * - Uses 'top' instead of 'resources' + 'processes'
 * - Uses 'proxy_status' + 'proxy_apps' instead of 'proxy'
 * - Memory values in MB instead of bytes
 * - Health uses 'ws' instead of 'websocket'
 * - Deployments have nested 'config' object
 * - Filesystem nodes use inline permissions
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
