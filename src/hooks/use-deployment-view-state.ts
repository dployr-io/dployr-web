// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useReducer } from "react";
import type { ServiceSource, Remote, Runtime } from "@/types";

interface DeploymentViewState {
  name: string;
  nameError: string;
  source: ServiceSource;
  remote: Remote | null;
  remoteError: string;
  workingDir: string;
  workingDirError: string;
  runtime: Runtime;
  runtimeError: string;
  runCmd: string;
  runCmdError: string;
  port: number | null;
  portError: string;
  domain: string;
  domainError: string;
  processing: boolean;
  errors: Record<string, string> | undefined;
  currentTab: "quick" | "blueprint-editor";
  blueprintContent: string;
  blueprintError: string;
}

type DeploymentViewAction =
  | { type: "SET_FIELD"; payload: { field: keyof DeploymentViewState; value: DeploymentViewState[keyof DeploymentViewState] } }
  | { type: "SET_FIELDS"; payload: Partial<DeploymentViewState> }
  | { type: "RESET_ERRORS" }
  | { type: "RESET_FORM" };

const initialState: DeploymentViewState = {
  name: "",
  nameError: "",
  source: "image",
  remote: null,
  remoteError: "",
  workingDir: "",
  workingDirError: "",
  runtime: "static",
  runtimeError: "",
  runCmd: "",
  runCmdError: "",
  port: null,
  portError: "",
  domain: "",
  domainError: "",
  processing: false,
  errors: undefined,
  currentTab: "quick",
  blueprintContent: "",
  blueprintError: "",
};

function deploymentViewStateReducer(state: DeploymentViewState, action: DeploymentViewAction): DeploymentViewState {
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
    case "RESET_ERRORS":
      return {
        ...state,
        nameError: "",
        remoteError: "",
        workingDirError: "",
        runtimeError: "",
        runCmdError: "",
        blueprintError: "",
        errors: undefined,
      };
    case "RESET_FORM":
      return {
        ...initialState,
        currentTab: state.currentTab,
      };
    default:
      return state;
  }
}

export function useDeploymentViewState(overrides: Partial<DeploymentViewState> = {}) {
  const [state, dispatch] = useReducer(deploymentViewStateReducer, { ...initialState, ...overrides });

  const setField = useCallback(
    <K extends keyof DeploymentViewState>(field: K, value: DeploymentViewState[K]) => {
      dispatch({ type: "SET_FIELD", payload: { field, value } });
    },
    [dispatch],
  );

  const setFields = useCallback(
    (payload: Partial<DeploymentViewState>) => {
      dispatch({ type: "SET_FIELDS", payload });
    },
    [dispatch],
  );

  const resetErrors = useCallback(() => {
    dispatch({ type: "RESET_ERRORS" });
  }, [dispatch]);

  const resetForm = useCallback(() => {
    dispatch({ type: "RESET_FORM" });
  }, [dispatch]);

  const setName = useCallback((value: string) => setField("name", value), [setField]);
  const setNameError = useCallback((value: string) => setField("nameError", value), [setField]);
  const setSource = useCallback((value: ServiceSource) => setField("source", value), [setField]);
  const setRemote = useCallback((value: Remote | null) => setField("remote", value), [setField]);
  const setRemoteError = useCallback((value: string) => setField("remoteError", value), [setField]);
  const setWorkingDir = useCallback((value: string) => setField("workingDir", value), [setField]);
  const setWorkingDirError = useCallback((value: string) => setField("workingDirError", value), [setField]);
  const setRuntime = useCallback((value: Runtime) => setField("runtime", value), [setField]);
  const setRuntimeError = useCallback((value: string) => setField("runtimeError", value), [setField]);
  const setRunCmd = useCallback((value: string) => setField("runCmd", value), [setField]);
  const setRunCmdError = useCallback((value: string) => setField("runCmdError", value), [setField]);
  const setPort = useCallback((value: number | null) => setField("port", value), [setField]);
  const setPortError = useCallback((value: string) => setField("portError", value), [setField]);
  const setDomain = useCallback((value: string) => setField("domain", value), [setField]);
  const setDomainError = useCallback((value: string) => setField("domainError", value), [setField]);
  const setProcessing = useCallback((value: boolean) => setField("processing", value), [setField]);
  const setErrors = useCallback((value: Record<string, string> | undefined) => setField("errors", value), [setField]);
  const setCurrentTab = useCallback((value: "quick" | "blueprint-editor") => setField("currentTab", value), [setField]);
  const setBlueprintContent = useCallback((value: string) => setField("blueprintContent", value), [setField]);
  const setBlueprintError = useCallback((value: string) => setField("blueprintError", value), [setField]);

  return {
    ...state,
    setName,
    setNameError,
    setSource,
    setRemote,
    setRemoteError,
    setWorkingDir,
    setWorkingDirError,
    setRuntime,
    setRuntimeError,
    setRunCmd,
    setRunCmdError,
    setPort,
    setPortError,
    setDomain,
    setDomainError,
    setProcessing,
    setErrors,
    setCurrentTab,
    setBlueprintContent,
    setBlueprintError,
    resetErrors,
    resetForm,
    setField,
  } as const;
}