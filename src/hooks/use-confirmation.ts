// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";

export function useConfirmation() {
  const [pendingAction, setPendingAction] = useState<any>();

  return {
    pendingAction,
    setPendingAction
  }
}
