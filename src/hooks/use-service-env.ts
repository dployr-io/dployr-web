// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from "react";
import type { NormalizedService } from "@/types";
import { useDeployment, DEPLOYMENT_ERRORS } from "./use-deployment";
import { useUrlState } from "./use-url-state";
import { useInstanceStatus } from "./use-instance-status";

export function useServiceEnv(service: NormalizedService | null) {
  const { update } = useInstanceStatus();
  const { deploy } = useDeployment();
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();

  const config = service?.envVars || {};
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleEdit = useCallback((key: string) => {
    setEditingKey(key);
    setEditValue(String(config[key] || ""));
  }, [config]);

  const handleSave = useCallback((key: string) => {
    if (!service) {
      setAppError({
        appError: {
          message: DEPLOYMENT_ERRORS.BLUEPRINT_NOT_FOUND,
          helpLink: "",
        },
      });
      return;
    }

    const updatedEnvVars = {
      ...config,
      [key]: editValue,
    };

    const payload = {
      name: service.name,
      description: service.description,
      source: service.source,
      runtime: service.runtime,
      remote: service.remote,
      run_cmd: service.runCmd,
      build_cmd: service.buildCmd,
      port: service.port,
      working_dir: service.workingDir,
      env_vars: updatedEnvVars,
      secrets: service.secrets,
    };
    const targetInstance = update?.workloads?.services?.find(s => s.id === service.id || s.name === service.name);
    
    const instanceId = targetInstance?.id;
    
    if (!instanceId) {
      setAppError({
        appError: {
          message: "Could not find the instance for this service.",
          helpLink: "",
        },
      });
      return;
    }

    const result = deploy(instanceId, payload);

    if (result.success) {
      setEditingKey(null);
      setEditValue("");
    }
  }, [service, config, editValue, deploy, setAppError]);

  const handleCancel = useCallback(() => {
    setEditingKey(null);
    setEditValue("");
  }, []);

  const handleKeyboardPress = useCallback((e: React.KeyboardEvent, key: string) => {
    if (e.key === "Enter") {
      handleSave(key);
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  return {
    config,
    editingKey,
    editValue,
    setEditValue,
    handleEdit,
    handleSave,
    handleKeyboardPress,
    handleCancel,
  };
}
