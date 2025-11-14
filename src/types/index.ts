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

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "email" | "remote" | "domain";
  connected: boolean;
}
