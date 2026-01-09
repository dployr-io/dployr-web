// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

/**
 * Re-export all v1 entity schemas and types
 */

export { buildInfoSchema, platformSchema, type BuildInfo, type Platform } from "./build-info";
export { healthSchema, healthStatusValue, type Health, type HealthStatus } from "./health";
export {
  debugSchema,
  systemDebugSchema,
  wsDebugSchema,
  tasksDebugSchema,
  authDebugSchema,
  diskInfoSchema,
  type Debug,
  type SystemDebug,
  type WsDebug,
  type TasksDebug,
  type AuthDebug,
  type DiskInfo,
} from "./debug";
export {
  topSchema,
  topHeaderSchema,
  cpuMetricsSchema,
  memoryMetricsSchema,
  swapMetricsSchema,
  tasksSummarySchema,
  processV1Schema,
  loadAvgSchema,
  type Top,
  type TopHeader,
  type CpuMetrics,
  type MemoryMetrics,
  type SwapMetrics,
  type TasksSummary,
  type ProcessV1,
  type LoadAvg,
} from "./top";
export {
  deploymentSchema,
  deploymentConfigSchema,
  serviceSchema,
  blueprintSchema,
  runtimeSchema,
  remoteSchema,
  type Deployment,
  type DeploymentConfig,
  type Service,
  type Blueprint,
  type Runtime,
  type Remote,
} from "./workloads";
export {
  proxyStatusSchema,
  proxyAppSchema,
  proxyAppStatusSchema,
  type ProxyStatus,
  type ProxyApp,
  type ProxyAppStatus,
} from "./proxy";
export { fsSnapshotSchema, fsNodeSchema, type FsSnapshot, type FsNode } from "./filesystem";