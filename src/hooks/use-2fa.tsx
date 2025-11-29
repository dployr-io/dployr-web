// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";

interface Use2FAOptions {
  enabled?: boolean;
}

export function use2FA(options: Use2FAOptions = {}) {
  const { enabled = false } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const verify = async (code: string) => {
    setIsVerifying(true);
    try {
      if (code.length < 4) {
        throw new Error("Invalid code. Please check and try again.");
      }

      // TODO: Implement code validation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Execute pending action after successful verification
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }

      setIsOpen(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const requireAuth = (action: () => void) => {
    if (enabled) {
      setPendingAction(() => action);
      setIsOpen(true);
    } else {
      action();
    }
  };

  const cancel = () => {
    setIsOpen(false);
    setPendingAction(null);
  };

  return {
    isOpen,
    isVerifying,
    verify,
    requireAuth,
    cancel,
    setIsOpen,
  };
}
