import type { LucideIcon } from "lucide-react";
import { dnsProviders, runtimes, logLevels } from "./runtimes";

export type Runtime = (typeof runtimes)[number];
export type DnsProvider = (typeof dnsProviders)[number];
export type BlueprintFormat = "yaml" | "json";
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

export interface OtpVerifyRequest {
  email: string;
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
  users: string[]; // Array of user emails
  roles: Record<string, string[]>; // role -> array of user emails
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

export interface Service {
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  runtime: Runtime;
  runtime_version?: string | null;
  remote?: string | null;
  branch?: string | null;
  commit_hash?: string | null;
  run_cmd?: string | null;
  build_cmd?: string | null;
  working_dir?: string | null;
  static_dir?: string | null;
  env_vars?: Record<string, string> | null;
  image?: string | null;
  port?: number | null;
  dns_provider?: DnsProvider | null;
  domain?: string | null;
  region: string;
  source: ServiceSource;
  last_deployed: Date;
  blueprint?: Blueprint | null;
  created_at: Date;
  updated_at: Date;
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
}

export interface IntegrationField {
  id: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  required?: boolean;
}

export const integrationIds = ["resendMail", "mailChimp", "mailerSend", "discord", "slack", "gitHub", "gitLab", "bitBucket", "godaddy", "cloudflare", "route53"] as const;

export type IntegrationType = (typeof integrationIds)[number];

export type IntegrationCategory = "email" | "remote" | "domain";

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

export interface BitBucketIntegration {
  id: string,
  loginId: string;
  installationId: number;
  remotesCount: number;
}

export interface ResendMailIntegration { }

export interface ZohoMailIntegration { }

export interface MailerSendIntegration { }

export interface MailChimpIntegration { }

export interface DiscordIntegration { }

export interface SlackIntegration { }

export interface Integrations {
  email: {
    resendMail: ResendMailIntegration,
    zohoMail: ZohoMailIntegration,
    mailerSend: MailerSendIntegration,
    mailChimp: MailChimpIntegration,
  },
  remote: {
    gitHub: GitHubIntegration,
    gitLab: GitLabIntegration,
    bitBucket: BitBucketIntegration,
  },
  domain: {
    discord: DiscordIntegration,
    slack: SlackIntegration,
  }
}

export interface IntegrationMetadata {
  icon: string;
  name: string;
  description: string;
  category: "email" | "remote" | "domain";
  connectType: "oauth" | "form";
  fields?: IntegrationField[];
}

export interface IntegrationUI extends IntegrationMetadata {
  id: string;
  connected: boolean;
  gitHub?: GitHubIntegration;
  gitLab?: GitLabIntegration;
  bitBucket?: BitBucketIntegration;
}

export const INTEGRATIONS_METADATA: Record<string, IntegrationMetadata> = {
  gitHub: {
    icon: "/icons/github.svg",
    name: "GitHub",
    description: "Connect your GitHub repositories",
    category: "remote",
    connectType: "oauth",
  },
  gitLab: {
    icon: "/icons/gitlab.svg",
    name: "GitLab",
    description: "Connect your GitLab repositories",
    category: "remote",
    connectType: "oauth",
  },
  bitBucket: {
    icon: "/icons/bitbucket.svg",
    name: "Bitbucket",
    description: "Connect your Bitbucket repositories",
    category: "remote",
    connectType: "oauth",
  },
  resendMail: {
    icon: "/icons/resend.svg",
    name: "Resend",
    description: "Send transactional emails with Resend",
    category: "email",
    connectType: "form",
    fields: [
      { id: "apiKey", label: "API Key", type: "password", placeholder: "Enter API key", required: true },
    ],
  },
  mailChimp: {
    icon: "/icons/mailchimp.svg",
    name: "Mailchimp",
    description: "Email marketing and automation platform",
    category: "email",
    connectType: "oauth",
  },
  mailerSend: {
    icon: "/icons/mailersend.svg",
    name: "Mailersend",
    description: "Transactional email delivery service",
    category: "email",
    connectType: "form",
    fields: [
      { id: "apiKey", label: "API Key", type: "password", placeholder: "Enter API key", required: true },
    ],
  },
  discord: {
    icon: "/icons/discord.svg",
    name: "Discord",
    description: "Send notifications to Discord channels",
    category: "email",
    connectType: "oauth",
  },
  slack: {
    icon: "/icons/slack.svg",
    name: "Slack",
    description: "Send notifications to Slack workspaces",
    category: "email",
    connectType: "oauth",
  },
  godaddy: {
    icon: "/icons/godaddy.svg",
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
    icon: "/icons/cloudflare.svg",
    name: "Cloudflare",
    description: "Manage domains and DNS with Cloudflare",
    category: "domain",
    connectType: "form",
    fields: [
      { id: "apiToken", label: "API Token", type: "password", placeholder: "Enter API token", required: true },
    ],
  },
  route53: {
    icon: "/icons/route53.svg",
    name: "Route 53",
    description: "Amazon Route 53 DNS management",
    category: "domain",
    connectType: "form",
    fields: [
      { id: "accessKey", label: "Access Key ID", type: "text", placeholder: "Enter access key", required: true },
      { id: "secretKey", label: "Secret Access Key", type: "password", placeholder: "Enter secret key", required: true },
    ],
  },
};
