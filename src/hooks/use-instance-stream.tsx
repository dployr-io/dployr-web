// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useClusterId } from "./use-cluster-id";
import { useQueryClient } from "@tanstack/react-query";
import type { InstanceStream } from "@/types";
import { persistCacheToStorage } from "@/lib/query-cache-persistence";

export type StreamConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

export interface StreamMessage {
  kind: string;
  [key: string]: unknown;
}

type MessageHandler = (message: StreamMessage) => void;

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
        const message = JSON.parse(event.data as string) as StreamMessage;
        
        if (message.kind === "update") {
          const data = message as unknown as InstanceStream;
          const instanceId = (data?.update as any)?.instance_id;
          if (instanceId) {
            queryClient.setQueryData<InstanceStream>(["instance-status", instanceId], data);
            
            // Debounce 
            if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
            persistTimeoutRef.current = setTimeout(() => {
              persistCacheToStorage(queryClient);
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
      setError("WebSocket error occurred");
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
