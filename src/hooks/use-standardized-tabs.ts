// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import { useQueryStates, parseAsStringLiteral } from "nuqs";
import type { LogLevel, LogTimeRange } from "@/types";

const LOG_RANGES = ["live", "5m", "15m", "30m", "1h", "3h", "6h", "12h", "24h"] as const;
const LOG_LEVELS = ["ALL", "DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY"] as const;

export type TabValue = string;

export interface TabsState<T extends TabValue> {
  tab: T;
  logRange?: LogTimeRange;
  logLevel?: "ALL" | LogLevel;
  duration?: LogTimeRange;
}

export interface TabsActions<T extends TabValue> {
  setTab: (tab: T) => void;
  setLogRange: (range: LogTimeRange) => void;
  setLogLevel: (level: "ALL" | LogLevel) => void;
  setTabState: (state: Partial<TabsState<T>>) => void;
}

export function useStandardizedTabs<T extends TabValue>(
  validTabs: readonly T[],
  defaultTab: T
) {
  const [state, setState] = useQueryStates({
    tab: parseAsStringLiteral(validTabs as unknown as string[]).withDefault(defaultTab),
    logRange: parseAsStringLiteral(LOG_RANGES).withDefault("live"),
    logLevel: parseAsStringLiteral(LOG_LEVELS).withDefault("ALL"),
    duration: parseAsStringLiteral(LOG_RANGES).withDefault("live"),
  });

  const currentTab = (state.tab || defaultTab) as T;
  const logTimeRange = (state.logRange || "live") as LogTimeRange;
  const selectedLogLevel = (state.logLevel || "ALL") as "ALL" | LogLevel;
  const logDuration = (state.duration || state.logRange || "live") as LogTimeRange;

  const setTab = useCallback(
    (tab: T) => setState({ tab }),
    [setState]
  );

  const setLogRange = useCallback(
    (range: LogTimeRange) => setState({ logRange: range, duration: range }),
    [setState]
  );

  const setLogLevel = useCallback(
    (level: "ALL" | LogLevel) => setState({ logLevel: level }),
    [setState]
  );

  const setTabState = useCallback(
    (partial: Partial<TabsState<T>>) => setState(partial as any),
    [setState]
  );

  return {
    currentTab,
    logTimeRange,
    selectedLogLevel,
    logDuration,
    setTab,
    setLogRange,
    setLogLevel,
    setTabState,
    rawState: state,
    setRawState: setState,
  };
}

export const DEPLOYMENT_TABS = ["logs", "blueprint"] as const;
export const SERVICE_TABS = ["overview", "env", "blueprint"] as const;
export const INSTANCE_TABS = ["overview", "system", "files", "config", "logs", "advanced"] as const;

export type DeploymentTab = typeof DEPLOYMENT_TABS[number];
export type ServiceTab = typeof SERVICE_TABS[number];
export type InstanceTab = typeof INSTANCE_TABS[number];

export function useDeploymentTabs() {
  return useStandardizedTabs(DEPLOYMENT_TABS, "logs");
}

export function useServiceTabs() {
  return useStandardizedTabs(SERVICE_TABS, "overview");
}

export function useInstanceTabs() {
  return useStandardizedTabs(INSTANCE_TABS, "overview");
}
