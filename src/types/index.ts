import type { LucideIcon } from "lucide-react";
import { dnsProviders, runtimes, logLevels } from "./runtimes";

export type Runtime = (typeof runtimes)[number];
export type DnsProvider = (typeof dnsProviders)[number];
export type BlueprintFormat = "yaml" | "json";
export type LogChannel = "production" | "local";
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

export interface ApiResponse {
    success: boolean;
    data: unknown[] | Record<string, unknown>;
    error?: string;
}

export type UserRole = "user" | "admin";

export interface AuthRequest {
    email: string;
    expiry: "15m" | "1h" | "never";
    instance: string;
}

export interface OtpVerifyRequest {
    email: string;
    otp: string;
}

export interface AuthResponse {
    token: string;
    expires_at: string;
    user: string; // email as identifier
}

export interface User {
    id: string;
    email: string;
    avatar?: string;
    role: UserRole;
    created_at?: Date | unknown;
    updated_at?: Date | unknown;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Project {
    id: string;
    name: string;
    description: string;
}

export interface Remote {
    id: string;
    name: string;
    repository: string;
    branch: string;
    provider: string;
    commit_message?: string | null;
    avatar_url?: string | null;
}

export interface DockerImage {
    id: string;
    name: string;
}

export type ServiceSource = "image" | "remote";

export type Status = "pending" | "in_progress" | "failed" | "completed";

export interface Service {
    id: string;
    name: string;
    status: Status;
    runtime: Runtime;
    remote?: Remote | null;
    ci_remote?: Remote | null;
    run_cmd?: string | null;
    working_dir?: string | null;
    env_vars?: Record<string, string> | null;
    build_cmd?: string | null;
    image?: string | null;
    port?: number | null;
    dns_provider?: DnsProvider | null;
    domain?: string | null;
    region: string;
    source: ServiceSource;
    last_deployed: Date;
    created_at: Date;
    updated_at: Date;
}

export interface Blueprint {
    id: string;
    config: Partial<Service>;
    status: Status;
    created_at: Date;
    updated_at: Date;
}

export interface Log {
    id: string;
    message: string;
    level?: number | null;
    level_name?: LogLevel | null;
    datetime?: Date | null;
    channe?: LogChannel;
    context?: Record<string, unknown> | null;
}
