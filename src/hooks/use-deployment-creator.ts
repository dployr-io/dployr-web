// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useState, useRef } from "react";
import type { BlueprintFormat } from "@/types";
import { useDeploymentDraft } from "./use-deployment-draft";
import { useDns } from "./use-dns";
import { useUrlState } from "./use-url-state";
import { useClusterId } from "./use-cluster-id";
import { useInstanceStream } from "./use-instance-stream";
import {
  validateContent,
  formatContent,
  convertFormat,
  getDefaultTemplate,
  type SchemaError,
} from "@/lib/blueprint-schema";
import { ulid } from "ulid";

/**
 * Hook for managing deployment creation state and navigation.
 * Can be used from any page to start the deployment creation flow.
 */
export function useDeploymentCreator() {
  const clusterId = useClusterId();
  const { useDeploymentsTabsState, useAppError } = useUrlState();
  const [{ tab }, setTab] = useDeploymentsTabsState();
  const [, setAppError] = useAppError();
  const currentTab = (tab || "quick") as "quick" | "blueprint-editor";

  const { allActiveDomains, isLoadingAllDomains } = useDns();

  // WebSocket connection
  const { sendJson, isConnected: wsConnected } = useInstanceStream();

  const {
    currentDraft,
    drafts,
    isDirty,
    hasUnsavedChanges,
    createDraft,
    updateDraft,
    saveDraft,
    loadDraft,
    deleteDraft,
    discardDraft,
    toBlueprint,
    fromBlueprint,
    validate,
  } = useDeploymentDraft();

  const [isCreating, setIsCreating] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [blueprintContent, setBlueprintContent] = useState("");
  const [blueprintFormat, setBlueprintFormat] = useState<BlueprintFormat>("json");
  const [schemaErrors, setSchemaErrors] = useState<SchemaError[]>([]);
  const lastSyncedDraftRef = useRef<string | null>(null);

  useEffect(() => {
    if (isCreating && !currentDraft) {
      createDraft();
    }
  }, [isCreating, currentDraft, createDraft]);

  useEffect(() => {
    if (currentDraft && currentTab === "blueprint-editor") {
      if (lastSyncedDraftRef.current !== currentDraft.id) {
        const jsonContent = toBlueprint();
        if (blueprintFormat === "json") {
          setBlueprintContent(jsonContent);
        } else {
          const { content } = convertFormat(jsonContent, "json", blueprintFormat);
          setBlueprintContent(content);
        }
        lastSyncedDraftRef.current = currentDraft.id;
      }
    }
  }, [currentDraft?.id, currentTab, toBlueprint, blueprintFormat]);

  // Validate content when it changes
  useEffect(() => {
    if (blueprintContent.trim()) {
      const result = validateContent(blueprintContent, blueprintFormat);
      setSchemaErrors(result.errors);
    } else {
      setSchemaErrors([]);
    }
  }, [blueprintContent, blueprintFormat]);

  // Handle blueprint changes - sync back to draft
  const handleBlueprintChange = useCallback(
    (content: string) => {
      setBlueprintContent(content);
      try {
        const { content: jsonContent, error } = convertFormat(content, blueprintFormat, "json");
        if (!error) {
          fromBlueprint(jsonContent);
        }
      } catch {
        // Invalid content, don't sync
      }
    },
    [fromBlueprint, blueprintFormat]
  );

  // Handle format change
  const handleFormatChange = useCallback(
    (newFormat: BlueprintFormat) => {
      const { content, error } = convertFormat(blueprintContent, blueprintFormat, newFormat);
      if (!error) {
        setBlueprintContent(content);
        setBlueprintFormat(newFormat);
      } else {
        setBlueprintContent(getDefaultTemplate(newFormat));
        setBlueprintFormat(newFormat);
      }
    },
    [blueprintContent, blueprintFormat]
  );

  // Format blueprint
  const formatBlueprint = useCallback(() => {
    const { formatted, error } = formatContent(blueprintContent, blueprintFormat);
    if (!error) {
      setBlueprintContent(formatted);
    }
  }, [blueprintContent, blueprintFormat]);

  // Reset blueprint to current draft
  const resetBlueprint = useCallback(() => {
    if (currentDraft) {
      const jsonContent = toBlueprint();
      if (blueprintFormat === "json") {
        setBlueprintContent(jsonContent);
      } else {
        const { content } = convertFormat(jsonContent, "json", blueprintFormat);
        setBlueprintContent(content);
      }
    }
  }, [currentDraft, toBlueprint, blueprintFormat]);

  // Deploy handler
  const handleDeploy = useCallback((instanceName: string) => {
    const result = validate();
    if (!result.isValid) {
      setValidationErrors(result.errors);
      return;
    }

    if (!currentDraft || !clusterId) {
      setAppError({
        appError: {
          message: "Unable to start deployment. Please try again.",
          helpLink: "",
        },
      });
      return;
    }

    const payload = {
      name: currentDraft.name,
      description: currentDraft.description || undefined,
      source: currentDraft.source,
      runtime: currentDraft.runtime,
      version: currentDraft.version || undefined,
      run_cmd: currentDraft.run_cmd || undefined,
      build_cmd: currentDraft.build_cmd || undefined,
      port: currentDraft.port ?? undefined,
      working_dir: currentDraft.working_dir || undefined,
      static_dir: currentDraft.static_dir || undefined,
      image: currentDraft.image || undefined,
      env_vars: Object.keys(currentDraft.env_vars).length > 0 ? currentDraft.env_vars : undefined,
      secrets: Object.keys(currentDraft.secrets).length > 0 ? currentDraft.secrets : undefined,
      remote: currentDraft.remote.url ? currentDraft.remote : undefined,
      domain: currentDraft.domain || undefined,
    };

    if (!wsConnected) {
      setAppError({
        appError: {
          message: "Not connected to deployment service. Please try again.",
          helpLink: "",
        },
      });
      return;
    }

    const sent = sendJson({
      kind: "deploy",
      instanceName,
      payload,
      requestId: ulid(),
    });

    if (!sent) {
      setAppError({
        appError: {
          message: "Failed to send deployment request. Please try again.",
          helpLink: "",
        },
      });
      return;
    }

    // Clean up draft after successful deploy initiation
    discardDraft();
    setIsCreating(false);
  }, [validate, currentDraft, clusterId, discardDraft, wsConnected, sendJson, setAppError]);

  // Handle back button
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowExitDialog(true);
    } else {
      setIsCreating(false);
      discardDraft();
      lastSyncedDraftRef.current = null;
    }
  }, [hasUnsavedChanges, discardDraft]);

  // Save draft and exit
  const handleSaveAndExit = useCallback(() => {
    saveDraft();
    setShowExitDialog(false);
    setIsCreating(false);
    lastSyncedDraftRef.current = null;
  }, [saveDraft]);

  // Discard and exit
  const handleDiscardAndExit = useCallback(() => {
    discardDraft();
    setShowExitDialog(false);
    setIsCreating(false);
    lastSyncedDraftRef.current = null;
  }, [discardDraft]);

  const handleStartCreate = useCallback(() => {
    lastSyncedDraftRef.current = null;
    createDraft();
    setIsCreating(true);
    setShowDrafts(false);
  }, [createDraft]);

  // Load draft and continue editing
  const handleLoadDraft = useCallback(
    (draftId: string) => {
      lastSyncedDraftRef.current = null;
      loadDraft(draftId);
      setIsCreating(true);
      setShowDrafts(false);
    },
    [loadDraft]
  );

  // Delete a draft
  const handleDeleteDraft = useCallback(
    (draftId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteDraft(draftId);
    },
    [deleteDraft]
  );

  // Update form field and sync to draft
  const setField = useCallback(
    (field: string, value: unknown) => {
      if (!currentDraft) return;
      switch (field) {
        case "name":
          updateDraft("name", value as string);
          break;
        case "description":
          updateDraft("description", value as string);
          break;
        case "version":
          updateDraft("version", value as string);
          break;
        case "image":
          updateDraft("image", value as string);
          break;
        case "buildCmd":
          updateDraft("build_cmd", value as string);
          break;
        case "staticDir":
          updateDraft("static_dir", value as string);
          break;
        case "workingDir":
          updateDraft("working_dir", value as string);
          break;
        case "runCmd":
          updateDraft("run_cmd", value as string);
          break;
        case "port":
          updateDraft("port", value as number | null);
          break;
        case "domain":
          updateDraft("domain", value as string);
          break;
        case "envVars":
          updateDraft("env_vars", value as Record<string, string>);
          break;
        case "secrets":
          updateDraft("secrets", value as Record<string, string>);
          break;
        case "remote":
          const remoteValue = value as { url: string; branch: string; commit_hash: string; avatar_url?: string };
          updateDraft("remote", {
            url: remoteValue.url,
            branch: remoteValue.branch || "main",
            commit_hash: remoteValue.commit_hash || "",
          });
          break;
      }
      // Clear validation error for this field
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [currentDraft, updateDraft]
  );

  return {
    // State
    isCreating,
    setIsCreating,
    showExitDialog,
    setShowExitDialog,
    showDrafts,
    setShowDrafts,
    validationErrors,
    currentTab,
    setTab,

    // Draft state
    currentDraft,
    drafts,
    isDirty,

    // Blueprint state
    blueprintContent,
    blueprintFormat,
    schemaErrors,

    // Domain state
    allActiveDomains,
    isLoadingAllDomains,

    // Handlers
    handleStartCreate,
    handleBack,
    handleSaveAndExit,
    handleDiscardAndExit,
    handleLoadDraft,
    handleDeleteDraft,
    handleDeploy,
    setField,
    updateDraft,

    // Blueprint handlers
    handleBlueprintChange,
    handleFormatChange,
    formatBlueprint,
    resetBlueprint,
  };
}
