// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Service, InstanceStream } from "@/types";
import { useDeployment, DEPLOYMENT_ERRORS } from "./use-deployment";
import { useUrlState } from "./use-url-state";

export function useServiceEnv(service: Service | null) {
  const queryClient = useQueryClient();
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

    // Find the instance that contains this service
    const allCachedData = queryClient.getQueriesData<InstanceStream>({ queryKey: ['instance-status'] });
    const targetInstance = allCachedData.find(([, data]) => {
      const services = data?.update?.services;
      return services?.some(s => s.id === service.id || s.name === service.name);
    });
    
    const instanceId = targetInstance?.[1]?.update?.instance_id;
    
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
  }, [service, config, editValue, deploy, setAppError, queryClient]);

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
