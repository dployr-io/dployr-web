// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";

export interface ApiToken {
  id: string;
  name: string;
  scopes: string[];
  createdAt: number;
  expiresAt?: number | null;
  lastUsedAt?: number | null;
}

export interface CreatedApiToken extends ApiToken {
  token: string;
}

export interface SessionDevice {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  type: "desktop" | "mobile" | "tablet" | "unknown";
}

export interface SessionInfo {
  id: string;
  provider: string;
  createdAt: number;
  expiresAt: number;
  ip?: string;
  country?: string;
  device?: SessionDevice;
  current: boolean;
}

const BASE = import.meta.env.VITE_BASE_URL;

export function useSecurity() {
  const queryClient = useQueryClient();

  // ── Tokens ──────────────────────────────────────────────────────────────
  const { data: tokens, isLoading: isLoadingTokens } = useQuery<ApiToken[]>({
    queryKey: ["api-tokens"],
    queryFn: async () => {
      try {
        const res = await axios.get(`${BASE}/v1/auth/tokens`, { withCredentials: true });
        return res.data.data.items ?? [];
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load access tokens"));
        return [];
      }
    },
    staleTime: 60_000,
  });

  const createTokenMutation = useMutation({
    mutationFn: async (params: { name: string; scopes: string[]; expiresIn?: number }): Promise<CreatedApiToken> => {
      const res = await axios.post(`${BASE}/v1/auth/tokens`, params, { withCredentials: true });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to create token"));
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${BASE}/v1/auth/tokens/${id}`, { withCredentials: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
      toast.success("Token revoked");
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to revoke token"));
    },
  });

  // ── Sessions ─────────────────────────────────────────────────────────────
  const { data: sessions, isLoading: isLoadingSessions } = useQuery<SessionInfo[]>({
    queryKey: ["sessions"],
    queryFn: async () => {
      try {
        const res = await axios.get(`${BASE}/v1/auth/sessions`, { withCredentials: true });
        return res.data.data.sessions ?? [];
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to load sessions"));
        return [];
      }
    },
    staleTime: 60_000,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${BASE}/v1/auth/sessions/${id}`, { withCredentials: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session revoked");
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to revoke session"));
    },
  });

  const signOutAllMutation = useMutation({
    mutationFn: async () => {
      await axios.get(`${BASE}/v1/auth/logout`, { withCredentials: true });
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to sign out"));
    },
  });

  return {
    tokens: tokens ?? [],
    isLoadingTokens,
    createToken: createTokenMutation,
    revokeToken: revokeTokenMutation,
    sessions: sessions ?? [],
    isLoadingSessions,
    revokeSession: revokeSessionMutation,
    signOutAll: signOutAllMutation,
  };
}
