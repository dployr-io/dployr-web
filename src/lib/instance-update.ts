// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type {
  InstanceStreamUpdateV1,
  InstanceStreamUpdateV1_1,
  ProcessV1,
  ProcessV1_1,
} from "@/types";

export type InstanceUpdate = InstanceStreamUpdateV1 | InstanceStreamUpdateV1_1;

export interface NormalizedInstanceData {
  schema: "v1" | "v1.1";
  // Agent
  version: string;
  commit: string;
  buildDate: string;
  goVersion: string;
  os: string;
  arch: string;
  // Status
  state: string;
  mode: string;
  uptimeSeconds: number;
  // Health
  health: {
    overall: string;
    websocket: string;
    tasks: string;
    proxy: string;
    auth: string;
  };
  // Resources
  cpu: {
    count: number;
    userPercent: number;
    systemPercent: number;
    idlePercent: number;
    iowaitPercent: number;
    loadAverage?: {
      oneMinute: number;
      fiveMinute: number;
      fifteenMinute: number;
    };
  } | null;
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    availableBytes: number;
    bufferCacheBytes: number;
  } | null;
  swap: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    availableBytes: number;
  } | null;
  disks: Array<{
    filesystem: string;
    mountPoint: string;
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
  }>;
  // Workloads
  services: Array<Record<string, unknown>>;
  deployments: Array<Record<string, unknown>>;
  // Proxy
  proxy: {
    type: string;
    status: string;
    version: string | null;
    routeCount: number;
    routes: Array<{
      domain: string;
      upstream: string;
      template: string;
      root: string | null;
      status: string;
    }>;
  } | null;
  // Processes
  processes: (ProcessV1 | ProcessV1_1)[];
  processSummary: {
    total: number;
    running: number;
    sleeping: number;
    stopped: number;
    zombie: number;
  } | null;
  // Filesystem
  filesystem: {
    generated_at: string;
    roots: Array<any>;
  } | null;
  // Diagnostics
  diagnostics: {
    bootstrapTokenPreview: string | null;
    workers: number;
    activeJobs: number;
    cert: {
      notAfter: string;
      daysRemaining: number;
    } | null;
  };
}

export function normalizeInstanceUpdate(update: InstanceUpdate | null): NormalizedInstanceData | null {
  if (!update) return null;

  const isV1_1 = (update as any).schema === "v1.1";

  if (isV1_1) {
    const u = update as InstanceStreamUpdateV1_1;
    return {
      schema: "v1.1",
      // Agent
      version: u.agent?.version || "-",
      commit: u.agent?.commit || "-",
      buildDate: u.agent?.build_date || "-",
      goVersion: u.agent?.go_version || "-",
      os: u.agent?.os || "-",
      arch: u.agent?.arch || "-",
      // Status
      state: u.status?.state || "-",
      mode: u.status?.mode || "-",
      uptimeSeconds: u.status?.uptime_seconds || 0,
      // Health
      health: {
        overall: u.health?.overall || "-",
        websocket: u.health?.websocket || "-",
        tasks: u.health?.tasks || "-",
        proxy: u.health?.proxy || "-",
        auth: u.health?.auth || "-",
      },
      // Resources
      cpu: u.resources?.cpu ? {
        count: u.resources.cpu.count,
        userPercent: u.resources.cpu.user_percent,
        systemPercent: u.resources.cpu.system_percent,
        idlePercent: u.resources.cpu.idle_percent,
        iowaitPercent: u.resources.cpu.iowait_percent,
        loadAverage: u.resources.cpu.load_average ? {
          oneMinute: u.resources.cpu.load_average.one_minute,
          fiveMinute: u.resources.cpu.load_average.five_minute,
          fifteenMinute: u.resources.cpu.load_average.fifteen_minute,
        } : undefined,
      } : null,
      memory: u.resources?.memory ? {
        totalBytes: u.resources.memory.total_bytes,
        usedBytes: u.resources.memory.used_bytes,
        freeBytes: u.resources.memory.free_bytes,
        availableBytes: u.resources.memory.available_bytes,
        bufferCacheBytes: u.resources.memory.buffer_cache_bytes,
      } : null,
      swap: u.resources?.swap ? {
        totalBytes: u.resources.swap.total_bytes,
        usedBytes: u.resources.swap.used_bytes,
        freeBytes: u.resources.swap.free_bytes,
        availableBytes: u.resources.swap.available_bytes,
      } : null,
      disks: (u.resources?.disks || []).map(d => ({
        filesystem: d.filesystem,
        mountPoint: d.mount_point,
        totalBytes: d.total_bytes,
        usedBytes: d.used_bytes,
        availableBytes: d.available_bytes,
      })),
      // Workloads
      services: (u.workloads?.services as unknown as Array<Record<string, unknown>>) || [],
      deployments: (u.workloads?.deployments as unknown as Array<Record<string, unknown>>) || [],
      // Proxy
      proxy: u.proxy ? {
        type: u.proxy.type,
        status: u.proxy.status,
        version: u.proxy.version || null,
        routeCount: u.proxy.route_count || 0,
        routes: (u.proxy.routes || []).map(r => ({
          domain: r.domain,
          upstream: r.upstream,
          template: r.template,
          root: r.root || null,
          status: r.status,
        })),
      } : null,
      // Processes
      processes: u.processes?.list || [],
      processSummary: u.processes?.summary || null,
      // Filesystem
      filesystem: u.filesystem ? {
        generated_at: (u.filesystem as any).generated_at || new Date().toISOString(),
        roots: (u.filesystem as any).roots || [],
      } : null,
      // Diagnostics
      diagnostics: {
        bootstrapTokenPreview: u.diagnostics?.auth?.bootstrap_token_preview || null,
        workers: u.diagnostics?.worker?.max_concurrent || 0,
        activeJobs: u.diagnostics?.worker?.active_jobs || 0,
        cert: u.diagnostics?.cert ? {
          notAfter: u.diagnostics.cert.not_after,
          daysRemaining: u.diagnostics.cert.days_remaining,
        } : null,
      },
    };
  }

  // v1 format
  const u = update as InstanceStreamUpdateV1;
  const debug = (u as any).debug as any;
  const system = debug?.system;
  const top = (u as any).top as any;

  return {
    schema: "v1",
    // Agent
    version: u.build_info?.version || "-",
    commit: u.build_info?.commit || "-",
    buildDate: u.build_info?.date || "-",
    goVersion: u.build_info?.go_version || "-",
    os: u.platform?.os || "-",
    arch: u.platform?.arch || "-",
    // Status
    state: u.status || "-",
    mode: u.mode || "-",
    uptimeSeconds: typeof u.uptime === "string" ? parseInt(u.uptime, 10) || 0 : 0,
    // Health
    health: {
      overall: (u.health as any)?.overall || "-",
      websocket: (u.health as any)?.ws || "-",
      tasks: (u.health as any)?.tasks || "-",
      proxy: "-",
      auth: (u.health as any)?.auth || "-",
    },
    // Resources
    cpu: system ? {
      count: system.cpu_count || 0,
      userPercent: top?.cpu?.user || 0,
      systemPercent: top?.cpu?.system || 0,
      idlePercent: top?.cpu?.idle || 0,
      iowaitPercent: top?.cpu?.wait || 0,
      loadAverage: top?.header?.load_avg ? {
        oneMinute: top.header.load_avg.one,
        fiveMinute: top.header.load_avg.five,
        fifteenMinute: top.header.load_avg.fifteen,
      } : undefined,
    } : null,
    memory: system ? {
      totalBytes: system.mem_total_bytes || 0,
      usedBytes: system.mem_used_bytes || 0,
      freeBytes: system.mem_free_bytes || 0,
      availableBytes: (system.mem_free_bytes || 0) + ((top?.memory?.buffer_cache || 0) * 1024 * 1024),
      bufferCacheBytes: (top?.memory?.buffer_cache || 0) * 1024 * 1024,
    } : null,
    swap: top?.swap ? {
      totalBytes: (top.swap.total || 0) * 1024 * 1024,
      usedBytes: (top.swap.used || 0) * 1024 * 1024,
      freeBytes: (top.swap.free || 0) * 1024 * 1024,
      availableBytes: (top.swap.available || 0) * 1024 * 1024,
    } : null,
    disks: (system?.disks || []).map((d: any) => ({
      filesystem: d.filesystem,
      mountPoint: d.mountpoint,
      totalBytes: d.size_bytes,
      usedBytes: d.used_bytes,
      availableBytes: d.available_bytes,
    })),
    // Workloads
    services: (u.services as unknown as Array<Record<string, unknown>>) || [],
    deployments: (u.deployments as unknown as Array<Record<string, unknown>>) || [],
    // Proxy
    proxy: u.proxy ? {
      type: "caddy",
      status: (u.proxy as any).status || "-",
      version: null,
      routeCount: typeof (u.proxy as any).routes === "number" ? (u.proxy as any).routes : 0,
      routes: ((u as any).proxies || []).map((r: any) => ({
        domain: r.domain,
        upstream: r.upstream,
        template: r.template,
        root: r.root || null,
        status: r.status?.status || "unknown",
      })),
    } : null,
    // Processes
    processes: top?.processes || [],
    processSummary: top?.tasks ? {
      total: top.tasks.total || 0,
      running: top.tasks.running || 0,
      sleeping: top.tasks.sleeping || 0,
      stopped: top.tasks.stopped || 0,
      zombie: top.tasks.zombie || 0,
    } : null,
    // Filesystem
    filesystem: u.fs ? {
      generated_at: (u.fs as any).generated_at || new Date().toISOString(),
      roots: (u.fs as any).roots || [],
    } : null,
    // Diagnostics
    diagnostics: {
      bootstrapTokenPreview: debug?.auth?.bootstrap_token || null,
      workers: system?.workers || 0,
      activeJobs: 0,
      cert: debug?.cert ? {
        notAfter: debug.cert.not_after,
        daysRemaining: debug.cert.days_remaining,
      } : null,
    },
  };
}

export function formatUptime(seconds: number): string {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  const mb = 1024 * 1024;
  const kb = 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(1)}GB`;
  if (bytes >= mb) return `${(bytes / mb).toFixed(0)}MB`;
  if (bytes >= kb) return `${(bytes / kb).toFixed(0)}KB`;
  return `${bytes}B`;
}
