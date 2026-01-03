// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState } from "react";

export type WebSocketConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

export interface UseWebSocketOptions {
  url?: string;
  enabled?: boolean;
  maxRetries?: number;
  shouldReconnect?: (evt: CloseEvent) => boolean;
  getReconnectDelayMs?: (attempt: number) => number;
  onOpen?: (socket: WebSocket) => void;
  onMessage?: (event: MessageEvent, socket: WebSocket) => void;
  onError?: (event: Event, socket: WebSocket) => void;
  onClose?: (event: CloseEvent) => void;
}

const defaultReconnectDelayMs = (attempt: number) => {
  const cappedAttempt = Math.max(1, attempt);
  if (cappedAttempt <= 3) return 1000;
  return Math.min(1000 * Math.pow(2, cappedAttempt - 3), 10000);
};

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    enabled = true,
    maxRetries = 5,
    shouldReconnect,
    getReconnectDelayMs = defaultReconnectDelayMs,
    onOpen,
    onMessage,
    onError,
    onClose,
  } = options;

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retriesRef = useRef(0);
  const closeRequestedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [state, setState] = useState<WebSocketConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
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
    setState("closed");
  }, [clearReconnectTimeout]);

  const connect = useCallback(() => {
    if (!enabled || !url) return;

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

    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        retriesRef.current = 0;
        setIsConnected(true);
        setError(null);
        setState("open");
        onOpen?.(socket);
      };

      socket.onmessage = event => {
        onMessage?.(event, socket);
      };

      socket.onerror = event => {
        setIsConnected(false);
        // setError("WebSocket error occurred");
        setState("error");
        onError?.(event, socket);
      };

      socket.onclose = evt => {
        setIsConnected(false);
        setState("closed");
        onClose?.(evt);

        if (closeRequestedRef.current) return;

        if (typeof shouldReconnect === "function" && !shouldReconnect(evt)) {
          return;
        }

        if (retriesRef.current >= maxRetries) {
          setError("Connection lost. Max retries exceeded.");
          return;
        }

        const attempt = retriesRef.current + 1;
        const delay = getReconnectDelayMs(attempt);
        retriesRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch (connectError) {
      setError((connectError as Error).message || "Failed to connect");
      setIsConnected(false);
      setState("error");
    }
  }, [clearReconnectTimeout, enabled, getReconnectDelayMs, maxRetries, onClose, onError, onMessage, onOpen, shouldReconnect, url]);

  const send = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;

    try {
      socket.send(data);
      return true;
    } catch {
      return false;
    }
  }, []);

  const sendJson = useCallback((data: unknown) => {
    return send(JSON.stringify(data));
  }, [send]);

  useEffect(() => {
    if (!enabled || !url) {
      disconnect();
      return;
    }

    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled, url]);

  return {
    socket: socketRef,
    isConnected,
    state,
    error,
    connect,
    disconnect,
    send,
    sendJson,
  };
}
