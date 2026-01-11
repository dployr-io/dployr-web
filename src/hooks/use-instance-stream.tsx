// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useClusterId } from "./use-cluster-id";
import { useQueryClient } from "@tanstack/react-query";
import type { InstanceStream, NormalizedInstanceData } from "@/types";
import { persistCacheToStorage, persistMemoryProfiles } from "@/lib/query-cache-persistence";
import { useUrlState } from "./use-url-state";
import { normalizeInstanceUpdate } from "@/lib/instance-update";

export type StreamConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

type MessageHandler = (message: InstanceStream) => void;

interface InstanceStreamContextValue {
  isConnected: boolean;
  state: StreamConnectionState;
  error: string | null;
  sendJson: (data: unknown) => boolean;
  subscribe: (id: string, handler: MessageHandler) => void;
  unsubscribe: (id: string) => void;
}

const InstanceStreamContext = createContext<InstanceStreamContextValue | null>(null);

const defaultReconnectDelayMs = (attempt: number) => {
  const cappedAttempt = Math.max(1, attempt);
  if (cappedAttempt <= 3) return 1000;
  return Math.min(1000 * Math.pow(2, cappedAttempt - 3), 10000);
};

interface InstanceStreamProviderProps {
  children: ReactNode;
  maxRetries?: number;
}

export function InstanceStreamProvider({ children, maxRetries = 5 }: InstanceStreamProviderProps) {
  const clusterId = useClusterId();
  const queryClient = useQueryClient();
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retriesRef = useRef(0);
  const closeRequestedRef = useRef(false);
  const handlersRef = useRef<Map<string, MessageHandler>>(new Map());
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [state, setState] = useState<StreamConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);


  const sendJson = useCallback((data: unknown): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    try {
      socket.send(JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }, []);

  const subscribe = useCallback((id: string, handler: MessageHandler) => {
    handlersRef.current.set(id, handler);
  }, []);

  const unsubscribe = useCallback((id: string) => {
    handlersRef.current.delete(id);
  }, []);

  useEffect(() => {
    if (!clusterId) {
      closeRequestedRef.current = true;
      clearReconnectTimeout();

      if (socketRef.current) {
        try {
          socketRef.current.close();
        } finally {
          socketRef.current = null;
        }
      }

      retriesRef.current = 0;
      setIsConnected(false);
      setState("idle");
      return;
    }

    // Connect
    closeRequestedRef.current = false;
    clearReconnectTimeout();

    if (socketRef.current) {
      try {
        socketRef.current.close();
      } finally {
        socketRef.current = null;
      }
    }

    setState("connecting");

    const base = import.meta.env.VITE_BASE_URL || "";
    const wsBase = base.replace(/^http/i, "ws");
    const url = `${wsBase}/v1/instances/stream?clusterId=${encodeURIComponent(clusterId)}`;

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      retriesRef.current = 0;
      setIsConnected(true);
      setError(null);
      setState("open");
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);

        if (message.kind === "error") {
          console.error('[WebSocket] Error message received:', message);
          const errorMsg = message.message || 'An error occurred';
          const errorCode = message.code ? `[${message.code}] ` : '';
          setAppError({
            appError: {
              message: `${errorCode}${errorMsg}`,
              helpLink: "",
            },
          });
        }
        
        if (message.kind === "update") {
          console.log("[WebSocket] Update message received:", message);

          const data = message as InstanceStream;
          const update = data.update;
          const instanceId = update?.instance_id;
          
          if (instanceId) {
            const instancesData = queryClient.getQueryData<any>(["instances", clusterId, 1, 8]);
            const instance = instancesData?.items?.find((i: any) => i.tag === instanceId);
            const normalizedUpdate = normalizeInstanceUpdate(update);

            // Ensure we have a complete normalized object and add instance information
            if (normalizedUpdate) {
              const updateWithInstance: NormalizedInstanceData = {
                ...normalizedUpdate,
                instance: {
                  tag: instance?.tag || "",
                }
              };
              
              queryClient.setQueryData<NormalizedInstanceData | null>(["instance-status", instanceId], updateWithInstance);
            }
            
            // Debounce cache persistence
            if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
            persistTimeoutRef.current = setTimeout(() => {
              persistCacheToStorage(queryClient);
              persistMemoryProfiles();
              persistTimeoutRef.current = null;
            }, 500);
          }
        }
        
        handlersRef.current.forEach((handler) => {
          try {
            handler(message);
          } catch (handlerError) {
            console.error("Error in message handler:", handlerError);
          }
        });
      } catch (parseError) {
        console.error("Failed to parse WebSocket message:", parseError);
      }
    };

    socket.onerror = () => {
      setIsConnected(false);
      setState("error");
    };

    socket.onclose = () => {
      setIsConnected(false);
      setState("closed");

      if (closeRequestedRef.current) return;

      if (retriesRef.current >= maxRetries) {
        setError("Connection lost. Max retries exceeded.");
        return;
      }

      const attempt = retriesRef.current + 1;
      const delay = defaultReconnectDelayMs(attempt);
      retriesRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        if (!closeRequestedRef.current && clusterId) {
          const reconnectSocket = new WebSocket(url);
          socketRef.current = reconnectSocket;
          
          reconnectSocket.onopen = socket.onopen;
          reconnectSocket.onmessage = socket.onmessage;
          reconnectSocket.onerror = socket.onerror;
          reconnectSocket.onclose = socket.onclose;
        }
      }, delay);
    };

    return () => {
      closeRequestedRef.current = true;
      clearReconnectTimeout();

      if (socketRef.current) {
        try {
          socketRef.current.close();
        } finally {
          socketRef.current = null;
        }
      }
    };
  }, [clusterId, maxRetries, clearReconnectTimeout]);

  const value: InstanceStreamContextValue = {
    isConnected,
    state,
    error,
    sendJson,
    subscribe,
    unsubscribe,
  };

  return (
    <InstanceStreamContext.Provider value={value}>
      {children}
    </InstanceStreamContext.Provider>
  );
}

export function useInstanceStream() {
  const context = useContext(InstanceStreamContext);
  if (!context) {
    throw new Error("useInstanceStream must be used within an InstanceStreamProvider");
  }
  return context;
}
