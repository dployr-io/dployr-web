// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { LogLevel, LogStreamMode, LogTimeRange } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const { instanceName, path } = options;
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
    return () => stopStreaming();
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
  deploymentName: string | undefined,
  instanceName: string | undefined,
  tabState: {
    currentTab: string;
    logTimeRange: LogTimeRange;
    selectedLogLevel: "ALL" | LogLevel;
    logDuration: LogTimeRange;
  }
) {
  const stablePath = useRef(deploymentName || deploymentId || "");
  const stableInstance = useRef(instanceName);
  const resolvedPath = deploymentName || deploymentId || stablePath.current;
  if (resolvedPath) stablePath.current = resolvedPath;
  if (instanceName) stableInstance.current = instanceName;

  return useStandardizedLogs(
    { instanceName: stableInstance.current, path: stablePath.current },
    tabState,
    "logs"
  );
}

export function useServiceLogs(
  serviceId: string | undefined,
  serviceName: string | undefined,
  instanceName: string | undefined,
  tabState: {
    currentTab: string;
    logTimeRange: LogTimeRange;
    selectedLogLevel: "ALL" | LogLevel;
    logDuration: LogTimeRange;
  }
) {
  const stablePath = useRef(serviceName || serviceId || "");
  const stableInstance = useRef(instanceName);
  const resolvedPath = serviceName || serviceId || stablePath.current;
  if (resolvedPath) stablePath.current = resolvedPath;
  if (instanceName) stableInstance.current = instanceName;

  return useStandardizedLogs(
    { instanceName: stableInstance.current, path: stablePath.current },
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
