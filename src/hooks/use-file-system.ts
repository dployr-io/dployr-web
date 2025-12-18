// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useInstanceStream } from "./use-instance-stream";
import type { FsTaskRequest, FsTaskResponse, FsNode } from "@/types";

interface PendingTask {
  resolve: (response: FsTaskResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface FileSystemState {
  isLoading: boolean;
  error: string | null;
}

interface UseFileSystemOptions {
  instanceId: string;
  timeout?: number;
}

export function useFileSystem({ instanceId, timeout = 30000 }: UseFileSystemOptions) {
  const subscriberId = useId();
  const { isConnected, sendJson, subscribe, unsubscribe } = useInstanceStream();
  const pendingTasksRef = useRef<Map<string, PendingTask>>(new Map());
  const taskCounterRef = useRef(0);

  const [state, setState] = useState<FileSystemState>({
    isLoading: false,
    error: null,
  });

  const generateTaskId = useCallback(() => {
    taskCounterRef.current += 1;
    return `fs-${instanceId}-${Date.now()}-${taskCounterRef.current}`;
  }, [instanceId]);

  const handleMessage = useCallback((message: { kind: string; [key: string]: unknown }) => {
    if (message.kind !== "fs_result") return;

    const response = message as unknown as FsTaskResponse;
    const pending = pendingTasksRef.current.get(response.taskId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingTasksRef.current.delete(response.taskId);
      pending.resolve(response);
    }
  }, []);

  useEffect(() => {
    subscribe(subscriberId, handleMessage);
    return () => {
      unsubscribe(subscriberId);
      // Clear all pending tasks on unmount
      pendingTasksRef.current.forEach((pending) => {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Component unmounted"));
      });
      pendingTasksRef.current.clear();
    };
  }, [subscriberId, subscribe, unsubscribe, handleMessage]);

  const sendTask = useCallback(
    (request: Omit<FsTaskRequest, "taskId" | "instanceId">): Promise<FsTaskResponse> => {
      return new Promise((resolve, reject) => {
        if (!isConnected) {
          reject(new Error("WebSocket not connected"));
          return;
        }

        const taskId = generateTaskId();
        const fullRequest: FsTaskRequest = {
          ...request,
          taskId,
          instanceId,
        };

        const timeoutHandle = setTimeout(() => {
          pendingTasksRef.current.delete(taskId);
          reject(new Error("Task timed out"));
        }, timeout);

        pendingTasksRef.current.set(taskId, {
          resolve,
          reject,
          timeout: timeoutHandle,
        });

        const sent = sendJson(fullRequest);
        if (!sent) {
          clearTimeout(timeoutHandle);
          pendingTasksRef.current.delete(taskId);
          reject(new Error("Failed to send task"));
        }
      });
    },
    [isConnected, instanceId, generateTaskId, sendJson, timeout]
  );

  const readFile = useCallback(
    async (path: string): Promise<{ content: string; encoding: string }> => {
      setState({ isLoading: true, error: null });

      try {
        const response = await sendTask({
          kind: "fs_read",
          path,
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to read file");
        }

        setState({ isLoading: false, error: null });
        return {
          content: response.data?.content ?? "",
          encoding: response.data?.encoding ?? "utf8",
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to read file";
        setState({ isLoading: false, error: message });
        throw error;
      }
    },
    [sendTask]
  );

  const writeFile = useCallback(
    async (path: string, content: string, encoding: "utf8" | "base64" = "utf8"): Promise<void> => {
      setState({ isLoading: true, error: null });

      try {
        const response = await sendTask({
          kind: "fs_write",
          path,
          content,
          encoding,
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to write file");
        }

        setState({ isLoading: false, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to write file";
        setState({ isLoading: false, error: message });
        throw error;
      }
    },
    [sendTask]
  );

  const createItem = useCallback(
    async (path: string, type: "file" | "dir"): Promise<FsNode | undefined> => {
      setState({ isLoading: true, error: null });

      try {
        const response = await sendTask({
          kind: "fs_create",
          path,
          type,
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to create item");
        }

        setState({ isLoading: false, error: null });
        return response.data?.node;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create item";
        setState({ isLoading: false, error: message });
        throw error;
      }
    },
    [sendTask]
  );

  const deleteItem = useCallback(
    async (path: string, recursive = false): Promise<void> => {
      setState({ isLoading: true, error: null });

      try {
        const response = await sendTask({
          kind: "fs_delete",
          path,
          recursive,
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to delete item");
        }

        setState({ isLoading: false, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete item";
        setState({ isLoading: false, error: message });
        throw error;
      }
    },
    [sendTask]
  );

  const listDirectory = useCallback(
    async (path: string): Promise<FsNode[]> => {
      setState({ isLoading: true, error: null });

      try {
        const response = await sendTask({
          kind: "fs_list",
          path,
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to list directory");
        }

        setState({ isLoading: false, error: null });
        return response.data?.nodes ?? [];
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list directory";
        setState({ isLoading: false, error: message });
        throw error;
      }
    },
    [sendTask]
  );

  return {
    isConnected,
    isLoading: state.isLoading,
    error: state.error,
    readFile,
    writeFile,
    createItem,
    deleteItem,
    listDirectory,
  };
}
