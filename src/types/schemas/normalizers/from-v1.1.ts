// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { InstanceStreamUpdateV1_1 } from "../v1.1";
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
} from "../normalized";
import {
  defaultAgent,
  defaultStatus,
  defaultHealth,
  defaultResources,
  defaultWorkloads,
  defaultProcesses,
  defaultDiagnostics,
} from "../normalized";
import type { FsNode } from "../v1.1/entities/filesystem";

/**
 * Normalize agent from v1.1 format
 */
function normalizeAgent(agent: InstanceStreamUpdateV1_1["agent"]): NormalizedAgent {
  if (!agent) return { ...defaultAgent };
  return {
    version: agent.version,
    commit: agent.commit,
    buildDate: agent.build_date,
    goVersion: agent.go_version,
    os: agent.os,
    arch: agent.arch,
  };
}

/**
 * Normalize status from v1.1 format
 */
function normalizeStatus(status: InstanceStreamUpdateV1_1["status"]): NormalizedStatus {
  if (!status) return { ...defaultStatus };
  return {
    state: status.state,
    mode: status.mode,
    uptimeSeconds: status.uptime_seconds,
  };
}

/**
 * Normalize health from v1.1 format
 */
function normalizeHealth(health: InstanceStreamUpdateV1_1["health"]): NormalizedHealth {
  if (!health) return { ...defaultHealth };
  return {
    overall: health.overall,
    websocket: health.websocket || "-",
    tasks: health.tasks || "-",
    proxy: health.proxy || "-",
    auth: health.auth || "-",
  };
}

/**
 * Normalize resources from v1.1 format
 */
function normalizeResources(resources: InstanceStreamUpdateV1_1["resources"]): NormalizedResources {
  if (!resources) return { ...defaultResources };
  return {
    cpu: resources.cpu
      ? {
          count: resources.cpu.count,
          userPercent: resources.cpu.user_percent,
          systemPercent: resources.cpu.system_percent,
          idlePercent: resources.cpu.idle_percent,
          iowaitPercent: resources.cpu.iowait_percent,
          loadAverage: resources.cpu.load_average
            ? {
                oneMinute: resources.cpu.load_average.one_minute,
                fiveMinute: resources.cpu.load_average.five_minute,
                fifteenMinute: resources.cpu.load_average.fifteen_minute,
              }
            : undefined,
        }
      : null,
    memory: resources.memory
      ? {
          totalBytes: resources.memory.total_bytes,
          usedBytes: resources.memory.used_bytes,
          freeBytes: resources.memory.free_bytes,
          availableBytes: resources.memory.available_bytes,
          bufferCacheBytes: resources.memory.buffer_cache_bytes,
        }
      : null,
    swap: resources.swap
      ? {
          totalBytes: resources.swap.total_bytes,
          usedBytes: resources.swap.used_bytes,
          freeBytes: resources.swap.free_bytes,
          availableBytes: resources.swap.available_bytes,
        }
      : null,
    disks: (resources.disks || []).map((d) => ({
      filesystem: d.filesystem,
      mountPoint: d.mount_point,
      totalBytes: d.total_bytes,
      usedBytes: d.used_bytes,
      availableBytes: d.available_bytes,
    })),
  };
}

/**
 * Normalize workloads from v1.1 format
 */
function normalizeWorkloads(workloads: InstanceStreamUpdateV1_1["workloads"]): NormalizedWorkloads {
  if (!workloads) return { ...defaultWorkloads };
  return {
    services: (workloads.services || []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || null,
      source: s.source || null,
      runtime: {
        type: s.runtime.type,
        version: s.runtime.version || null,
      },
      remote: s.remote
        ? {
            url: s.remote.url,
            branch: s.remote.branch,
            commitHash: s.remote.commit_hash || null,
          }
        : null,
      runCmd: s.run_cmd || null,
      buildCmd: s.build_cmd || null,
      port: s.port || null,
      workingDir: s.working_dir || null,
      envVars: s.env_vars || null,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })),
    deployments: (workloads.deployments || []).map((d) => ({
      id: d.id,
      userId: d.user_id || null,
      name: d.name,
      description: d.description || null,
      source: d.source,
      runtime: {
        type: d.runtime.type,
        version: d.runtime.version || null,
      },
      remote: d.remote
        ? {
            url: d.remote.url,
            branch: d.remote.branch,
            commitHash: d.remote.commit_hash || null,
          }
        : null,
      runCmd: d.run_cmd || null,
      buildCmd: d.build_cmd || null,
      port: d.port || null,
      workingDir: d.working_dir || null,
      envVars: d.env_vars || null,
      status: d.status,
      metadata: d.metadata || null,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    })),
  };
}

/**
 * Normalize proxy from v1.1 format
 */
function normalizeProxy(proxy: InstanceStreamUpdateV1_1["proxy"]): NormalizedProxy | null {
  if (!proxy) return null;
  return {
    type: proxy.type,
    status: proxy.status,
    version: proxy.version || null,
    routeCount: proxy.route_count || 0,
    routes: (proxy.routes || []).map((r) => ({
      domain: r.domain,
      upstream: r.upstream,
      template: r.template,
      root: r.root || null,
      status: r.status,
    })),
  };
}

/**
 * Normalize processes from v1.1 format
 */
function normalizeProcesses(processes: InstanceStreamUpdateV1_1["processes"]): NormalizedProcesses {
  if (!processes) return { ...defaultProcesses };
  return {
    summary: processes.summary
      ? {
          total: processes.summary.total,
          running: processes.summary.running,
          sleeping: processes.summary.sleeping,
          stopped: processes.summary.stopped,
          zombie: processes.summary.zombie,
        }
      : null,
    list: (processes.list || []).map((p) => ({
      pid: p.pid,
      user: p.user,
      priority: p.priority,
      nice: p.nice,
      virtMem: p.virt_mem,
      resMem: p.res_mem,
      shrMem: p.shr_mem,
      state: p.state,
      cpuPercent: p.cpu_percent,
      memPercent: p.mem_percent,
      time: p.time,
      command: p.command,
    })),
  };
}

/**
 * Normalize filesystem node from v1.1 format
 */
function normalizeFsNode(node: FsNode): NormalizedFsNode {
  return {
    path: node.path,
    name: node.name,
    type: node.type === "directory" ? "dir" : node.type,
    sizeBytes: node.size_bytes,
    modifiedAt: node.modified_at || null,
    mode: node.mode || null,
    owner: node.owner || null,
    group: node.group || null,
    uid: node.uid ?? null,
    gid: node.gid ?? null,
    permissions: node.permissions
      ? {
          readable: node.permissions.readable,
          writable: node.permissions.writable,
          executable: node.permissions.executable,
        }
      : null,
    children: node.children ? node.children.map(normalizeFsNode) : null,
    truncated: node.truncated || false,
    childCount: node.child_count ?? null,
  };
}

/**
 * Normalize filesystem from v1.1 format
 */
function normalizeFilesystem(
  filesystem: InstanceStreamUpdateV1_1["filesystem"]
): NormalizedFilesystem | null {
  if (!filesystem) return null;
  return {
    generatedAt: filesystem.generated_at,
    roots: filesystem.roots.map(normalizeFsNode),
  };
}

/**
 * Normalize diagnostics from v1.1 format
 */
function normalizeDiagnostics(
  diagnostics: InstanceStreamUpdateV1_1["diagnostics"]
): NormalizedDiagnostics {
  if (!diagnostics) return { ...defaultDiagnostics };
  return {
    bootstrapTokenPreview: diagnostics.auth?.bootstrap_token_preview || null,
    workers: diagnostics.worker?.max_concurrent || 0,
    activeJobs: diagnostics.worker?.active_jobs || 0,
    cert: diagnostics.cert
      ? {
          notAfter: diagnostics.cert.not_after,
          daysRemaining: diagnostics.cert.days_remaining,
        }
      : null,
  };
}

/**
 * Normalize v1.1 instance stream update to normalized format
 */
export function normalizeFromV1_1(update: InstanceStreamUpdateV1_1): NormalizedInstanceData {
  return {
    schema: "v1.1",
    agent: normalizeAgent(update.agent),
    status: normalizeStatus(update.status),
    health: normalizeHealth(update.health),
    resources: normalizeResources(update.resources),
    workloads: normalizeWorkloads(update.workloads),
    proxy: normalizeProxy(update.proxy),
    processes: normalizeProcesses(update.processes),
    filesystem: normalizeFilesystem(update.filesystem),
    diagnostics: normalizeDiagnostics(update.diagnostics),
  };
}
