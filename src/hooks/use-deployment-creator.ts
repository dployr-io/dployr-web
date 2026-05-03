// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useState, useRef } from "react";
import type { BlueprintFormat } from "@/types";
import { useDeploymentDraft } from "./use-deployment-draft";
import { useDns } from "./use-dns";
import { useAuth } from "@/hooks/use-auth";
import { useUrlState } from "./use-url-state";
import { useClusterId } from "./use-cluster-id";
import { useDeployment } from "./use-deployment";
import { validateContent, formatContent, convertFormat, getDefaultTemplate, type SchemaError } from "@/lib/blueprint-schema";

/**
 * Hook for managing deployment creation state and navigation.
 * Can be used from any page to start the deployment creation flow.
 */
export function useDeploymentCreator(instanceId?: string) {
  const clusterId = useClusterId();
  const { useDeploymentsTabsState, useAppError } = useUrlState();
  const [{ tab }, setTab] = useDeploymentsTabsState();
  const [, setAppError] = useAppError();
  const currentTab = (tab || "quick") as "quick" | "blueprint-editor";

  const { domains, isLoadingDomains } = useDns(instanceId);
  const { deploy } = useDeployment();

  const { currentDraft, drafts, isDirty, hasUnsavedChanges, createDraft, updateDraft, saveDraft, loadDraft, deleteDraft, discardDraft, toBlueprint, fromBlueprint, validate } = useDeploymentDraft();

  const userId = useAuth().user?.id;
  const [isCreating, setIsCreating] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lastDeployedInstance, setLastDeployedInstance] = useState<string | null>(null);

  const [blueprintContent, setBlueprintContent] = useState("");
  const [blueprintFormat, setBlueprintFormat] = useState<BlueprintFormat>("json");
  const [schemaErrors, setSchemaErrors] = useState<SchemaError[]>([]);
  const lastSyncedDraftRef = useRef<string | null>(null);

  // Sync validation errors from draft when draft is created or changes
  useEffect(() => {
    if (currentDraft) {
      const result = validate();
      setValidationErrors(result.errors);
    }
  }, [currentDraft, validate]);

  useEffect(() => {
    if (isCreating && !currentDraft) {
      createDraft();
    }
  }, [isCreating, currentDraft, createDraft]);

  useEffect(() => {
    if (currentDraft && currentTab === "blueprint-editor" && !blueprintContent.trim()) {
      const jsonContent = toBlueprint();
      if (blueprintFormat === "json") {
        setBlueprintContent(jsonContent);
      } else {
        const { content } = convertFormat(jsonContent, "json", blueprintFormat);
        setBlueprintContent(content);
      }
    }
  }, [currentDraft, currentTab, blueprintFormat, toBlueprint, blueprintContent]);

  useEffect(() => {
    if (blueprintContent.trim()) {
      const result = validateContent(blueprintContent, blueprintFormat);
      setSchemaErrors(result.isValid ? [] : result.errors);
    } else {
      setSchemaErrors([]);
    }
  }, [blueprintContent, blueprintFormat]);

  const syncBlueprintFromDraft = useCallback(() => {
    if (!currentDraft) return;
    const jsonContent = toBlueprint();
    if (blueprintFormat === "json") {
      setBlueprintContent(jsonContent);
    } else {
      const { content } = convertFormat(jsonContent, "json", blueprintFormat);
      setBlueprintContent(content);
    }
  }, [currentDraft, toBlueprint, blueprintFormat]);

  const syncDraftFromBlueprint = useCallback(() => {
    if (!blueprintContent.trim()) return;
    try {
      const { content: jsonContent, error } = convertFormat(blueprintContent, blueprintFormat, "json");
      if (!error) {
        fromBlueprint(jsonContent);
      }
    } catch {
      // Invalid content, keep current draft
    }
  }, [blueprintContent, blueprintFormat, fromBlueprint]);

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
    const result = formatContent(blueprintContent, blueprintFormat);
    if (result.success && result.formatted) {
      setBlueprintContent(result.formatted);
    }
  }, [blueprintContent, blueprintFormat]);

  // Reset blueprint to default template
  const resetBlueprint = useCallback(() => {
    const defaultContent = getDefaultTemplate(blueprintFormat);
    setBlueprintContent(defaultContent);
    if (currentDraft) {
      fromBlueprint(
        JSON.stringify({
          name: "",
          description: "",
          source: "remote",
          type: "web",
          runtime: { type: "nodejs", version: "22" },
          port: 3000,
          run_cmd: "",
          build_cmd: "",
          working_dir: "/app",
          env_vars: {},
          remote: { url: "", branch: "main" },
        })
      );
    }
  }, [blueprintFormat, currentDraft, fromBlueprint]);

  const handleDeploy = useCallback(
    async (instanceName: string) => {
      if (currentTab === "blueprint-editor") {
        syncDraftFromBlueprint();
      }

      const validation = validate();
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
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

      const env_vars = Object.keys(currentDraft.env_vars).length > 0
        ? Object.entries(currentDraft.env_vars).reduce(
            (acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            },
            {} as Record<string, string>
          )
        : undefined;

      const secrets = Object.keys(currentDraft.secrets).length > 0
        ? Object.entries(currentDraft.secrets).reduce(
            (acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            },
            {} as Record<string, string>
          )
        : undefined;
        
      const payload = {
        user_id: userId,
        name: currentDraft.name,
        description: currentDraft.description || undefined,
        source: currentDraft.source,
        type: currentDraft.type,
        runtime: currentDraft.runtime,
        version: currentDraft.version || undefined,
        run_cmd: currentDraft.run_cmd || undefined,
        build_cmd: currentDraft.build_cmd || undefined,
        port: currentDraft.port ?? undefined,
        working_dir: currentDraft.working_dir || undefined,
        static_dir: currentDraft.static_dir || undefined,
        image: currentDraft.image || undefined,
        env_vars,
        secrets,
        remote: currentDraft.remote.url ? currentDraft.remote : undefined,
        domain: currentDraft.domain || undefined,
      };

      const deployResult = await deploy(instanceName, payload);

      if (!deployResult.success) return;

      // Clean up draft after successful deploy initiation
      setLastDeployedInstance(instanceName);
      discardDraft();
      setIsCreating(false);
      lastSyncedDraftRef.current = null;
    },
    [validate, currentDraft, clusterId, discardDraft, deploy]
  );

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
    setLastDeployedInstance(null);
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
      // Clear validation error for this field and revalidate
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });

      // Validate the draft immediately
      const result = validate();
      setValidationErrors(result.errors);
    },
    [currentDraft, updateDraft, validate]
  );

  return {
    // State
    isCreating,
    setIsCreating,
    lastDeployedInstance,
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
    domains,
    isLoadingDomains,

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
    syncBlueprintFromDraft,
    syncDraftFromBlueprint,
  };
}
