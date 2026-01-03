// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

// Proxy app status (individual app status)
export interface ProxyAppStatus {
  status: "running" | "stopped" | "error" | string;
  uptime: number;
  version: string;
}

// Individual proxy app configuration
export interface ProxyApp {
  domain: string;
  upstream: string;
  root: string;
  status?: ProxyAppStatus; // Optional - may not be present in instance stream
  template: ProxyTemplate;
}

export type ProxyTemplate = "reverse_proxy" | "static" | "php_fastcgi" | string;

// Map of domain -> ProxyApp 
export type ProxyApps = Record<string, ProxyApp>;

// WebSocket request/response types for proxy operations
export interface ProxyStatusRequest {
  kind: "proxy_status";
  requestId: string;
  instanceName: string;
  clusterId: string;
}

export interface ProxyRestartRequest {
  kind: "proxy_restart";
  requestId: string;
  instanceName: string;
  clusterId: string;
  force?: boolean;
}

export interface ProxyAddRequest {
  kind: "proxy_add";
  requestId: string;
  instanceName: string;
  clusterId: string;
  serviceName: string;
  upstream: string;
  domain?: string;
  root?: string;
  template?: string;
}

export interface ProxyRemoveRequest {
  kind: "proxy_remove";
  requestId: string;
  instanceName: string;
  clusterId: string;
  serviceName: string;
}

export interface ProxyStatusResponse {
  kind: "proxy_status_response";
  requestId: string;
  success: boolean;
  data: {
    status: "running" | "stopped" | "error";
    apps: ProxyApps;
    stats?: {
      requestsPerSecond: number;
      cacheHitRate: number;
    };
  };
}

export interface ProxyRestartResponse {
  kind: "proxy_restart_response";
  requestId: string;
  success: boolean;
  data: {
    status: "accepted" | "completed";
    message: string;
  };
}

export interface ProxyAddResponse {
  kind: "proxy_add_response";
  requestId: string;
  success: boolean;
  data: {
    serviceName: string;
    upstream: string;
    message: string;
  };
}

export interface ProxyRemoveResponse {
  kind: "proxy_remove_response";
  requestId: string;
  success: boolean;
  data: {
    serviceName: string;
    message: string;
  };
}

export interface ProxyErrorResponse {
  kind: "error";
  requestId: string;
  code: ProxyErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ProxyErrorCode =
  | "MISSING_FIELD"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "AGENT_DISCONNECTED"
  | "TOO_MANY_PENDING";

export type ProxyResponse =
  | ProxyStatusResponse
  | ProxyRestartResponse
  | ProxyAddResponse
  | ProxyRemoveResponse
  | ProxyErrorResponse;