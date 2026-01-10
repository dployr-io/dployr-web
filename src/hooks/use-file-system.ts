// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useInstanceStream } from "./use-instance-stream";
import type { FsTaskRequest, NormalizedFilesystem, FileUpdateEvent, FileWatchCallback } from "@/types";
import { ulid } from "ulid";
import type { FsNode } from "@/types/schemas/v1.1";

interface FileSystemState {
  isLoading: boolean;
  error: string | null;
  pendingCount: number;
  activeWatches: number;
}

interface FileWatchSubscription {
  path: string;
  callback: FileWatchCallback;
  recursive: boolean;
}

interface UseFileSystemOptions {
  instanceId: string;
  timeout?: number;
  maxPending?: number;
  maxRetries?: number;
}

interface PendingRequest {
  resolve: (response: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  request: Omit<FsTaskRequest, "requestId" | "instanceId">;
  retryCount: number;
}

interface QueuedRequest {
  request: Omit<FsTaskRequest, "requestId" | "instanceId">;
  resolve: (response: any) => void;
  reject: (error: Error) => void;
  retryCount: number;
}

// Transient errors that should be retried
const RETRYABLE_ERRORS = [
  "RATE_LIMITED",
  "TOO_MANY_PENDING",
  "AGENT_DISCONNECTED",
  "AGENT_TIMEOUT",
];

export function useFileSystem({ 
  instanceId, 
  timeout = 25000,
  maxPending = 50,
  maxRetries = 3 
}: UseFileSystemOptions) {
  const subscriberId = useId();
  const { isConnected, sendJson, subscribe, unsubscribe } = useInstanceStream();
  const pendingRequestsRef = useRef<Map<string, PendingRequest>>(new Map());
  const requestQueueRef = useRef<QueuedRequest[]>([]);
  const isMountedRef = useRef(true);

  const [state, setState] = useState<FileSystemState>({
    isLoading: false,
    error: null,
    pendingCount: 0,
    activeWatches: 0,
  });

  const fileWatchesRef = useRef<Map<string, FileWatchSubscription>>(new Map());

  const processQueue = useCallback(() => {
    if (requestQueueRef.current.length > 0 && pendingRequestsRef.current.size < maxPending) {
      const queued = requestQueueRef.current.shift();
      if (queued) {
        sendTaskInternal(queued.request, queued.resolve, queued.reject, queued.retryCount);
      }
    }
  }, [maxPending]);

  const handleMessage = useCallback((message: any) => {
    const responseKinds = [
      "file_read_response",
      "file_write_response",
      "file_create_response",
      "file_delete_response",
      "file_tree_response",
      "file_watch_response",
      "file_unwatch_response",
    ];

    if (responseKinds.includes(message.kind)) {
      const requestId = message.requestId as string;
      const pending = pendingRequestsRef.current.get(requestId);

      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequestsRef.current.delete(requestId);
        setState(prev => ({ ...prev, pendingCount: pendingRequestsRef.current.size }));
        
        console.log(`[FileSystem] Response received for ${requestId}:`, message.kind);
        pending.resolve(message);
        
        // Process queued requests
        processQueue();
      }
    }

    if (message.kind === "error") {
      const requestId = message.requestId as string;
      const pending = pendingRequestsRef.current.get(requestId);

      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequestsRef.current.delete(requestId);
        setState(prev => ({ ...prev, pendingCount: pendingRequestsRef.current.size }));
        
        const errorCode = message.code as string;
        const errorMessage = message.message as string;
        
        console.error(`[FileSystem] Error for ${requestId}: [${errorCode}] ${errorMessage}`);
        
        // Check if error is retryable
        if (RETRYABLE_ERRORS.includes(errorCode) && pending.retryCount < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, pending.retryCount), 30000);
          console.log(`[FileSystem] Retrying ${requestId} after ${backoffMs}ms (attempt ${pending.retryCount + 1}/${maxRetries})`);
          
          setTimeout(() => {
            sendTaskInternal(
              pending.request,
              pending.resolve,
              pending.reject,
              pending.retryCount + 1
            );
          }, backoffMs);
        } else {
          pending.reject(new Error(`[${errorCode}] ${errorMessage}`));
        }
        
        // Process queued requests
        processQueue();
      }
    }

    // Handle file update broadcasts
    if (message.kind === "file_update") {
      const event = message.event as FileUpdateEvent;
      
      // Find matching watch subscriptions and invoke callbacks
      fileWatchesRef.current.forEach((watch) => {
        // Check if the event path matches the watched path
        if (event.path === watch.path || 
            (watch.recursive && event.path.startsWith(watch.path + "/"))) {
          try {
            watch.callback(event);
          } catch (error) {
            console.error(`[FileSystem] Error in watch callback for ${watch.path}:`, error);
          }
        }
      });
    }
  }, [maxRetries, processQueue]);

  useEffect(() => {
    isMountedRef.current = true;
    subscribe(subscriberId, handleMessage);
    return () => {
      isMountedRef.current = false;
      unsubscribe(subscriberId);
      pendingRequestsRef.current.forEach((pending) => {
        clearTimeout(pending.timeout);
        // Only reject if the component is still mounted to avoid unhandled promise rejections
        if (isMountedRef.current) {
          pending.reject(new Error("Component unmounted"));
        }
      });
      pendingRequestsRef.current.clear();
      
      // Unwatch all files on unmount
      fileWatchesRef.current.forEach((watch) => {
        sendJson({
          kind: "file_unwatch",
          requestId: ulid(),
          instanceId,
          path: watch.path,
        });
      });
      fileWatchesRef.current.clear();
    };
  }, [subscriberId, subscribe, unsubscribe, handleMessage, instanceId, sendJson]);

  const sendTaskInternal = useCallback(
    (
      request: Omit<FsTaskRequest, "requestId" | "instanceId">,
      resolve: (response: any) => void,
      reject: (error: Error) => void,
      retryCount: number = 0
    ) => {
      if (!isConnected) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      const requestId = ulid();
      const fullRequest: FsTaskRequest = {
        ...request,
        requestId,
        instanceId,
      };

      console.log(`[FileSystem] Sending ${request.kind} request ${requestId} (retry: ${retryCount})`);

      const timeoutHandle = setTimeout(() => {
        pendingRequestsRef.current.delete(requestId);
        setState(prev => ({ ...prev, pendingCount: pendingRequestsRef.current.size }));
        console.error(`[FileSystem] Request ${requestId} timed out after ${timeout}ms`);
        reject(new Error("Request timed out"));
        processQueue();
      }, timeout);

      pendingRequestsRef.current.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle,
        request,
        retryCount,
      });

      setState(prev => ({ ...prev, pendingCount: pendingRequestsRef.current.size }));

      const sent = sendJson(fullRequest);
      
      if (!sent) {
        clearTimeout(timeoutHandle);
        pendingRequestsRef.current.delete(requestId);
        setState(prev => ({ ...prev, pendingCount: pendingRequestsRef.current.size }));
        console.error(`[FileSystem] Failed to send request ${requestId}`);
        reject(new Error("Failed to send request"));
        processQueue();
      }
    },
    [isConnected, instanceId, sendJson, timeout, processQueue]
  );

  const sendTask = useCallback(
    (request: Omit<FsTaskRequest, "requestId" | "instanceId">): Promise<any> => {
      return new Promise((resolve, reject) => {
        // Check if we're at the rate limit
        if (pendingRequestsRef.current.size >= maxPending) {
          console.warn(`[FileSystem] Rate limit reached (${maxPending}), queueing request`);
          requestQueueRef.current.push({ request, resolve, reject, retryCount: 0 });
          return;
        }

        sendTaskInternal(request, resolve, reject, 0);
      });
    },
    [maxPending, sendTaskInternal]
  );

  const readFile = useCallback(
    async (
      path: string,
      options?: { offset?: number; limit?: number }
    ): Promise<{ content: string; encoding: string; size: number; truncated: boolean }> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await sendTask({
          kind: "file_read",
          path,
          offset: options?.offset,
          limit: options?.limit,
        });

        setState(prev => ({ ...prev, isLoading: false, error: null }));
        return {
          content: response.content ?? "",
          encoding: response.encoding ?? "utf8",
          size: response.size ?? 0,
          truncated: response.truncated ?? false,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to read file";
        setState(prev => ({ ...prev, isLoading: false, error: message }));
        throw error;
      }
    },
    [sendTask]
  );

  const writeFile = useCallback(
    async (
      path: string,
      content: string,
      options?: { encoding?: "utf8" | "base64"; mode?: string }
    ): Promise<void> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        await sendTask({
          kind: "file_write",
          path,
          content,
          encoding: options?.encoding ?? "utf8",
          mode: options?.mode,
        });

        setState(prev => ({ ...prev, isLoading: false, error: null }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to write file";
        setState(prev => ({ ...prev, isLoading: false, error: message }));
        throw error;
      }
    },
    [sendTask]
  );

  const createItem = useCallback(
    async (
      path: string,
      type: "file" | "dir",
      options?: { content?: string; mode?: string }
    ): Promise<FsNode | undefined> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await sendTask({
          kind: "file_create",
          path,
          type,
          content: options?.content,
          mode: options?.mode,
        });

        setState(prev => ({ ...prev, isLoading: false, error: null }));
        return response.node;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create item";
        setState(prev => ({ ...prev, isLoading: false, error: message }));
        throw error;
      }
    },
    [sendTask]
  );

  const deleteItem = useCallback(
    async (path: string, recursive = false): Promise<void> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        await sendTask({
          kind: "file_delete",
          path,
          recursive,
        });

        setState(prev => ({ ...prev, isLoading: false, error: null }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete item";
        setState(prev => ({ ...prev, isLoading: false, error: message }));
        throw error;
      }
    },
    [sendTask]
  );

  const listDirectory = useCallback(
    async (
      path: string,
      options?: { depth?: number; limit?: number; cursor?: string }
    ): Promise<{ node: FsNode; next_cursor?: string; has_more: boolean }> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await sendTask({
          kind: "file_tree",
          path,
          depth: options?.depth,
          limit: options?.limit,
          cursor: options?.cursor,
        });

        setState(prev => ({ ...prev, isLoading: false, error: null }));
        return {
          node: response.node ?? { path, name: "", type: "dir", size_bytes: 0, mod_time: "", mode: "", owner: "", group: "", uid: 0, gid: 0, readable: false, writable: false, executable: false, children: [] },
          next_cursor: response.next_cursor,
          has_more: response.has_more ?? false,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list directory";
        setState(prev => ({ ...prev, isLoading: false, error: message }));
        throw error;
      }
    },
    [sendTask]
  );

  const watchFile = useCallback(
    async (
      path: string,
      callback: FileWatchCallback,
      options?: { recursive?: boolean }
    ): Promise<void> => {
      // Check if already watching this path
      if (fileWatchesRef.current.has(path)) {
        console.warn(`[FileSystem] Already watching ${path}`);
        return;
      }

      try {
        await sendTask({
          kind: "file_watch",
          path,
          recursive: options?.recursive ?? false,
        });

        // Store the watch subscription
        fileWatchesRef.current.set(path, {
          path,
          callback,
          recursive: options?.recursive ?? false,
        });

        setState(prev => ({ ...prev, activeWatches: fileWatchesRef.current.size }));
        console.log(`[FileSystem] Watching ${path} (recursive: ${options?.recursive ?? false})`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to watch file";
        console.error(`[FileSystem] Failed to watch ${path}:`, message);
        throw error;
      }
    },
    [sendTask]
  );

  const unwatchFile = useCallback(
    async (path: string): Promise<void> => {
      const watch = fileWatchesRef.current.get(path);
      if (!watch) {
        console.warn(`[FileSystem] Not watching ${path}`);
        return;
      }

      try {
        await sendTask({
          kind: "file_unwatch",
          path,
        });

        fileWatchesRef.current.delete(path);
        setState(prev => ({ ...prev, activeWatches: fileWatchesRef.current.size }));
        console.log(`[FileSystem] Stopped watching ${path}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to unwatch file";
        console.error(`[FileSystem] Failed to unwatch ${path}:`, message);
        throw error;
      }
    },
    [sendTask]
  );

  return {
    isConnected,
    isLoading: state.isLoading,
    error: state.error,
    pendingCount: state.pendingCount,
    queueLength: requestQueueRef.current.length,
    activeWatches: state.activeWatches,
    readFile,
    writeFile,
    createItem,
    deleteItem,
    listDirectory,
    watchFile,
    unwatchFile,
  };
}
