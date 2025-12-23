// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useId, useRef } from "react";
import { useInstanceStream } from "./use-instance-stream";
import { ulid } from "ulid";

interface PendingOperation {
  resolve: (response: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface UseInstanceOperationsOptions {
  timeout?: number;
}

/**
 * Hook for WebSocket-based instance system operations
 * Handles: install, reboot, restart, token rotate
 */
export function useInstanceOperations({ timeout = 25000 }: UseInstanceOperationsOptions = {}) {
  const subscriberId = useId();
  const { isConnected, sendJson, subscribe, unsubscribe } = useInstanceStream();
  const pendingOperationsRef = useRef<Map<string, PendingOperation>>(new Map());

  const handleMessage = useCallback((message: any) => {
    const responseKinds = [
      "instance_system_install_response",
      "instance_system_reboot_response",
      "instance_system_restart_response",
      "instance_token_rotate_response",
    ];

    if (responseKinds.includes(message.kind)) {
      const requestId = message.requestId as string;
      const pending = pendingOperationsRef.current.get(requestId);

      if (pending) {
        clearTimeout(pending.timeout);
        pendingOperationsRef.current.delete(requestId);

        if (message.success) {
          pending.resolve(message.data);
        } else {
          const error = message.error as { code: number; message: string };
          console.error(`[InstanceOps] Error for ${requestId}:`, error);
          pending.reject(new Error(error.message || "Operation failed"));
        }
      }
    }

    if (message.kind === "error") {
      const requestId = message.requestId as string;
      const pending = pendingOperationsRef.current.get(requestId);

      if (pending) {
        clearTimeout(pending.timeout);
        pendingOperationsRef.current.delete(requestId);
        
        const errorCode = message.code as string | number;
        const errorMessage = message.message as string;
        
        console.error(`[InstanceOps] Error for ${requestId}: [${errorCode}] ${errorMessage}`);
        
        // Create error with code attached for better error handling
        const error = new Error(errorMessage || "Operation failed");
        (error as any).code = errorCode;
        pending.reject(error);
      }
    }
  }, []);

  useEffect(() => {
    subscribe(subscriberId, handleMessage);
    return () => {
      unsubscribe(subscriberId);
      pendingOperationsRef.current.forEach((pending) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Component unmounted"));
      });
      pendingOperationsRef.current.clear();
    };
  }, [subscriberId, subscribe, unsubscribe, handleMessage]);

  const sendOperation = useCallback(
    (request: Record<string, any>): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (!isConnected) {
          reject(new Error("WebSocket not connected"));
          return;
        }

        const requestId = ulid();
        const fullRequest = {
          ...request,
          requestId,
        };

        console.log(`[InstanceOps] Sending ${request.kind} request ${requestId}`);

        const timeoutHandle = setTimeout(() => {
          pendingOperationsRef.current.delete(requestId);
          console.error(`[InstanceOps] Request ${requestId} timed out after ${timeout}ms`);
          reject(new Error("Request timed out"));
        }, timeout);

        pendingOperationsRef.current.set(requestId, {
          resolve,
          reject,
          timeout: timeoutHandle,
        });

        const sent = sendJson(fullRequest);
        
        if (!sent) {
          clearTimeout(timeoutHandle);
          pendingOperationsRef.current.delete(requestId);
          console.error(`[InstanceOps] Failed to send request ${requestId}`);
          reject(new Error("Failed to send request"));
        }
      });
    },
    [isConnected, sendJson, timeout]
  );

  const installVersion = useCallback(
    async (instanceId: string, clusterId: string, version?: string): Promise<{ taskId: string; status: string; message: string }> => {
      const request: Record<string, any> = {
        kind: "instance_system_install",
        instanceId,
        clusterId,
      };

      if (version) {
        request.version = version;
      }

      return sendOperation(request);
    },
    [sendOperation]
  );

  const rebootInstance = useCallback(
    async (instanceId: string, clusterId: string, force?: boolean): Promise<{ taskId: string; status: string; message: string }> => {
      const request: Record<string, any> = {
        kind: "instance_system_reboot",
        instanceId,
        clusterId,
      };

      if (force !== undefined) {
        request.force = force;
      }

      return sendOperation(request);
    },
    [sendOperation]
  );

  const restartInstance = useCallback(
    async (instanceId: string, clusterId: string, force?: boolean): Promise<{ taskId: string; status: string; message: string }> => {
      const request: Record<string, any> = {
        kind: "instance_system_restart",
        instanceId,
        clusterId,
      };

      if (force !== undefined) {
        request.force = force;
      }

      return sendOperation(request);
    },
    [sendOperation]
  );

  const rotateToken = useCallback(
    async (instanceId: string, token: string): Promise<{ status: string; message: string }> => {
      return sendOperation({
        kind: "instance_token_rotate",
        instanceId,
        token,
      });
    },
    [sendOperation]
  );

  return {
    isConnected,
    installVersion,
    rebootInstance,
    restartInstance,
    rotateToken,
  };
}
