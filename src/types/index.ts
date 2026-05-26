// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";
import { FaBitbucket, FaDiscord, FaGithub, FaGitlab, FaLink, FaSlack } from "react-icons/fa";
import { SiAmazonroute53, SiCloudflare, SiGodaddy, SiNamecheap } from "react-icons/si";
import { dnsProviders, runtimes, logLevels } from "./runtimes";
import type { Process } from "./schemas/v1.1/";

// Re-export all schema types from the new modular schema system
export * from "./schemas";
export * from "./proxy";

export type { InstanceStreamUpdateV1_1, Process as ProcessV1_1 } from "./schemas/v1.1/";

export type { InstanceStreamUpdateV1 } from "./schemas/v1/";

export type Runtime = (typeof runtimes)[number];
export type DnsProvider = (typeof dnsProviders)[number];
export type BlueprintFormat = "json" | "yaml" | "toml";
export type LogLevel = (typeof logLevels)[number];
export type ServiceType = "web";

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
  badge?: string;
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

// Process Snapshot for history tracking
export interface ProcessSnapshot {
  seq: number;
  timestamp: number;
  data: {
    list?: Process[];
  };
}

// Filesystem Task Types
export type FsTaskType = "file_read" | "file_write" | "file_create" | "file_delete" | "file_tree" | "file_watch" | "file_unwatch";

export interface FsTaskRequest {
  kind: FsTaskType;
  requestId: string;
  instanceId: string;
  path: string;
  content?: string;
  encoding?: "utf8" | "base64";
  type?: "file" | "dir";
  recursive?: boolean;
  offset?: number;
  limit?: number;
  depth?: number;
  cursor?: string;
  mode?: string;
}

// File watching types
export type FileUpdateEventType = "created" | "modified" | "deleted" | "renamed";

export interface FileUpdateEvent {
  type: FileUpdateEventType;
  path: string;
  oldPath?: string; // For rename events
  timestamp: number;
  size?: number;
  isDirectory?: boolean;
}

export type FileWatchCallback = (event: FileUpdateEvent) => void;

export type ProcessTimeWindow = "live" | "1h" | "6h" | "24h";

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
  metadata?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface OnboardingMetadata {
  onboarding_team_size: "just-me" | "2-5" | "5-plus";
  onboarding_first_deploy: "web-service" | "static-site" | "worker" | "not-sure";
  onboarding_replacing: "heroku" | "render" | "railway" | "fly" | "digitalocean" | "aws" | "coolify" | "self-managed" | "fresh" | "other";
  onboarding_source: "ai" | "github" | "hackernews" | "reddit" | "search" | "youtube" | "tiktok" | "twitter" | "friend" | "producthunt" | "newsletter" | "other";
  onboarding_feedback_call: "true" | "false";
  onboarding_completed_at: string;
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

export type NodeRole = "instance" | "build";

export interface Instance {
  id: string;
  address: string;
  publicKey: string;
  tag: string;
  role: NodeRole;
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
  type: ServiceType;
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

/** Service as returned by GET /v1/services */
export interface ApiService {
  id: string;
  clusterId: string;
  name: string;
  type: "docker" | "static";
  deploymentId: string | null;
  icedAt: number | null;
  status: "running" | "sleeping";
  createdAt: number;
  updatedAt: number;
}

/** Deployment as returned by GET /v1/deployments */
export interface ApiDeployment {
  id: string;
  clusterId: string;
  serviceId: string | null;
  name: string;
  type: "docker" | "static";
  source: "remote" | "image";
  status: "pending" | "running" | "success" | "failed";
  blueprint: Record<string, any> | null;
  logs: string | null;
  buildFingerprint: string | null;
  createdAt: number;
  finishedAt: number | null;
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

export interface PendingAction {
  prompt: string;
  action: () => void;
}

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

export interface IntegrationEmailCategory {}

export interface IntegrationRemoteCategory {}

export interface IntegrationDomainCategory {}

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
  id: string;
  loginId: string;
  installationId: number;
  remotesCount: number;
}

export interface CustomWebHookIntegration {}

export interface DiscordIntegration {
  installUrl: string;
}

export interface SlackIntegration {
  installUrl: string;
}

export interface Integrations {
  notifications: {
    customWebHook: CustomWebHookIntegration;
  };
  remote: {
    gitHub: GitHubIntegration;
    gitLab: GitLabIntegration;
    bitBucket: BitbucketIntegration;
  };
  domain: {
    discord: DiscordIntegration;
    slack: SlackIntegration;
  };
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
  url?: string;
  gitHub?: GitHubIntegration;
  gitLab?: GitLabIntegration;
  bitbucket?: BitbucketIntegration;
  discord?: DiscordIntegration;
}

export interface Project {
  id: number | string;
  name: string;
  description: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: { monthly: number; annual: number };
  currency: string;
  interval: "month" | null;
  features?: string[];
}

export interface BillingSubscription {
  status: "active" | "canceled" | "past_due";
  polarSubscriptionId: string;
  createdAt: number;
  updatedAt: number;
}

export interface BillingStatus {
  plan: string;
  planDetails: Plan;
  subscription: BillingSubscription | null;
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
    fields: [{ id: "url", label: "URL", type: "text", placeholder: "Enter URL", required: true }],
  },
  discord: {
    icon: FaDiscord,
    name: "Discord",
    description: "Send to Discord channels",
    category: "notifications",
    connectType: "form",
    fields: [{ id: "discordWebhookUrl", label: "Webhook URL", type: "text", placeholder: "https://discord.com/api/webhooks/…", required: true }],
  },
  slack: {
    icon: FaSlack,
    name: "Slack",
    description: "Send to Slack workspaces",
    category: "notifications",
    connectType: "form",
    fields: [{ id: "slackWebhookUrl", label: "Webhook URL", type: "text", placeholder: "https://hooks.slack.com/services/…", required: true }],
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
    fields: [{ id: "apiToken", label: "API Token", type: "password", placeholder: "Enter API token", required: true }],
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
