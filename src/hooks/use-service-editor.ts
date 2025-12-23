// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ulid } from "ulid";
import type { Service, InstanceStream } from "@/types";
import { useDeployment, DEPLOYMENT_ERRORS } from "./use-deployment";
import { useUrlState } from "./use-url-state";
import { useInstanceStream } from "./use-instance-stream";

export function useServiceEditor(service: Service | null, clusterId: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { deploy } = useDeployment();
  const { sendJson, isConnected: wsConnected } = useInstanceStream();
  const { useAppError } = useUrlState();
  const [, setAppError] = useAppError();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [editingSecretKey, setEditingSecretKey] = useState<string | null>(null);
  const [editSecretValue, setEditSecretValue] = useState("");

  const handleStartEdit = useCallback(() => {
    if (!service) return;
    setEditedName(service.blueprint?.name || service.name);
    setEditedDescription(service.blueprint?.description || service.description);
    setSecrets({});
    setIsEditMode(true);
  }, [service]);

  const handleCancelEdit = useCallback(() => {
    setIsEditMode(false);
    setEditedName("");
    setEditedDescription("");
    setSecrets({});
    setEditingSecretKey(null);
    setEditSecretValue("");
  }, []);

  const handleEditSecret = useCallback((key: string) => {
    setEditingSecretKey(key);
    setEditSecretValue(secrets[key] || "");
  }, [secrets]);

  const handleSaveSecret = useCallback((key: string) => {
    setSecrets(prev => ({
      ...prev,
      [key]: editSecretValue,
    }));
    setEditingSecretKey(null);
    setEditSecretValue("");
  }, [editSecretValue]);

  const handleCancelSecret = useCallback(() => {
    setEditingSecretKey(null);
    setEditSecretValue("");
  }, []);

  const handleKeyboardPressSecret = useCallback((e: React.KeyboardEvent, key: string) => {
    if (e.key === "Enter") {
      handleSaveSecret(key);
    } else if (e.key === "Escape") {
      handleCancelSecret();
    }
  }, [handleSaveSecret, handleCancelSecret]);

  const handleStopRemove = useCallback(() => {
    if (!service) return;

    if (!wsConnected) {
      setAppError({
        appError: {
          message: "WebSocket is not connected",
          helpLink: "",
        },
      });
      return;
    }

    sendJson({
      kind: "service_remove",
      name: service.name,
      requestId: ulid(),
    });
    
  }, [service, wsConnected, sendJson, setAppError, navigate, clusterId]);

  const handleAddSecret = useCallback(() => {
    const key = `SECRET_${Object.keys(secrets).length + 1}`;
    setSecrets(prev => ({
      ...prev,
      [key]: "",
    }));
    handleEditSecret(key);
  }, [secrets, handleEditSecret]);

  const handleRemoveSecret = useCallback((key: string) => {
    setSecrets(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!service || !service.blueprint) {
      setAppError({
        appError: {
          message: DEPLOYMENT_ERRORS.BLUEPRINT_NOT_FOUND,
          helpLink: "",
        },
      });
      return;
    }

    if (!editedName.trim()) {
      setAppError({
        appError: {
          message: "Service name is required.",
          helpLink: "",
        },
      });
      return;
    }

    const payload = {
      ...service.blueprint,
      name: editedName,
      description: editedDescription || undefined,
      secrets: Object.keys(secrets).length > 0 ? secrets : undefined,
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
      setIsEditMode(false);
      navigate({ to: "/clusters/$clusterId/deployments", params: { clusterId } });
    }
  }, [service, editedName, editedDescription, secrets, clusterId, deploy, setAppError, navigate, queryClient]);

  return {
    isEditMode,
    editedName,
    editedDescription,
    secrets,
    editingSecretKey,
    editSecretValue,
    setEditedName,
    setEditedDescription,
    setEditSecretValue,
    handleStartEdit,
    handleCancelEdit,
    handleSave,
    handleEditSecret,
    handleSaveSecret,
    handleCancelSecret,
    handleKeyboardPressSecret,
    handleAddSecret,
    handleRemoveSecret,
    handleStopRemove,
  };
}
