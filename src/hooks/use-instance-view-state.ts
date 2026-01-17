// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useReducer } from "react";
import type { LogStreamMode, LogType } from "@/types";

interface InstanceViewState {
  bootstrapToken: string | null;
  rotateOpen: boolean;
  rotateValue: string;
  rotateError: string;
  isRotating: boolean;
  rotatedToken: string | null;
  showBootstrapInfo: boolean;
  isInstalling: boolean;
  isRestarting: boolean;
  restartOpen: boolean;
  rebootOpen: boolean;
  forceRestart: boolean;
  forceReboot: boolean;
  logType: LogType;
  logMode: LogStreamMode;
  isAtBottom: boolean;
  lockedTimestamp: number | null;
  isHistoricalMode: boolean;
}

type InstanceViewAction =
  | { type: "SET_FIELD"; payload: { field: keyof InstanceViewState; value: InstanceViewState[keyof InstanceViewState] } }
  | { type: "SET_FIELDS"; payload: Partial<InstanceViewState> }
  | { type: "RESET_ROTATE_DIALOG" }
  | { type: "RESET_RESTART_DIALOG" }
  | { type: "RESET_REBOOT_DIALOG" };

const initialState: InstanceViewState = {
  bootstrapToken: null,
  rotateOpen: false,
  rotateValue: "",
  rotateError: "",
  isRotating: false,
  rotatedToken: null,
  showBootstrapInfo: false,
  isInstalling: false,
  isRestarting: false,
  restartOpen: false,
  rebootOpen: false,
  forceRestart: false,
  forceReboot: false,
  logType: "app",
  logMode: "historical",
  isAtBottom: true,
  lockedTimestamp: null,
  isHistoricalMode: false,
};

function instanceViewStateReducer(state: InstanceViewState, action: InstanceViewAction): InstanceViewState {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        [action.payload.field]: action.payload.value,
      };
    case "SET_FIELDS":
      return {
        ...state,
        ...action.payload,
      };
    case "RESET_ROTATE_DIALOG":
      return {
        ...state,
        rotateOpen: false,
        rotateValue: "",
        rotateError: "",
        isRotating: false,
      };
    case "RESET_RESTART_DIALOG":
      return {
        ...state,
        restartOpen: false,
        forceRestart: false,
      };
    case "RESET_REBOOT_DIALOG":
      return {
        ...state,
        rebootOpen: false,
        forceReboot: false,
      };
    default:
      return state;
  }
}

export function useInstanceViewState(overrides: Partial<InstanceViewState> = {}) {
  const [state, dispatch] = useReducer(instanceViewStateReducer, { ...initialState, ...overrides });

  const setField = useCallback(
    <K extends keyof InstanceViewState>(field: K, value: InstanceViewState[K]) => {
      dispatch({ type: "SET_FIELD", payload: { field, value } });
    },
    [dispatch],
  );

  const setFields = useCallback(
    (payload: Partial<InstanceViewState>) => {
      dispatch({ type: "SET_FIELDS", payload });
    },
    [dispatch],
  );

  const setRotateOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setFields({ rotateOpen: true, rotateError: "", rotateValue: "" });
        return;
      }
      dispatch({ type: "RESET_ROTATE_DIALOG" });
    },
    [dispatch, setFields],
  );

  const setRestartOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setFields({ restartOpen: true, forceRestart: false });
        return;
      }
      dispatch({ type: "RESET_RESTART_DIALOG" });
    },
    [dispatch, setFields],
  );

  const setRebootOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setFields({ rebootOpen: true, forceReboot: false });
        return;
      }
      dispatch({ type: "RESET_REBOOT_DIALOG" });
    },
    [dispatch, setFields],
  );

  const setRotateValue = useCallback((value: string) => setField("rotateValue", value), [setField]);
  const setRotateError = useCallback((value: string) => setField("rotateError", value), [setField]);
  const setIsRotating = useCallback((value: boolean) => setField("isRotating", value), [setField]);
  const setBootstrapToken = useCallback((token: string | null) => setField("bootstrapToken", token), [setField]);
  const setRotatedToken = useCallback((token: string | null) => setField("rotatedToken", token), [setField]);
  const setShowBootstrapInfo = useCallback((value: boolean) => setField("showBootstrapInfo", value), [setField]);
  const setIsInstalling = useCallback((value: boolean) => setField("isInstalling", value), [setField]);
  const setIsRestarting = useCallback((value: boolean) => setField("isRestarting", value), [setField]);
  const setForceRestart = useCallback((value: boolean) => setField("forceRestart", value), [setField]);
  const setForceReboot = useCallback((value: boolean) => setField("forceReboot", value), [setField]);
  const setLogType = useCallback((value: LogType) => setField("logType", value), [setField]);
  const setLogMode = useCallback((value: LogStreamMode) => setField("logMode", value), [setField]);
  const setIsAtBottom = useCallback((value: boolean) => setField("isAtBottom", value), [setField]);
  const setLockedTimestamp = useCallback((value: number | null) => setField("lockedTimestamp", value), [setField]);
  const setIsHistoricalMode = useCallback((value: boolean) => setField("isHistoricalMode", value), [setField]);
  
  const lockToTimestamp = useCallback((timestamp: number) => {
    setFields({ lockedTimestamp: timestamp, isHistoricalMode: true });
  }, [setFields]);
  
  const returnToLive = useCallback(() => {
    setFields({ lockedTimestamp: null, isHistoricalMode: false });
  }, [setFields]);

  return {
    ...state,
    setBootstrapToken,
    setRotateOpen,
    setRotateValue,
    setRotateError,
    setIsRotating,
    setRotatedToken,
    setShowBootstrapInfo,
    setIsInstalling,
    setIsRestarting,
    setRestartOpen,
    setRebootOpen,
    setForceRestart,
    setForceReboot,
    setLogType,
    setLogMode,
    setIsAtBottom,
    setLockedTimestamp,
    setIsHistoricalMode,
    lockToTimestamp,
    returnToLive,
  } as const;
}
