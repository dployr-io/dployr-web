// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useState } from "react";
import type { ServiceSource, Runtime } from "@/types";
import { useClusterId } from "./use-cluster-id";

export interface DeploymentDraft {
  id: string;
  name: string;
  description: string;
  source: ServiceSource;
  runtime: Runtime;
  version: string;
  run_cmd: string;
  build_cmd: string;
  port: number | null;
  working_dir: string;
  static_dir: string;
  image: string;
  env_vars: Record<string, string>;
  secrets: Record<string, string>;
  remote: {
    url: string;
    branch: string;
    commit_hash: string;
  };
  domain: string;
  updatedAt: number;
}

export interface DeploymentDraftValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

const STORAGE_KEY = "dployr_deployment_drafts";

const DEFAULT_DRAFT: Omit<DeploymentDraft, "id" | "updatedAt" | "clusterId"> = {
  name: "",
  description: "",
  source: "remote",
  runtime: "nodejs",
  version: "",
  run_cmd: "",
  build_cmd: "",
  port: 3000,
  working_dir: "",
  static_dir: "",
  image: "",
  env_vars: {},
  secrets: {},
  remote: {
    url: "",
    branch: "main",
    commit_hash: "",
  },
  domain: "",
};

function generateId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getDraftsFromStorage(): DeploymentDraft[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveDraftsToStorage(drafts: DeploymentDraft[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    console.error("Failed to save drafts to localStorage");
  }
}

export function validateDraft(draft: Partial<DeploymentDraft>): DeploymentDraftValidation {
  const errors: Record<string, string> = {};

  // Required: name
  if (!draft.name?.trim()) {
    errors.name = "Name is required";
  } else if (draft.name.length < 2) {
    errors.name = "Name must be at least 2 characters";
  } else if (!/^[a-z0-9-]+$/.test(draft.name)) {
    errors.name = "Name must be lowercase alphanumeric with hyphens only";
  }

  // Required: source
  if (!draft.source) {
    errors.source = "Source is required";
  } else if (!["remote", "image"].includes(draft.source)) {
    errors.source = "Source must be 'remote' or 'image'";
  }

  // Required: runtime
  if (!draft.runtime) {
    errors.runtime = "Runtime is required";
  }

  // Port validation (optional but must be valid if provided)
  if (draft.port !== null && draft.port !== undefined) {
    if (draft.port < 1 || draft.port > 65535) {
      errors.port = "Port must be between 1 and 65535";
    }
  }

  // Source-specific validation
  if (draft.source === "remote") {
    if (!draft.run_cmd?.trim() && draft.runtime !== "static") {
      errors.run_cmd = "Run command is required for remote source";
    }
  }

  if (draft.source === "image") {
    if (!draft.image?.trim()) {
      errors.image = "Image is required for image source";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function useDeploymentDraft() {
  const clusterId = useClusterId();
  const [drafts, setDrafts] = useState<DeploymentDraft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<DeploymentDraft | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Load drafts from localStorage on mount
  useEffect(() => {
    const storedDrafts = getDraftsFromStorage();
    setDrafts(storedDrafts);
  }, []);

  // Check if current draft has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!currentDraft) return false;
    if (!isDirty) return false;
    // Check if any meaningful field has been filled
    return Boolean(
      currentDraft.name.trim() ||
      currentDraft.run_cmd.trim() ||
      currentDraft.image.trim() ||
      currentDraft.remote.url.trim()
    );
  }, [currentDraft, isDirty]);

  // Create a new draft
  const createDraft = useCallback((): DeploymentDraft => {
    const newDraft: DeploymentDraft = {
      ...DEFAULT_DRAFT,
      id: generateId(),
      updatedAt: Date.now(),
    };
    setCurrentDraft(newDraft);
    setIsDirty(false);
    return newDraft;
  }, [clusterId]);

  // Update current draft field
  const updateDraft = useCallback(<K extends keyof DeploymentDraft>(field: K, value: DeploymentDraft[K]) => {
    setCurrentDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
        updatedAt: Date.now(),
      };
    });
    setIsDirty(true);
  }, []);

  // Update multiple fields at once
  const updateDraftFields = useCallback((fields: Partial<DeploymentDraft>) => {
    setCurrentDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ...fields,
        updatedAt: Date.now(),
      };
    });
    setIsDirty(true);
  }, []);

  // Save current draft to localStorage
  const saveDraft = useCallback(() => {
    if (!currentDraft) return null;

    const updatedDraft = { ...currentDraft, updatedAt: Date.now() };
    const existingIndex = drafts.findIndex(d => d.id === currentDraft.id);
    
    let newDrafts: DeploymentDraft[];
    if (existingIndex >= 0) {
      newDrafts = [...drafts];
      newDrafts[existingIndex] = updatedDraft;
    } else {
      newDrafts = [...drafts, updatedDraft];
    }

    saveDraftsToStorage(newDrafts);
    setDrafts(newDrafts);
    setIsDirty(false);
    return updatedDraft;
  }, [currentDraft, drafts]);

  // Load a draft by ID
  const loadDraft = useCallback((draftId: string) => {
    const draft = drafts.find(d => d.id === draftId);
    if (draft) {
      setCurrentDraft(draft);
      setIsDirty(false);
    }
    return draft || null;
  }, [drafts]);

  // Delete a draft
  const deleteDraft = useCallback((draftId: string) => {
    const newDrafts = drafts.filter(d => d.id !== draftId);
    saveDraftsToStorage(newDrafts);
    setDrafts(newDrafts);
    if (currentDraft?.id === draftId) {
      setCurrentDraft(null);
      setIsDirty(false);
    }
  }, [drafts, currentDraft]);

  // Clear current draft without saving
  const discardDraft = useCallback(() => {
    setCurrentDraft(null);
    setIsDirty(false);
  }, []);

  // Convert draft to blueprint JSON
  const toBlueprint = useCallback((): string => {
    if (!currentDraft) return "{}";
    
    const blueprint = {
      name: currentDraft.name,
      description: currentDraft.description,
      source: currentDraft.source,
      runtime: {
        type: currentDraft.runtime,
        version: currentDraft.version || "latest",
      },
      run_cmd: currentDraft.run_cmd,
      build_cmd: currentDraft.build_cmd,
      port: currentDraft.port,
      working_dir: currentDraft.working_dir,
      static_dir: currentDraft.static_dir,
      image: currentDraft.image,
      env_vars: currentDraft.env_vars,
      secrets: currentDraft.secrets,
      remote: currentDraft.remote,
      domain: currentDraft.domain,
    };

    return JSON.stringify(blueprint, null, 2);
  }, [currentDraft]);

  // Load from blueprint JSON
  const fromBlueprint = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      const draft: DeploymentDraft = {
        id: currentDraft?.id || generateId(),
        updatedAt: Date.now(),
        name: parsed.name || "",
        description: parsed.description || "",
        source: parsed.source || "remote",
        runtime: parsed.runtime?.type || "nodejs",
        version: parsed.runtime?.version || "",
        run_cmd: parsed.run_cmd || "",
        build_cmd: parsed.build_cmd || "",
        port: parsed.port ?? 3000,
        working_dir: parsed.working_dir || "",
        static_dir: parsed.static_dir || "",
        image: parsed.image || "",
        env_vars: parsed.env_vars || {},
        secrets: parsed.secrets || {},
        remote: {
          url: parsed.remote?.url || "",
          branch: parsed.remote?.branch || "main",
          commit_hash: parsed.remote?.commit_hash || "",
        },
        domain: parsed.domain || "",
      };
      setCurrentDraft(draft);
      setIsDirty(true);
      return true;
    } catch {
      return false;
    }
  }, [currentDraft?.id, clusterId]);

  // Validate current draft
  const validate = useCallback((): DeploymentDraftValidation => {
    if (!currentDraft) {
      return { isValid: false, errors: { _form: "No draft to validate" } };
    }
    return validateDraft(currentDraft);
  }, [currentDraft]);

  return {
    // State
    currentDraft,
    drafts,
    isDirty,
    hasUnsavedChanges,

    // Actions
    createDraft,
    updateDraft,
    updateDraftFields,
    saveDraft,
    loadDraft,
    deleteDraft,
    discardDraft,

    // Conversion
    toBlueprint,
    fromBlueprint,

    // Validation
    validate,
  };
}
