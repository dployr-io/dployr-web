// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

// Node WebSocket error codes from server
export const NODE_ERROR_CODES = {
  MISSING_FIELD: 1001,
  INVALID_FORMAT: 1002,
  UNAUTHORIZED: 2002,
  PERMISSION_DENIED: 2000,
  NOT_FOUND: 2001,
  RATE_LIMITED: 4000,
  TOO_MANY_PENDING: 4001,
  NODE_DISCONNECTED: 3001,
  NODE_TIMEOUT: 3000,
  INTERNAL_ERROR: 5000,
} as const;

// Transient errors that should be retried with exponential backoff
export const RETRYABLE_ERROR_CODES = [
  "RATE_LIMITED",
  "TOO_MANY_PENDING",
  "NODE_DISCONNECTED",
  "NODE_TIMEOUT",
] as const;

// Error code type for type safety
export type NodeErrorCode = keyof typeof NODE_ERROR_CODES;

// Check if an error code is retryable
export function isRetryableError(code: string): code is typeof RETRYABLE_ERROR_CODES[number] {
  return RETRYABLE_ERROR_CODES.includes(code as any);
}

// Get human-readable error message for error code
export function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    MISSING_FIELD: "Required field is missing from request",
    INVALID_FORMAT: "Invalid message format",
    UNAUTHORIZED: "Authentication required",
    PERMISSION_DENIED: "Permission denied",
    NOT_FOUND: "Resource not found",
    RATE_LIMITED: "Too many requests, please try again",
    TOO_MANY_PENDING: "Too many pending requests",
    NODE_DISCONNECTED: "Instance is not available, please refresh browser and try again",
    NODE_TIMEOUT: "Request timed out",
    INTERNAL_ERROR: "Server error occurred",
  };

  return messages[code] || "An error occurred";
}
