// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useId, useRef } from "react";
import { useInstanceStream } from "./use-instance-stream";
import { ulid } from "ulid";

interface PendingOperation<T> {
  resolve: (response: T) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface WebSocketOperationOptions {
  timeout?: number;
}

interface WebSocketResponse {
  requestId?: string;
  kind: string;
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

/**
 * Standardized hook for WebSocket operations
 * Handles request/response lifecycle, timeouts, and error handling
 * 
 * @param options - Configuration options
 * @returns sendOperation function and isConnected status
 */
export function useWebSocketOperation<TResponse extends WebSocketResponse = WebSocketResponse>(
  options: WebSocketOperationOptions = {}
) {
  const { timeout = 30000 } = options;
  const { sendJson, subscribe, unsubscribe, isConnected } = useInstanceStream();
  const hookId = useId();
  const pendingOps = useRef<Map<string, PendingOperation<TResponse>>>(new Map());

  // Handle responses
  useEffect(() => {
    const handler = (message: TResponse) => {
      if (!message.requestId) return;

      const pending = pendingOps.current.get(message.requestId);
      if (!pending) return;

      clearTimeout(pending.timeout);
      pendingOps.current.delete(message.requestId);

      if (message.kind === "error") {
        const errorMessage = message.message || "Operation failed";
        const error = new Error(errorMessage);
        (error as Error & { code?: string }).code = (message as any).code;
        pending.reject(error);
      } else {
        pending.resolve(message);
      }
    };

    subscribe(hookId, handler as (msg: unknown) => void);
    
    return () => {
      unsubscribe(hookId);
      // Clean up any pending operations
      pendingOps.current.forEach((pending) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Component unmounted"));
      });
      pendingOps.current.clear();
    };
  }, [hookId, subscribe, unsubscribe]);

  /**
   * Send a WebSocket operation and wait for response
   * 
   * @param request - Request object with kind and other fields
   * @param requestId - Optional custom request ID (auto-generated if not provided)
   * @returns Promise that resolves with the response
   */
  const sendOperation = useCallback(
    (request: Record<string, unknown>, requestId?: string): Promise<TResponse> => {
      return new Promise((resolve, reject) => {
        if (!isConnected) {
          const error = new Error("WebSocket not connected");
          (error as Error & { code: string }).code = "AGENT_DISCONNECTED";
          reject(error);
          return;
        }

        const reqId = requestId || ulid();
        const fullRequest = {
          ...request,
          requestId: reqId,
        };

        const timeoutId = setTimeout(() => {
          pendingOps.current.delete(reqId);
          const error = new Error("Operation timed out");
          (error as Error & { code: string }).code = "TIMEOUT";
          reject(error);
        }, timeout);

        pendingOps.current.set(reqId, {
          resolve,
          reject,
          timeout: timeoutId,
        });

        const sent = sendJson(fullRequest);
        if (!sent) {
          clearTimeout(timeoutId);
          pendingOps.current.delete(reqId);
          const error = new Error("Failed to send request");
          (error as Error & { code: string }).code = "SEND_FAILED";
          reject(error);
        }
      });
    },
    [isConnected, sendJson, timeout]
  );

  return {
    sendOperation,
    isConnected,
  };
}
