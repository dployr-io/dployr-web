// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { InstanceStreamUpdateV1 } from "../v1";
import type {
  NormalizedInstanceData,
  NormalizedAgent,
  NormalizedStatus,
  NormalizedHealth,
  NormalizedResources,
  NormalizedWorkloads,
  NormalizedProxy,
  NormalizedProcesses,
  NormalizedFilesystem,
  NormalizedDiagnostics,
  NormalizedFsNode,
  SchemaVersion,
} from "../normalized";
import {
  defaultAgent,
  defaultHealth,
  defaultProcesses,
  defaultDiagnostics,
} from "../normalized";
import type { FsNode } from "../v1/entities";

// MB to bytes conversion factor
const MB_TO_BYTES = 1024 * 1024;

/**
 * Normalize agent from v1 format (build_info + platform)
 */
function normalizeAgent(update: InstanceStreamUpdateV1): NormalizedAgent {
  const buildInfo = update.build_info;
  const platform = update.platform;
  if (!buildInfo) return { ...defaultAgent };
  return {
    version: buildInfo.version,
    commit: buildInfo.commit,
    buildDate: buildInfo.date,
    goVersion: buildInfo.go_version,
    os: platform?.os || "-",
    arch: platform?.arch || "-",
  };
}

/**
 * Normalize status from v1 format
 */
function normalizeStatus(update: InstanceStreamUpdateV1): NormalizedStatus {
  const status = update.status;
  return {
    state: status ? "running" : "-",
    mode: "-",
    uptimeSeconds: parseInt(update.uptime || "0") || 0,
  };
}

/**
 * Normalize health from v1 format
 */
function normalizeHealth(health: InstanceStreamUpdateV1["health"]): NormalizedHealth {
  if (!health) return { ...defaultHealth };
  return {
    overall: health.overall,
    websocket: health.ws || "-",
    tasks: health.tasks || "-",
    proxy: "-", // v1 doesn't have proxy health
    auth: health.auth || "-",
  };
}

/**
 * Normalize resources from v1 format
 */
function normalizeResources(update: InstanceStreamUpdateV1): NormalizedResources {
  const debug = update.debug;
  const system = debug?.system;
  const top = update.top;

  return {
    cpu:
      system || top?.cpu
        ? {
            count: system?.cpu_count || 0,
            userPercent: top?.cpu?.user || 0,
            systemPercent: top?.cpu?.system || 0,
            idlePercent: top?.cpu?.idle || 0,
            iowaitPercent: top?.cpu?.wait || 0,
            loadAverage: top?.header?.load_avg
              ? {
                  oneMinute: top.header.load_avg.one,
                  fiveMinute: top.header.load_avg.five,
                  fifteenMinute: top.header.load_avg.fifteen,
                }
              : undefined,
          }
        : null,
    memory: system
      ? {
          totalBytes: system.mem_total_bytes || 0,
          usedBytes: system.mem_used_bytes || 0,
          freeBytes: system.mem_free_bytes || 0,
          availableBytes:
            (system.mem_free_bytes || 0) + (top?.memory?.buffer_cache || 0) * MB_TO_BYTES,
          bufferCacheBytes: (top?.memory?.buffer_cache || 0) * MB_TO_BYTES,
        }
      : null,
    swap: top?.swap
      ? {
          totalBytes: (top.swap.total || 0) * MB_TO_BYTES,
          usedBytes: (top.swap.used || 0) * MB_TO_BYTES,
          freeBytes: (top.swap.free || 0) * MB_TO_BYTES,
          availableBytes: (top.swap.available || 0) * MB_TO_BYTES,
        }
      : null,
    disks: (system?.disks || []).map((d) => ({
      filesystem: d.filesystem,
      mountPoint: d.mountpoint,
      totalBytes: d.size_bytes,
      usedBytes: d.used_bytes ?? 0,
      availableBytes: d.available_bytes,
    })),
  };
}

/**
 * Normalize workloads from v1 format
 */
function normalizeWorkloads(update: InstanceStreamUpdateV1): NormalizedWorkloads {
  return {
    services: (update.services || []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || null,
      source: s.source || null,
      runtime: {
        type: s.runtime,
        version: s.runtime_version || null,
      },
      remote:
        s.remote && s.branch
          ? {
              url: s.remote,
              branch: s.branch,
              commitHash: s.commit_hash || null,
            }
          : null,
      runCmd: s.run_cmd || null,
      buildCmd: s.build_cmd || null,
      port: s.port || null,
      workingDir: s.working_dir || null,
      envVars: s.env_vars || null,
      secrets: s.secrets || null,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })),
    deployments: (update.deployments || []).map((d) => ({
      id: d.id,
      userId: d.user_id || null,
      name: d.config.name,
      description: d.config.description || null,
      source: d.config.source,
      runtime: {
        type: d.config.runtime.type,
        version: d.config.runtime.version || null,
      },
      remote: d.config.remote
        ? {
            url: d.config.remote.url,
            branch: d.config.remote.branch,
            commitHash: d.config.remote.commit_hash || null,
          }
        : null,
      runCmd: d.config.run_cmd || null,
      buildCmd: d.config.build_cmd || null,
      port: d.config.port || null,
      workingDir: d.config.working_dir || null,
      envVars: d.config.env_vars || null,
      secrets: d.config.secrets || null,
      status: d.status,
      metadata: d.metadata || null,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    })),
  };
}

/**
 * Normalize proxy from v1 format
 */
function normalizeProxy(update: InstanceStreamUpdateV1): NormalizedProxy | null {
  const proxyStatus = update.proxy?.status;
  const proxyApps = update.proxies;

  if (!proxyStatus && !proxyApps?.length) return null;

  return {
    type: "caddy",
    status: proxyStatus || "-",
    version: null,
    routes: (proxyApps || []).map((r) => ({
      domain: r.domain,
      upstream: r.upstream,
      template: r.template,
      root: r.root || null,
      status: r.status?.status || "unknown",
    })),
  };
}

/**
 * Normalize processes from v1 format
 */
function normalizeProcesses(update: InstanceStreamUpdateV1): NormalizedProcesses {
  const top = update.top;
  if (!top) return { ...defaultProcesses };

  return {
    summary: top.tasks
      ? {
          total: top.tasks.total || 0,
          running: top.tasks.running || 0,
          sleeping: top.tasks.sleeping || 0,
          stopped: top.tasks.stopped || 0,
          zombie: top.tasks.zombie || 0,
        }
      : null,
    list: (top.processes || []).map((p) => ({
      pid: p.pid,
      user: p.user,
      priority: p.priority,
      nice: p.nice,
      virtMem: p.virt_mem,
      resMem: p.res_mem,
      shrMem: p.shr_mem,
      state: p.state,
      cpuPercent: p.cpu_pct,
      memPercent: p.mem_pct,
      time: p.time,
      command: p.command,
    })),
  };
}

/**
 * Normalize filesystem node from v1 format
 */
function normalizeFsNode(node: FsNode): NormalizedFsNode {
  return {
    path: node.path,
    name: node.name,
    type: node.type === "directory" ? "dir" : (node.type as "file" | "dir" | "symlink"),
    sizeBytes: node.size_bytes,
    modifiedAt: node.mod_time || null,
    mode: node.mode || null,
    owner: node.owner || null,
    group: node.group || null,
    uid: node.uid ?? null,
    gid: node.gid ?? null,
    permissions:
      node.readable !== undefined || node.writable !== undefined || node.executable !== undefined
        ? {
            readable: node.readable || false,
            writable: node.writable || false,
            executable: node.executable || false,
          }
        : null,
    children: node.children ? node.children.map(normalizeFsNode) : null,
    truncated: node.truncated || false,
    childCount: node.child_count ?? null,
  };
}

/**
 * Normalize filesystem from v1 format
 */
function normalizeFilesystem(
  filesystem: InstanceStreamUpdateV1["fs"]
): NormalizedFilesystem | null {
  if (!filesystem) return null;
  return {
    generatedAt: filesystem.generated_at,
    roots: filesystem.roots.map(normalizeFsNode),
  };
}

/**
 * Normalize diagnostics from v1 format
 */
function normalizeDiagnostics(update: InstanceStreamUpdateV1): NormalizedDiagnostics {
  const debug = update.debug;
  if (!debug) return { ...defaultDiagnostics };

  return {
    bootstrapTokenPreview: debug.auth?.bootstrap_token || null,
    workers: debug.system?.workers || 0,
    activeJobs: 0, // v1 doesn't track active jobs
    cert: null, // v1 cert info would need to be extracted differently if available
  };
}

/**
 * Normalize v1 instance stream update to normalized format
 */
export function normalizeFromV1(update: InstanceStreamUpdateV1): NormalizedInstanceData {
  return {
    schema: "v1" as SchemaVersion,
    instance: {
      tag: update.instance_id,
    },
    agent: normalizeAgent(update),
    status: normalizeStatus(update),
    health: normalizeHealth(update.health),
    resources: normalizeResources(update),
    workloads: normalizeWorkloads(update),
    proxy: normalizeProxy(update),
    processes: normalizeProcesses(update),
    filesystem: normalizeFilesystem(update.fs),
    diagnostics: normalizeDiagnostics(update),
  };
}