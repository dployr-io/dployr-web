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

import { isV1, type InstanceStreamUpdateV1 } from "./v1/";
import { isV1_1, type InstanceStreamUpdateV1_1 } from "./v1.1/";
import type { NormalizedInstanceData, SchemaVersion, NormalizedFsNode } from "./normalized/";
import { normalizeFromV1 } from "./normalizers/from-v1";
import { normalizeFromV1_1 } from "./normalizers/from-v1.1";

// Re-export schema modules
export * as v1 from "./v1/";
export * as v1_1 from "./v1.1/";
export * as normalized from "./normalized/";
export * from "./normalizers/";

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
} from "./normalized/";

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
} from "./normalized/";

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

  return null;
}

/**
 * Parse and normalize instance stream update data
 * Automatically detects schema version and normalizes to internal format
 *
 * @returns Normalized data or null if parsing fails
 */
export function parseAndNormalize(data: unknown): NormalizedInstanceData | null {
  if (!data) {
    return null;
  }

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
 * Denormalize normalized instance data back to raw schema format
 * 
 * @param data - Normalized instance data
 * @param targetVersion - Target schema version ("v1" or "v1.1")
 * @returns Raw schema data in the specified version format
 */
export function denormalize(data: NormalizedInstanceData | null | undefined, targetVersion: SchemaVersion): InstanceStreamUpdate | null {
  if (!data) return null;

  switch (targetVersion) {
    case "v1.1":
      return denormalizeToV1_1(data);
    case "v1":
      return denormalizeToV1(data);
    default:
      return null;
  }
}

/**
 * Denormalize to v1.1 format
 */
function denormalizeToV1_1(data: NormalizedInstanceData | null): InstanceStreamUpdateV1_1 | null {
  if (!data) return null;

  return {
    schema: "v1.1",
    sequence: 0, 
    epoch: "", 
    instance_id: data.instance.tag, 
    timestamp: new Date().toISOString(),
    is_full_sync: true,
    agent: data.agent ? {
      version: data.agent.version,
      commit: data.agent.commit,
      build_date: data.agent.buildDate,
      go_version: data.agent.goVersion,
      os: data.agent.os,
      arch: data.agent.arch,
    } : undefined,
    status: data.status ? {
      state: data.status.state,
      mode: data.status.mode,
      uptime_seconds: data.status.uptimeSeconds,
    } : undefined,
    health: data.health ? {
      overall: data.health.overall,
      websocket: data.health.websocket === "-" ? undefined : data.health.websocket,
      tasks: data.health.tasks === "-" ? undefined : data.health.tasks,
      proxy: data.health.proxy === "-" ? undefined : data.health.proxy,
      auth: data.health.auth === "-" ? undefined : data.health.auth,
    } : undefined,
    resources: data.resources ? {
      cpu: data.resources.cpu ? {
        count: data.resources.cpu.count,
        user_percent: data.resources.cpu.userPercent,
        system_percent: data.resources.cpu.systemPercent,
        idle_percent: data.resources.cpu.idlePercent,
        iowait_percent: data.resources.cpu.iowaitPercent,
        load_average: data.resources.cpu.loadAverage ? {
          one_minute: data.resources.cpu.loadAverage.oneMinute,
          five_minute: data.resources.cpu.loadAverage.fiveMinute,
          fifteen_minute: data.resources.cpu.loadAverage.fifteenMinute,
        } : undefined,
      } : undefined,
      memory: data.resources.memory ? {
        total_bytes: data.resources.memory.totalBytes,
        used_bytes: data.resources.memory.usedBytes,
        free_bytes: data.resources.memory.freeBytes,
        available_bytes: data.resources.memory.availableBytes,
        buffer_cache_bytes: data.resources.memory.bufferCacheBytes,
      } : undefined,
      swap: data.resources.swap ? {
        total_bytes: data.resources.swap.totalBytes,
        used_bytes: data.resources.swap.usedBytes,
        free_bytes: data.resources.swap.freeBytes,
        available_bytes: data.resources.swap.availableBytes,
      } : undefined,
      disks: data.resources.disks?.map(d => ({
        filesystem: d.filesystem,
        mount_point: d.mountPoint,
        total_bytes: d.totalBytes,
        used_bytes: d.usedBytes,
        available_bytes: d.availableBytes,
      })) || [],
    } : undefined,
    workloads: data.workloads ? {
      services: data.workloads.services?.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || undefined,
        source: s.source || "remote",
        runtime: s.runtime.type,
        runtime_version: s.runtime.version || undefined,
        remote: s.remote?.url || undefined,
        branch: s.remote?.branch || undefined,
        commit_hash: s.remote?.commitHash || undefined,
        run_cmd: s.runCmd || undefined,
        build_cmd: s.buildCmd || undefined,
        port: s.port || undefined,
        working_dir: s.workingDir || undefined,
        env_vars: s.envVars || undefined,
        secrets: s.secrets || undefined,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      })) || [],
      deployments: data.workloads.deployments?.map(d => ({
        id: d.id,
        user_id: d.userId || undefined,
        name: d.name,
        description: d.description || undefined,
        source: d.source,
        runtime: {
          type: d.runtime.type,
          version: d.runtime.version || undefined,
        },
        remote: d.remote ? {
          url: d.remote.url,
          branch: d.remote.branch,
          commit_hash: d.remote.commitHash || undefined,
        } : undefined,
        run_command: d.runCmd || undefined,
        build_command: d.buildCmd || undefined,
        port: d.port || undefined,
        working_dir: d.workingDir || undefined,
        env_vars: d.envVars || undefined,
        status: d.status,
        metadata: d.metadata || undefined,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
      })) || [],
    } : undefined,
    proxy: data.proxy ? {
      type: data.proxy.type,
      status: data.proxy.status,
      version: data.proxy.version || undefined,
      routes: data.proxy.routes?.map(r => ({
        domain: r.domain,
        upstream: r.upstream,
        template: r.template,
        root: r.root || undefined,
        status: r.status,
      })) || [],
    } : undefined,
    processes: data.processes ? {
      summary: data.processes.summary ? {
        total: data.processes.summary.total,
        running: data.processes.summary.running,
        sleeping: data.processes.summary.sleeping,
        stopped: data.processes.summary.stopped,
        zombie: data.processes.summary.zombie,
      } : undefined,
      list: data.processes.list?.map(p => ({
        pid: p.pid,
        user: p.user,
        priority: p.priority,
        nice: p.nice,
        virtual_memory_bytes: p.virtMem,
        resident_memory_bytes: p.resMem,
        shared_memory_bytes: p.shrMem,
        state: p.state,
        cpu_percent: p.cpuPercent,
        memory_percent: p.memPercent,
        cpu_time: p.time,
        command: p.command,
      })) || [],
    } : undefined,
    filesystem: data.filesystem ? {
      generated_at: data.filesystem.generatedAt,
      roots: data.filesystem.roots.map(denormalizeFsNode),
    } : undefined,
    diagnostics: data.diagnostics ? {
      websocket: {
        is_connected: true,
        reconnect_count: 0,
        last_connected_at: undefined,
        last_error: undefined,
      },
      tasks: {
        inflight_count: 0,
        unsent_count: 0,
        last_task_id: undefined,
        last_task_status: undefined,
        last_task_duration_ms: undefined,
        last_task_at: undefined,
      },
      auth: data.diagnostics.bootstrapTokenPreview ? {
        token_age_seconds: 0,
        token_expires_in_seconds: 0,
        bootstrap_token_preview: data.diagnostics.bootstrapTokenPreview,
      } : undefined,
      worker: {
        max_concurrent: data.diagnostics.workers,
        active_jobs: data.diagnostics.activeJobs,
      },
      cert: data.diagnostics.cert ? {
        not_after: data.diagnostics.cert.notAfter,
        days_remaining: data.diagnostics.cert.daysRemaining,
      } : undefined,
    } : undefined,
  };
}

/**
 * Denormalize to v1 format
 */
function denormalizeToV1(data: NormalizedInstanceData): InstanceStreamUpdateV1 {
  return {
    schema: "v1",
    seq: 0, // This would need to be provided separately
    epoch: "", // This would need to be provided separately
    full: true,
    instance_id: data.instance.tag,
    uptime: "",
    build_info: data.agent ? {
      version: data.agent.version,
      commit: data.agent.commit,
      date: data.agent.buildDate,
      go_version: data.agent.goVersion,
    } : undefined,
    platform: data.agent ? {
      os: data.agent.os,
      arch: data.agent.arch,
    } : undefined,
    status: data.health?.overall as "healthy" | "degraded" | "unhealthy" | undefined,
    mode: data.status?.mode as "ready" | "updating" | undefined,
    health: data.health ? {
      overall: data.health.overall,
      ws: data.health.websocket === "-" ? undefined : data.health.websocket,
      tasks: data.health.tasks === "-" ? undefined : data.health.tasks,
      auth: data.health.auth === "-" ? undefined : data.health.auth,
    } : undefined,
    services: data.workloads?.services?.map(s => ({
      id: s.id,
      name: s.name,
      source: s.source || "remote",
      runtime: s.runtime.type,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      description: s.description || undefined,
      runtime_version: s.runtime.version || undefined,
      remote: s.remote?.url || undefined,
      branch: s.remote?.branch || undefined,
      commit_hash: s.remote?.commitHash || undefined,
      run_cmd: s.runCmd || undefined,
      build_cmd: s.buildCmd || undefined,
      port: s.port || undefined,
      working_dir: s.workingDir || undefined,
      env_vars: s.envVars || undefined,
      secrets: s.secrets || undefined,
    })) || [],
    deployments: data.workloads?.deployments?.map(d => ({
      id: d.id,
      user_id: d.userId || undefined,
      config: {
        name: d.name,
        description: d.description || undefined,
        source: d.source,
        runtime: {
          type: d.runtime.type,
          version: d.runtime.version || undefined,
        },
        remote: d.remote ? {
          url: d.remote.url,
          branch: d.remote.branch,
          commit_hash: d.remote.commitHash || undefined,
        } : undefined,
        run_cmd: d.runCmd || undefined,
        build_cmd: d.buildCmd || undefined,
        port: d.port || undefined,
        working_dir: d.workingDir || undefined,
        env_vars: d.envVars || undefined,
        secrets: d.secrets || undefined,
      },
      status: d.status,
      metadata: d.metadata || undefined,
      created_at: d.createdAt,
      updated_at: d.updatedAt,
    })) || [],
    proxy: data.proxy ? {
      status: data.proxy.status,
      routes: data.proxy.routes?.length || 0,
    } : undefined,
    proxies: data.proxy?.routes?.map(r => ({
      domain: r.domain,
      upstream: r.upstream,
      template: r.template,
      root: r.root || undefined,
      status: {
        status: r.status,
        message: undefined,
      },
    })) || [],
    top: data.processes ? {
      header: {
        time: undefined,
        uptime: undefined,
        users: undefined,
        load_avg: data.resources?.cpu?.loadAverage ? {
          one: data.resources.cpu.loadAverage.oneMinute,
          five: data.resources.cpu.loadAverage.fiveMinute,
          fifteen: data.resources.cpu.loadAverage.fifteenMinute,
        } : undefined,
      },
      tasks: data.processes.summary ? {
        total: data.processes.summary.total,
        running: data.processes.summary.running,
        sleeping: data.processes.summary.sleeping,
        stopped: data.processes.summary.stopped,
        zombie: data.processes.summary.zombie,
      } : undefined,
      cpu: data.resources?.cpu ? {
        user: data.resources.cpu.userPercent,
        system: data.resources.cpu.systemPercent,
        idle: data.resources.cpu.idlePercent,
        nice: 0,
        wait: data.resources.cpu.iowaitPercent,
        hi: 0,
        si: 0,
        st: 0,
      } : undefined,
      memory: data.resources?.memory ? {
        total: data.resources.memory.totalBytes,
        free: data.resources.memory.freeBytes,
        used: data.resources.memory.usedBytes,
        buffer_cache: data.resources.memory.bufferCacheBytes,
      } : undefined,
      swap: data.resources?.swap ? {
        total: data.resources.swap.totalBytes,
        free: data.resources.swap.freeBytes,
        used: data.resources.swap.usedBytes,
      } : undefined,
      processes: data.processes.list?.map(p => ({
        pid: p.pid,
        user: p.user,
        priority: p.priority,
        nice: p.nice,
        virt_mem: p.virtMem,
        res_mem: p.resMem,
        shr_mem: p.shrMem,
        state: p.state,
        cpu_pct: p.cpuPercent,
        mem_pct: p.memPercent,
        time: p.time,
        command: p.command,
      })) || [],
    } : undefined,
    fs: data.filesystem ? {
      generated_at: data.filesystem.generatedAt,
      roots: data.filesystem.roots.map(denormalizeFsNodeV1),
    } : undefined,
    debug: data.diagnostics ? {
      ws: {
        connected: true,
        reconnects_since_start: 0,
        last_connect_at: undefined,
      },
      tasks: {
        inflight: 0,
        done_unsent: 0,
      },
      auth: data.diagnostics.bootstrapTokenPreview ? {
        agent_token_age_s: 0,
        agent_token_expires_in_s: 0,
        bootstrap_token: data.diagnostics.bootstrapTokenPreview,
      } : undefined,
      system: {
        cpu_count: data.resources?.cpu?.count || 0,
        mem_total_bytes: data.resources?.memory?.totalBytes || 0,
        mem_used_bytes: data.resources?.memory?.usedBytes || 0,
        mem_free_bytes: data.resources?.memory?.freeBytes || 0,
        disks: data.resources?.disks?.map(d => ({
          filesystem: d.filesystem,
          mountpoint: d.mountPoint,
          size_bytes: d.totalBytes,
          available_bytes: d.availableBytes,
          used_bytes: d.usedBytes,
        })) || [],
        workers: data.diagnostics.workers,
      },
    } : undefined,
  };
}

/**
 * Denormalize filesystem node to v1.1 format
 */
function denormalizeFsNode(node: NormalizedFsNode): any {
  return {
    path: node.path,
    name: node.name,
    type: node.type === "dir" ? "directory" : node.type,
    size_bytes: node.sizeBytes,
    modified_at: node.modifiedAt || undefined,
    permissions: node.permissions ? {
      mode: node.mode || "",
      owner: node.owner || "",
      group: node.group || "",
      uid: node.uid || 0,
      gid: node.gid || 0,
      readable: node.permissions.readable,
      writable: node.permissions.writable,
      executable: node.permissions.executable,
    } : undefined,
    children: node.children ? node.children.map(denormalizeFsNode) : undefined,
    is_truncated: node.truncated || undefined,
    total_children: node.childCount || undefined,
  };
}

/**
 * Denormalize filesystem node to v1 format
 */
function denormalizeFsNodeV1(node: NormalizedFsNode): any {
  return {
    path: node.path,
    name: node.name,
    type: node.type === "dir" ? "directory" : node.type,
    size_bytes: node.sizeBytes,
    mod_time: node.modifiedAt || undefined,
    mode: node.mode || undefined,
    owner: node.owner || undefined,
    group: node.group || undefined,
    uid: node.uid || undefined,
    gid: node.gid || undefined,
    readable: node.permissions?.readable || undefined,
    writable: node.permissions?.writable || undefined,
    executable: node.permissions?.executable || undefined,
    children: node.children ? node.children.map(denormalizeFsNodeV1) : undefined,
    truncated: node.truncated || undefined,
    child_count: node.childCount || undefined,
  };
}

/**
 * Type guard to check if data is any supported instance stream update
 */
export function isInstanceStreamUpdate(data: unknown): data is InstanceStreamUpdate {
  return detectSchemaVersion(data) !== null;
}
