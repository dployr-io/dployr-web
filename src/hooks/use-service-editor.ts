// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from "react";
import axios from "axios";
import type { NormalizedService } from "@/types";
import { DEPLOYMENT_ERRORS } from "./use-deployment";
import { useAppAlert } from "@/contexts/app-alert-context";
import { useInstanceStatus } from "./use-instance-status";
import { useInstanceStream } from "./use-instance-stream";
import { getApiErrorHelpLink, getApiErrorMessage } from "@/lib/api-error";

export function useServiceEditor(service: NormalizedService | null, _clusterId: string, instanceName: string) {
  const { sendJson } = useInstanceStream();
  const { update } = useInstanceStatus();
  const { setError: setAppError } = useAppAlert();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [editingSecretKey, setEditingSecretKey] = useState<string | null>(null);
  const [editSecretValue, setEditSecretValue] = useState("");

  const handleStartEdit = useCallback(() => {
    if (!service) return;
    setEditedName(service.name);
    setEditedDescription(service.description || "");
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
    setSecrets(prev => ({ ...prev, [key]: editSecretValue }));
    setEditingSecretKey(null);
    setEditSecretValue("");
  }, [editSecretValue]);

  const handleCancelSecret = useCallback(() => {
    setEditingSecretKey(null);
    setEditSecretValue("");
  }, []);

  const handleKeyboardPressSecret = useCallback((e: React.KeyboardEvent, key: string) => {
    if (e.key === "Enter") handleSaveSecret(key);
    else if (e.key === "Escape") handleCancelSecret();
  }, [handleSaveSecret, handleCancelSecret]);

  const handleAddSecret = useCallback(() => {
    const key = `SECRET_${Object.keys(secrets).length + 1}`;
    setSecrets(prev => ({ ...prev, [key]: "" }));
    handleEditSecret(key);
  }, [secrets, handleEditSecret]);

  const handleRemoveSecret = useCallback((key: string) => {
    setSecrets(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!service) {
      setAppError({ message: DEPLOYMENT_ERRORS.BLUEPRINT_NOT_FOUND, helpLink: "" });
      return;
    }

    if (!editedName.trim()) {
      setAppError({ message: "Service name is required.", helpLink: "" });
      return;
    }

    // Source the blueprint from WS instance data for rich fields
    const targetService = update?.workloads?.services?.find(
      s => s.id === service.id || s.name === service.name
    );

    if (!instanceName) {
      setAppError({ message: "Could not find the instance for this service.", helpLink: "" });
      return;
    }

    const payload = {
      name: editedName,
      description: editedDescription || undefined,
      source: targetService?.source ?? service.source,
      runtime: targetService?.runtime ?? service.runtime,
      remote: targetService?.remote ?? service.remote,
      run_cmd: targetService?.runCmd ?? service.runCmd,
      build_cmd: targetService?.buildCmd ?? service.buildCmd,
      port: targetService?.port ?? service.port,
      working_dir: targetService?.workingDir ?? service.workingDir,
      env_vars: targetService?.envVars ?? service.envVars,
      secrets: Object.keys(secrets).length > 0 ? secrets : (targetService?.secrets ?? service.secrets),
    };

    try {
      await axios.patch(
        `${import.meta.env.VITE_BASE_URL}/v1/services/${service.id}`,
        { instanceName, payload },
        { withCredentials: true }
      );

      sendJson({ kind: "heartbeat", versions: { [instanceName]: { workloads: 0 } } });
      setIsEditMode(false);
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Failed to update service");
      setAppError({ message, helpLink: getApiErrorHelpLink(err) });
    }
  }, [service, editedName, editedDescription, secrets, instanceName, update, sendJson, setAppError]);

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
  };
}
