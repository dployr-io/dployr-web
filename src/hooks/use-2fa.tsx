// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";

const BASE = import.meta.env.VITE_BASE_URL;

export type TwoFaMethod = "email" | "totp";

export interface TwoFaStatus {
  method: TwoFaMethod;
  totpEnabled: boolean;
  backupCodesRemaining: number;
}

async function fetchStatus(): Promise<TwoFaStatus> {
  const res = await axios.get(`${BASE}/v1/auth/2fa/status`, { withCredentials: true });
  return res.data.data;
}

export function use2FAStatus() {
  return useQuery<TwoFaStatus>({
    queryKey: ["2fa-status"],
    queryFn: fetchStatus,
    staleTime: 60_000,
  });
}

interface Use2FAOptions {
  enabled?: boolean;
}

export function use2FA(options: Use2FAOptions = {}) {
  const { enabled = false } = options;
  const queryClient = useQueryClient();
  const { data: status } = use2FAStatus();

  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const sendEmailCode = useCallback(async () => {
    setIsSending(true);
    try {
      await axios.post(`${BASE}/v1/auth/2fa/email/send`, {}, { withCredentials: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send code"));
      throw error;
    } finally {
      setIsSending(false);
    }
  }, []);

  const verify = useCallback(async (code: string) => {
    setIsVerifying(true);
    try {
      await axios.post(`${BASE}/v1/auth/2fa/verify`, { code }, { withCredentials: true });

      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }

      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Invalid or expired code"));
    } finally {
      setIsVerifying(false);
    }
  }, [pendingAction, queryClient]);

  const requireAuth = useCallback((action: () => void) => {
    if (enabled) {
      setPendingAction(() => action);
      setIsOpen(true);
    } else {
      action();
    }
  }, [enabled]);

  const cancel = useCallback(() => {
    setIsOpen(false);
    setPendingAction(null);
  }, []);

  return {
    isOpen,
    isSending,
    isVerifying,
    method: status?.method ?? "email",
    verify,
    sendEmailCode,
    requireAuth,
    cancel,
    setIsOpen,
  };
}

export function use2FASetup() {
  const queryClient = useQueryClient();

  const setupMutation = useMutation({
    mutationFn: async (): Promise<{ secret: string; uri: string }> => {
      const res = await axios.get(`${BASE}/v1/auth/2fa/totp/setup`, { withCredentials: true });
      return res.data.data;
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to start TOTP setup"));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (code: string): Promise<{ backupCodes: string[] }> => {
      const res = await axios.post(`${BASE}/v1/auth/2fa/totp/confirm`, { code }, { withCredentials: true });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    },
    onError: (error: any) => {
      throw new Error(getApiErrorMessage(error, "Invalid code"));
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (code: string): Promise<void> => {
      await axios.delete(`${BASE}/v1/auth/2fa/totp`, {
        data: { code },
        withCredentials: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
      toast.success("Authenticator app removed");
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to disable TOTP"));
    },
  });

  const regenerateCodesMutation = useMutation({
    mutationFn: async (code: string): Promise<{ backupCodes: string[] }> => {
      const res = await axios.post(
        `${BASE}/v1/auth/2fa/backup-codes/regenerate`,
        { code },
        { withCredentials: true },
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to regenerate backup codes"));
    },
  });

  return {
    setup: setupMutation,
    confirm: confirmMutation,
    disable: disableMutation,
    regenerateCodes: regenerateCodesMutation,
  };
}
