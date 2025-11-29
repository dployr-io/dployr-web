// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { PendingAction } from "@/types";
import { useState } from "react";

export function useConfirmation() {
  const [pendingAction, setPendingAction] = useState<PendingAction>();

  return {
    pendingAction,
    setPendingAction
  }
}
