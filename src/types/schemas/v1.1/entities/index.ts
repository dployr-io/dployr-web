// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

/**
 * Re-export all v1.1 entity schemas and types
 */

export { agentSchema, type Agent } from "./agent";
export { statusSchema, type Status } from "./status";
export { healthSchema, healthStatusValue, type Health, type HealthStatus } from "./health";
export {
  resourcesSchema,
  cpuSchema,
  memorySchema,
  swapSchema,
  diskSchema,
  loadAverageSchema,
  type Resources,
  type Cpu,
  type Memory,
  type Swap,
  type Disk,
  type LoadAverage,
} from "./resources";
export {
  workloadsSchema,
  deploymentSchema,
  serviceSchema,
  runtimeSchema,
  remoteSchema,
  type Workloads,
  type Deployment,
  type Service,
  type Runtime,
  type Remote,
  type DeploymentConfig,
  type Blueprint,
} from "./workload";
export { proxySchema, proxyRouteSchema, type Proxy, type ProxyRoute } from "./proxy";
export {
  processesSchema,
  processSchema,
  processSummarySchema,
  type Processes,
  type Process,
  type ProcessSummary,
} from "./process";
export {
  filesystemSchema,
  fsNodeSchema,
  fsPermissionsSchema,
  type Filesystem,
  type FsNode,
  type FsPermissions,
} from "./filesystem";
export {
  diagnosticsSchema,
  websocketDiagnosticsSchema,
  tasksDiagnosticsSchema,
  authDiagnosticsSchema,
  workerDiagnosticsSchema,
  certDiagnosticsSchema,
  type Diagnostics,
  type WebsocketDiagnostics,
  type TasksDiagnostics,
  type AuthDiagnostics,
  type WorkerDiagnostics,
  type CertDiagnostics,
} from "./diagnostics";