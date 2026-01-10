// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { LogLevel, LogStreamMode, LogTimeRange } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { useLogs } from "@/hooks/use-instance-logs";

export interface StandardizedLogsOptions {
  instanceName?: string;
  path: string;
  initialMode?: LogStreamMode;
}

export function useStandardizedLogs(
  options: StandardizedLogsOptions,
  tabState: {
    currentTab: string;
    logTimeRange: LogTimeRange;
    selectedLogLevel: "ALL" | LogLevel;
    logDuration: LogTimeRange;
  },
  logsTabName: string = "logs"
) {
  const { instanceName, path, initialMode = "tail" } = options;
  const { currentTab, logDuration, selectedLogLevel } = tabState;

  const [isAtBottom, setIsAtBottom] = useState(true);
  const logMode: LogStreamMode = isAtBottom ? "tail" : "historical";

  const {
    logs,
    filteredLogs,
    searchQuery,
    logsEndRef,
    isStreaming,
    setSearchQuery,
    startStreaming,
    stopStreaming,
  } = useLogs({
    instanceName,
    path,
    initialMode: logMode,
    duration: logDuration,
    selectedLevel: selectedLogLevel,
  });

  const handleScrollPositionChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, []);

  useEffect(() => {
    if (currentTab === logsTabName && path) {
      startStreaming();
    } else {
      stopStreaming();
    }
  }, [currentTab, path, startStreaming, stopStreaming, logsTabName]);

  return {
    logs,
    filteredLogs,
    searchQuery,
    logsEndRef,
    isStreaming,
    isAtBottom,
    logMode,
    setSearchQuery,
    startStreaming,
    stopStreaming,
    handleScrollPositionChange,
  };
}

export function useDeploymentLogs(
  deploymentId: string | undefined,
  instanceName: string | undefined,
  tabState: {
    currentTab: string;
    logTimeRange: LogTimeRange;
    selectedLogLevel: "ALL" | LogLevel;
    logDuration: LogTimeRange;
  }
) {
  return useStandardizedLogs(
    {
      instanceName,
      path: deploymentId || "",
    },
    tabState,
    "logs"
  );
}

export function useInstanceLogs(
  instanceName: string | undefined,
  logType: "app" | "install",
  tabState: {
    currentTab: string;
    logTimeRange: LogTimeRange;
    selectedLogLevel: "ALL" | LogLevel;
    logDuration: LogTimeRange;
  }
) {
  return useStandardizedLogs(
    {
      instanceName,
      path: logType,
    },
    tabState,
    "logs"
  );
}
