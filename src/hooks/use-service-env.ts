// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from "react";
import type { Service } from "@/types";
import { useDeployment, DEPLOYMENT_ERRORS } from "./use-deployment";
import { useUrlState } from "./use-url-state";

export function useServiceEnv(service: Service | null, instanceId: string) {
  const { deploy } = useDeployment();
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();

  const config = service?.blueprint?.env_vars || {};
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const handleEdit = useCallback((key: string) => {
    setEditingKey(key);
    setEditValue(config[key] || "");
  }, [config]);

  const handleSave = useCallback((key: string) => {
    if (!service || !service.blueprint) {
      setAppError({
        appError: {
          message: DEPLOYMENT_ERRORS.BLUEPRINT_NOT_FOUND,
          helpLink: "",
        },
      });
      return;
    }

    // Update the env_vars with the new value
    const updatedEnvVars = {
      ...config,
      [key]: editValue,
    };

    // Construct deployment payload from service blueprint
    const payload = {
      ...service.blueprint,
      env_vars: updatedEnvVars,
    };

    const result = deploy(instanceId, payload);

    if (result.success) {
      setEditingKey(null);
      setEditValue("");
    }
  }, [service, config, editValue, instanceId, deploy, setAppError]);

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
