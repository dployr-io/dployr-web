// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

/**
 * Re-export all normalized entity schemas and types
 */

export {
  normalizedAgentSchema,
  defaultAgent,
  type NormalizedAgent,
} from "./agent";

export {
  normalizedStatusSchema,
  defaultStatus,
  type NormalizedStatus,
} from "./status";

export {
  normalizedHealthSchema,
  defaultHealth,
  type NormalizedHealth,
} from "./health";

export {
  normalizedLoadAverageSchema,
  normalizedCpuSchema,
  normalizedMemorySchema,
  normalizedSwapSchema,
  normalizedDiskSchema,
  normalizedResourcesSchema,
  defaultResources,
  type NormalizedLoadAverage,
  type NormalizedCpu,
  type NormalizedMemory,
  type NormalizedSwap,
  type NormalizedDisk,
  type NormalizedResources,
} from "./resources";

export {
  normalizedRuntimeSchema,
  normalizedRemoteSchema,
  normalizedServiceSchema,
  normalizedDeploymentSchema,
  normalizedWorkloadsSchema,
  defaultWorkloads,
  type NormalizedRuntime,
  type NormalizedRemote,
  type NormalizedService,
  type NormalizedDeployment,
  type NormalizedWorkloads,
} from "./workloads";

export {
  normalizedProxyRouteSchema,
  normalizedProxySchema,
  defaultProxy,
  type NormalizedProxyRoute,
  type NormalizedProxy,
} from "./proxy";

export {
  normalizedProcessSummarySchema,
  normalizedProcessSchema,
  normalizedProcessesSchema,
  defaultProcesses,
  type NormalizedProcessSummary,
  type NormalizedProcess,
  type NormalizedProcesses,
} from "./processes";

export {
  normalizedFsPermissionsSchema,
  normalizedFsNodeSchema,
  normalizedFilesystemSchema,
  defaultFilesystem,
  type NormalizedFsPermissions,
  type NormalizedFsNode,
  type NormalizedFilesystem,
} from "./filesystem";

export {
  normalizedCertDiagnosticsSchema,
  normalizedDiagnosticsSchema,
  defaultDiagnostics,
  type NormalizedCertDiagnostics,
  type NormalizedDiagnostics,
} from "./diagnostics";
