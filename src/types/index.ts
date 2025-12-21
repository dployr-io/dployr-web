// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";
import { FaBitbucket, FaDiscord, FaGithub, FaGitlab, FaLink, FaSlack } from "react-icons/fa";
import { SiAmazonroute53, SiCloudflare, SiGodaddy, SiNamecheap } from "react-icons/si";
import { dnsProviders, runtimes, logLevels } from "./runtimes";

export type Runtime = (typeof runtimes)[number];
export type DnsProvider = (typeof dnsProviders)[number];
export type BlueprintFormat = "json" | "yaml" | "toml";
export type LogLevel = (typeof logLevels)[number];

export interface Auth {
  user: User;
}

export interface BreadcrumbItem {
  title: string;
  href: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon | null;
  isActive?: boolean;
}

export interface SharedData {
  name: string;
  quote: { message: string; author: string };
  auth: Auth;
  sidebarOpen: boolean;
  [key: string]: unknown;
}

export type UsersUrlState = {
  tab: "users" | "invites-received" | "invites-sent";
  page: number;
  activityModal: {
    open: boolean;
    userId: string | null;
    search: string;
    category: string;
    sortBy: "timestamp" | "action" | "category";
    sortOrder: "asc" | "desc";
  };
};

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated data wrapper
 */
export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Standard success response with data
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standard error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export type UserRole = "owner" | "admin" | "developer" | "viewer";

export type InstanceStatus = "ready" | "starting" | "stopped" | "error" | string;

// Agent Health Status
export type AgentHealthStatus = "ok" | "degraded" | "error";

export interface AgentHealth {
  overall: AgentHealthStatus;
  ws: AgentHealthStatus;
  tasks: AgentHealthStatus;
  auth: AgentHealthStatus;
}

// Disk Information
export interface DiskInfo {
  filesystem: string;
  mountpoint: string;
  size_bytes: number;
  used_bytes?: number;
  available_bytes: number;
}

// System Debug Information
export interface SystemDebug {
  cpu_count: number;
  mem_total_bytes: number;
  mem_used_bytes: number;
  mem_free_bytes: number;
  disks: DiskInfo[];
  workers: number;
}

// Debug Information
export interface AgentDebug {
  ws: {
    connected: boolean;
    last_connect_at: string;
    reconnects_since_start: number;
  };
  tasks: {
    inflight: number;
    done_unsent: number;
  };
  auth: {
    agent_token_age_s: number;
    agent_token_expires_in_s: number;
    bootstrap_token: string;
  };
  system: SystemDebug;
}

// Process Information for Top
export interface ProcessInfo {
  pid: number;
  user: string;
  command: string;
  cpu_percent: number;
  mem_percent: number;
  rss_bytes: number;
  vms_bytes: number;
  state: string;
}

// Top Metrics (real-time system stats)
export interface TopMetrics {
  timestamp: string;
  uptime_seconds: number;
  load_avg: {
    load1: number;
    load5: number;
    load15: number;
  };
  cpu: {
    user: number;
    system: number;
    idle: number;
    iowait: number;
    steal: number;
  };
  memory: {
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    available_bytes: number;
    used_percent: number;
    swap_total_bytes: number;
    swap_used_bytes: number;
    swap_free_bytes: number;
  };
  tasks: {
    total: number;
    running: number;
    sleeping: number;
    stopped: number;
    zombie: number;
  };
  processes: ProcessInfo[];
}

// Filesystem Node
export interface FsNode {
  path: string;
  name: string;
  type: "file" | "dir" | "symlink";
  size_bytes: number;
  mod_time: string;
  mode: string;
  owner: string;
  group: string;
  uid: number;
  gid: number;
  readable: boolean;
  writable: boolean;
  executable: boolean;
  children?: FsNode[];
  truncated?: boolean;
  child_count?: number;
}

// Filesystem Snapshot
export interface FsSnapshot {
  generated_at: string;
  roots: FsNode[];
}

// Filesystem Task Types
export type FsTaskType = "fs_read" | "fs_write" | "fs_create" | "fs_delete" | "fs_list";

export interface FsTaskRequest {
  kind: FsTaskType;
  taskId: string;
  instanceId: string;
  path: string;
  content?: string;
  encoding?: "utf8" | "base64";
  type?: "file" | "dir";
  recursive?: boolean;
}

export interface FsTaskResponse {
  kind: "fs_result";
  taskId: string;
  success: boolean;
  error?: string;
  data?: {
    content?: string;
    encoding?: string;
    node?: FsNode;
    nodes?: FsNode[];
  };
}

// Proxy Status
export interface ProxyStatus {
  status: "running" | "stopped" | "error";
  routes: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  source: string;
  runtime: string;
  runtime_version: string;
  run_cmd: string;
  build_cmd: string;
  port: number;
  working_dir: string;
  status: string;
  remote: string;
  branch: string;
  commit_hash: string;
  domain: string;
  blueprint?: Blueprint;
  created_at: string;
  updated_at: string;
}

// New v1 schema update
export interface InstanceStreamUpdateV1 {
  schema: "v1";
  seq: number;
  epoch: string;
  full: boolean;
  instance_id: string;
  build_info: {
    version: string;
    commit: string;
    date: string;
    go_version: string;
  };
  platform: {
    os: string;
    arch: string;
  };
  status: "healthy" | "degraded" | "unhealthy" | string;
  mode: "ready" | "starting" | "stopping" | string;
  uptime: string;
  deployments?: Deployment[];
  services?: Service[];
  proxies?: any[];
  proxy?: ProxyStatus;
  health?: AgentHealth;
  debug?: AgentDebug;
  fs?: FsSnapshot;
  top?: TopMetrics;
}


export interface InstanceStream {
  kind: string;
  timestamp: number;
  update: InstanceStreamUpdateV1;
}

// Memory profile entry for caching
export interface MemoryProfileEntry {
  timestamp: number;
  mem_used_bytes: number;
  mem_total_bytes: number;
  mem_used_percent: number;
  cpu_user: number;
  cpu_system: number;
}

export interface OtpVerifyRequest {
  notifications: string;
  otp: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Cluster {
  id: string;
  name: string;
  users: string[]; // Array of user ids
  roles: Record<string, string[]>; // role -> array of user roles
  createdAt: number;
  updatedAt: number;
}

export interface SessionData {
  user: User;
  cluster: Cluster;
}

export interface EventActor {
  id: string;
  type: string;
}

export interface EventTarget {
  id: string;
}

export interface ClusterEvent {
  id: string;
  timestamp: number;
  type: string;
  actor: EventActor;
  targets?: EventTarget[];
  timezone: string;
  timezoneOffset: string;
}

export interface Instance {
  id: string;
  address: string;
  publicKey: string;
  tag: string;
  resources?: {
    cpu: number; // usage percentage 0-100
    memory: number; // usage percentage 0-100
    disk: number; // usage percentage 0-100
  };
  bootstrapToken: string;
  cpuCount?: number;
  memorySizeMb?: number;
  status: InstanceStatus;
  metadata?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface EventsResponse {
  items: ClusterEvent[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Remote {
  url: string;
  branch: string;
  commit_hash?: string | null;
  avatar_url?: string | null;
}

export interface DockerImage {
  id: string;
  name: string;
}

export type ServiceSource = "image" | "remote";

export type DeploymentStatus = "pending" | "in_progress" | "failed" | "completed";

export type ServiceStatus = "running" | "stopped" | "unknown";

export interface RuntimeObj {
  type: Runtime;
  version?: string | null;
}

export interface Blueprint {
  name: string;
  description: string;
  source: ServiceSource;
  runtime: RuntimeObj;
  remote?: Remote | null;
  run_cmd?: string | null;
  build_cmd?: string | null;
  working_dir?: string | null;
  static_dir?: string | null;
  env_vars?: Record<string, string> | null;
  image?: string | null;
  port?: number | null;
  dns_provider?: DnsProvider | null;
  domain?: string | null;
  region?: string | null;
}

export interface Deployment {
  id: string;
  config: Blueprint;
  status: DeploymentStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Log {
  id: string;
  message: string;
  level: LogLevel | null;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type LogTimeRange = "live" | "5m" | "15m" | "30m" | "1h" | "3h" | "6h" | "12h" | "24h";

export type LogType = "app" | "install";
export type LogStreamMode = "tail" | "historical";

export interface LogStreamRequest {
  logType: LogType;
  mode: LogStreamMode;
  startFrom?: number;
  limit?: number;
}

export interface LogStreamResponse {
  streamId: string;
  logType: LogType;
  mode: LogStreamMode;
  startFrom?: number;
  limit?: number;
}

export interface LogChunkMessage {
  kind: "log_chunk";
  streamId: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  lineNumber?: number;
}

export interface IntegrationField {
  id: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  required?: boolean;
}

export const integrationIds = ["discord", "slack", "customWebHook", "gitHub", "gitLab", "bitbucket", "namecheap", "godaddy", "cloudflare", "route53"] as const;

export type IntegrationType = (typeof integrationIds)[number];

export type IntegrationCategory = "notifications" | "remote" | "domain";

export interface IntegrationEmailCategory { }

export interface IntegrationRemoteCategory { }

export interface IntegrationDomainCategory { }

export interface GitHubIntegration {
  loginId: string;
  installationId: number;
  remotesCount: number;
  installUrl: string;
}

export interface GitLabIntegration {
  loginId: string;
  installationId: number;
  remotesCount: number;
}

export interface BitbucketIntegration {
  id: string,
  loginId: string;
  installationId: number;
  remotesCount: number;
}

export interface CustomWebHookIntegration { }

export interface DiscordIntegration {
  installUrl: string;
 }

export interface SlackIntegration {
  installUrl: string;
 }

export interface Integrations {
  notifications: {
    customWebHook: CustomWebHookIntegration,
  },
  remote: {
    gitHub: GitHubIntegration,
    gitLab: GitLabIntegration,
    bitBucket: BitbucketIntegration,
  },
  domain: {
    discord: DiscordIntegration,
    slack: SlackIntegration,
  }
}

export interface IntegrationMetadata {
  icon: IconType;
  name: string;
  description: string;
  category: "notifications" | "remote" | "domain";
  connectType: "oauth" | "form";
  fields?: IntegrationField[];
}

export interface IntegrationUI extends IntegrationMetadata {
  id: string;
  connected: boolean;
  gitHub?: GitHubIntegration;
  gitLab?: GitLabIntegration;
  bitbucket?: BitbucketIntegration;
  discord?: DiscordIntegration;
}

export const INTEGRATIONS_METADATA: Record<string, IntegrationMetadata> = {
  gitHub: {
    icon: FaGithub,
    name: "GitHub",
    description: "Connect your GitHub account",
    category: "remote",
    connectType: "oauth",
  },
  gitLab: {
    icon: FaGitlab,
    name: "GitLab",
    description: "Connect your GitLab account",
    category: "remote",
    connectType: "oauth",
  },
  bitBucket: {
    icon: FaBitbucket,
    name: "Bitbucket",
    description: "Connect your Bitbucket account",
    category: "remote",
    connectType: "oauth",
  },
  customWebHook: {
    icon: FaLink,
    name: "Custom Webhook",
    description: "Trigger custom webhooks",
    category: "notifications",
    connectType: "form",
    fields: [
      { id: "url", label: "URL", type: "text", placeholder: "Enter URL", required: true },
    ],
  },
  discord: {
    icon: FaDiscord,
    name: "Discord",
    description: "Send to Discord channels",
    category: "notifications",
    connectType: "oauth",
  },
  slack: {
    icon: FaSlack,
    name: "Slack",
    description: "Send to Slack workspaces",
    category: "notifications",
    connectType: "oauth",
  },
  namecheap: {
    icon: SiNamecheap,
    name: "Namecheap",
    description: "Manage domains with Namecheap",
    category: "domain",
    connectType: "form",
    fields: [
      { id: "apiKey", label: "API Key", type: "password", placeholder: "Enter API key", required: true },
      { id: "apiSecret", label: "API Secret", type: "password", placeholder: "Enter API secret", required: true },
    ],
  },
  godaddy: {
    icon: SiGodaddy,
    name: "GoDaddy",
    description: "Manage domains with GoDaddy",
    category: "domain",
    connectType: "form",
    fields: [
      { id: "apiKey", label: "API Key", type: "password", placeholder: "Enter API key", required: true },
      { id: "apiSecret", label: "API Secret", type: "password", placeholder: "Enter API secret", required: true },
    ],
  },
  cloudflare: {
    icon: SiCloudflare,
    name: "Cloudflare",
    description: "Manage domains with Cloudflare",
    category: "domain",
    connectType: "form",
    fields: [
      { id: "apiToken", label: "API Token", type: "password", placeholder: "Enter API token", required: true },
    ],
  },
  route53: {
    icon: SiAmazonroute53,
    name: "Route 53",
    description: "Amazon Route 53 management",
    category: "domain",
    connectType: "form",
    fields: [
      { id: "accessKey", label: "Access Key ID", type: "text", placeholder: "Enter access key", required: true },
      { id: "secretKey", label: "Secret Access Key", type: "password", placeholder: "Enter secret key", required: true },
    ],
  },
};
