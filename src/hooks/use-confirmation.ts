import type { PendingAction } from "@/types";
import { useState } from "react";

export function useConfirmation() {
  const [pendingAction, setPendingAction] = useState<PendingAction>();

  return {
    pendingAction,
    setPendingAction
  }
}
