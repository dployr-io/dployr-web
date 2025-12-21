// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

/**
 * WebSocket error response structure from server
 */
export interface WsErrorResponse {
  kind: "error";
  requestId: string;
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
}

/**
 * App error structure for displaying to users
 */
export interface AppError {
  message: string;
  helpLink?: string;
  code?: string;
  requestId?: string;
  details?: Record<string, any>;
}

/**
 * Map WebSocket error codes to user-friendly messages and help links
 */
const ERROR_MESSAGE_MAP: Record<string, { message: string; helpLink?: string }> = {
  MISSING_FIELD: {
    message: "Invalid request: required field is missing",
    helpLink: "/docs/errors/missing-field",
  },
  INVALID_FORMAT: {
    message: "Invalid request format",
    helpLink: "/docs/errors/invalid-format",
  },
  UNAUTHORIZED: {
    message: "Authentication required. Please log in again.",
    helpLink: "/docs/errors/unauthorized",
  },
  PERMISSION_DENIED: {
    message: "You don't have permission to perform this action",
    helpLink: "/docs/errors/permission-denied",
  },
  NOT_FOUND: {
    message: "The requested resource was not found",
    helpLink: "/docs/errors/not-found",
  },
  RATE_LIMITED: {
    message: "Too many requests. Please wait a moment and try again.",
    helpLink: "/docs/errors/rate-limited",
  },
  TOO_MANY_PENDING: {
    message: "Too many pending requests. Please wait a moment and try again.",
    helpLink: "/docs/errors/too-many-pending",
  },
  AGENT_DISCONNECTED: {
    message: "Instance is not available. Please try again later.",
    helpLink: "/docs/errors/agent-disconnected",
  },
  AGENT_TIMEOUT: {
    message: "Request timed out. The instance may be overloaded. Please try again.",
    helpLink: "/docs/errors/agent-timeout",
  },
  INTERNAL_ERROR: {
    message: "Server error occurred. Please try again later.",
    helpLink: "/docs/errors/internal-error",
  },
};

/**
 * Convert WebSocket error response to app error for display
 */
export function wsErrorToAppError(error: WsErrorResponse): AppError {
  const errorInfo = ERROR_MESSAGE_MAP[error.code] || {
    message: error.message || "An error occurred",
  };

  return {
    message: errorInfo.message,
    helpLink: errorInfo.helpLink,
    code: error.code,
    requestId: error.requestId,
    details: error.details,
  };
}

/**
 * Check if error is a WebSocket error response
 */
export function isWsError(error: any): error is WsErrorResponse {
  return (
    error &&
    typeof error === "object" &&
    error.kind === "error" &&
    typeof error.code === "string" &&
    typeof error.message === "string" &&
    typeof error.requestId === "string"
  );
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: any): string {
  if (isWsError(error)) {
    const appError = wsErrorToAppError(error);
    return appError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  return "An unknown error occurred";
}

/**
 * Extract error code from various error types
 */
export function getErrorCode(error: any): string | undefined {
  if (isWsError(error)) {
    return error.code;
  }

  if (error?.code) {
    return error.code;
  }

  return undefined;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const code = getErrorCode(error);
  if (!code) return false;

  const retryableCodes = [
    "RATE_LIMITED",
    "TOO_MANY_PENDING",
    "AGENT_DISCONNECTED",
    "AGENT_TIMEOUT",
  ];

  return retryableCodes.includes(code);
}

/**
 * Get retry delay in milliseconds based on retry count
 */
export function getRetryDelay(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 30000);
}

/**
 * Log error for debugging with requestId
 */
export function logWsError(error: WsErrorResponse, context?: string): void {
  const prefix = context ? `[${context}]` : "[WebSocket]";
  console.error(
    `${prefix} Error ${error.requestId}: [${error.code}] ${error.message}`,
    error.details
  );
}
