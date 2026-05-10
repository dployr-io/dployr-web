// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useBilling } from "./use-billing";

const TIER: Record<string, number> = { hobby: 0, indie: 1, pro: 2 };

function tier(plan: string): number {
  return TIER[plan?.toLowerCase()] ?? 0;
}

export function usePlanFeatures() {
  const { billingStatus, isLoadingStatus } = useBilling();
  const plan = billingStatus?.plan ?? "hobby";
  const t = tier(plan);

  return {
    plan,
    isLoadingStatus,
    hasConsole: t >= 2,
    hasFileExplorer: t >= 2,
    hasWatchdog: t >= 2,
    hasSlackIntegrations: t >= 1,
  };
}
