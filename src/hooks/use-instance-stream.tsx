// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useClusterId } from "./use-cluster-id";
import { useQueryClient } from "@tanstack/react-query";
import type { NormalizedInstanceData } from "@/types";
import { persistCacheToStorage, persistMemoryProfiles } from "@/lib/query-cache-persistence";

import { createDefaultNormalizedData } from "@/types/schemas/normalized";
import {
  normalizeNode,
  normalizeStatus,
  normalizeHealth,
  normalizeResources,
  normalizeWorkloads,
  normalizeProxy,
  normalizeProcesses,
  normalizeFilesystem,
  normalizeDiagnostics,
} from "@/types/schemas/normalizers/from-v1.1";

export type StreamConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

type MessageHandler = (message: unknown) => void;

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
}

export function InstanceStreamProvider({ children }: InstanceStreamProviderProps) {
  const clusterId = useClusterId();
  const queryClient = useQueryClient();

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retriesRef = useRef(0);
  const closeRequestedRef = useRef(false);
  const handlersRef = useRef<Map<string, MessageHandler>>(new Map());
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientVersionsRef = useRef<Record<string, Record<string, number>>>({});
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Stable ref so connect() always has latest clusterId without being in deps
  const clusterIdRef = useRef(clusterId);
  const applyDeltaRef = useRef<typeof applyDelta>(null!);

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

  const applyDelta = useCallback(
    (instanceId: string, sections: Record<string, { data: unknown; version: number }>) => {
      const existing = queryClient.getQueryData<NormalizedInstanceData>(["instance-status", instanceId]);
      const base = existing ?? { ...createDefaultNormalizedData(), instance: { tag: instanceId } };
      const updated: NormalizedInstanceData = { ...base };

      for (const [section, { data, version }] of Object.entries(sections)) {
        switch (section) {
          case "node":
            updated.node = normalizeNode(data as any);
            break;
          case "status":
            updated.status = normalizeStatus(data as any);
            break;
          case "health":
            updated.health = normalizeHealth(data as any);
            break;
          case "resources": {
            const rawRes = data as any;
            const nr = normalizeResources(rawRes);
            const prev = (existing ?? base).resources;
            // Preserve existing sub-fields absent from this delta to avoid flicker
            updated.resources = {
              cpu: rawRes?.cpu !== undefined ? nr.cpu : (prev?.cpu ?? null),
              memory: rawRes?.memory !== undefined ? nr.memory : (prev?.memory ?? null),
              swap: rawRes?.swap !== undefined ? nr.swap : (prev?.swap ?? null),
              disks: rawRes?.disks !== undefined ? nr.disks : (prev?.disks ?? []),
            };
            break;
          }
          case "workloads":
            updated.workloads = normalizeWorkloads(data as any);
            break;
          case "proxy":
            updated.proxy = normalizeProxy(data as any);
            break;
          case "processes":
            updated.processes = normalizeProcesses(data as any);
            break;
          case "filesystem":
            updated.filesystem = normalizeFilesystem(data as any);
            break;
          case "diagnostics":
            updated.diagnostics = normalizeDiagnostics(data as any);
            break;
        }
        const instanceVersions = clientVersionsRef.current[instanceId] ?? {};
        instanceVersions[section] = version;
        clientVersionsRef.current[instanceId] = instanceVersions;
      }

      queryClient.setQueryData<NormalizedInstanceData>(["instance-status", instanceId], updated);

      // Only sync services/deployments when this delta actually contained a workloads section.
      // Spreading `base` always gives us a workloads ref, so checking `updated.workloads` alone
      // would run on every resource/status delta and could overwrite good data with a stale ref.
      if ("workloads" in sections && updated.workloads) {
        const newServices = updated.workloads.services;
        const newDeployments = updated.workloads.deployments;

        const existingServices = queryClient.getQueryData<{ name: string; id: string }[]>(["instance", instanceId, "services"]);

        if (newServices.length > 0) {
          // Preserve the DB IDs that the heartbeat path already established.
          // PS: ULIDs of entities from Nodes may drift after re-provision
          const finalServices = existingServices?.length
            ? (() => {
                const idByName = new Map(existingServices.map(s => [s.name, s.id]));
                return newServices.map(s => ({ ...s, id: idByName.get(s.name) ?? s.id }));
              })()
            : newServices;
          queryClient.setQueryData(["instance", instanceId, "services"], finalServices);
        } else {
          queryClient.setQueryData(["instance", instanceId, "services"], newServices);
        }

        const existingDeployments = queryClient.getQueryData<any[]>(["instance", instanceId, "deployments"]) ?? [];
        if (newDeployments.length > 0 || !existingDeployments.length) {
          const newNames = new Set(newDeployments.map((d: any) => d.name));
          const ghostsToKeep = existingDeployments.filter(
            (d: any) => (d.status === "pending" || d.status === "running") && !newNames.has(d.name)
          );
          queryClient.setQueryData(["instance", instanceId, "deployments"], [...newDeployments, ...ghostsToKeep]);
        }
      }
    },
    [queryClient]
  );

  // Keep ref in sync so connect() always uses latest applyDelta
  applyDeltaRef.current = applyDelta;

  // connect() is defined outside useEffect so it can call itself recursively
  // on reconnect without stale closures from the original socket.
  const connect = useCallback(() => {
    const cId = clusterIdRef.current;
    if (closeRequestedRef.current || !cId) return;

    setState("connecting");

    const base = import.meta.env.VITE_BASE_URL || "";
    const wsBase = base.replace(/^http/i, "ws");
    const url = `${wsBase}/v1/instances/stream?clusterId=${encodeURIComponent(cId)}`;

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      retriesRef.current = 0;
      setIsConnected(true);
      setError(null);
      setState("open");

      // Clear stale version tracking so base sends full fresh state
      clientVersionsRef.current = {};
      socket.send(JSON.stringify({ kind: "heartbeat", versions: {} }));

      // 30s heartbeat — always references THIS socket via closure
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ kind: "heartbeat", versions: clientVersionsRef.current }));
        }
      }, 30_000);
    };

    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data as string);

        if (message.kind === "error") {
          const errorMsg = message.message || "An error occurred";
          const errorCode = message.code ? `[${message.code}] ` : "";
          setError(`${errorCode}${errorMsg}`);
        }

        if (message.kind === "delta-update" || message.kind === "update") {
          const instanceId = message.instanceId as string;
          const sections = message.sections as Record<string, { data: unknown; version: number }>;
          if (instanceId && sections) {
            applyDeltaRef.current(instanceId, sections);
            if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
            persistTimeoutRef.current = setTimeout(() => {
              persistCacheToStorage(queryClient);
              persistMemoryProfiles();
              persistTimeoutRef.current = null;
            }, 500);
          }
        }

        // Base signals that services or deployments changed — reset versions and
        // request a fresh sync so the client gets the latest workload state.
        if (message.kind === "refresh") {
          clientVersionsRef.current = {};
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ kind: "heartbeat", versions: {} }));
          }
        }

        handlersRef.current.forEach(handler => {
          try {
            handler(message);
          } catch {}
        });
      } catch {}
    };

    socket.onerror = () => {
      setIsConnected(false);
      setState("error");
    };

    socket.onclose = () => {
      setIsConnected(false);
      setState("closed");

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (closeRequestedRef.current) return;

      // Reconnect indefinitely — no maxRetries cap.
      // The backoff caps at 10s so this is safe.
      const attempt = ++retriesRef.current;
      const delay = defaultReconnectDelayMs(attempt);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect(); // fresh socket, fresh handlers — no stale closure
      }, delay);
    };
  }, [queryClient, clearReconnectTimeout]);

  useEffect(() => {
    clusterIdRef.current = clusterId;

    if (!clusterId) {
      closeRequestedRef.current = true;
      clearReconnectTimeout();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
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

    closeRequestedRef.current = false;
    clearReconnectTimeout();
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } finally {
        socketRef.current = null;
      }
    }

    connect();

    return () => {
      closeRequestedRef.current = true;
      clearReconnectTimeout();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } finally {
          socketRef.current = null;
        }
      }
    };
  }, [clusterId, connect, clearReconnectTimeout]);

  const value = useMemo<InstanceStreamContextValue>(() => ({ isConnected, state, error, sendJson, subscribe, unsubscribe }), [isConnected, state, error, sendJson, subscribe, unsubscribe]);

  return <InstanceStreamContext.Provider value={value}>{children}</InstanceStreamContext.Provider>;
}

export function useInstanceStream() {
  const context = useContext(InstanceStreamContext);
  if (!context) {
    throw new Error("useInstanceStream must be used within an InstanceStreamProvider");
  }
  return context;
}
