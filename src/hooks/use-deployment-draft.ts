// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { runtimes } from "@/types/runtimes";
import { useClusterId } from "./use-cluster-id";

const remoteSchema = z.object({
  url: z.string().default(""),
  branch: z.string().default("main"),
  commit_hash: z.string().default(""),
});

const REMOTE_DEFAULT = { url: "", branch: "main", commit_hash: "" };

export const deploymentDraftSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  description: z.string().default(""),
  source: z.enum(["remote", "image"]).default("remote"),
  type: z.enum(["web"]).default("web"),
  runtime: z.enum(runtimes).default("nodejs"),
  version: z.coerce.string().default(""),
  run_cmd: z.string().default(""),
  build_cmd: z.string().default(""),
  port: z.coerce.number().nullable().default(null),
  working_dir: z.string().default(""),
  static_dir: z.string().default(""),
  image: z.string().default(""),
  env_vars: z.record(z.string(), z.string()).default({}),
  secrets: z.record(z.string(), z.string()).default({}),
  remote: remoteSchema.default(REMOTE_DEFAULT),
  domain: z.string().default(""),
  updated_at: z.number(),
});

export type DeploymentDraft = z.infer<typeof deploymentDraftSchema>;

export interface DeploymentDraftValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

const draftValidationSchema = deploymentDraftSchema.pick({ name: true, source: true, runtime: true, port: true, run_cmd: true, image: true }).superRefine((data, ctx) => {
  if (!data.name.trim()) {
    ctx.addIssue({ code: "custom", path: ["name"], message: "Name is required" });
  } else if (data.name.trim().length < 2) {
    ctx.addIssue({ code: "custom", path: ["name"], message: "Name must be at least 2 characters" });
  } else if (!/^[a-z0-9-]+$/.test(data.name)) {
    ctx.addIssue({ code: "custom", path: ["name"], message: "Name must be lowercase alphanumeric with hyphens only" });
  } else if (data.name.startsWith("-") || data.name.endsWith("-")) {
    ctx.addIssue({ code: "custom", path: ["name"], message: "Name cannot start or end with a hyphen" });
  }

  if (data.port !== null && (data.port < 1024 || data.port > 10000)) {
    ctx.addIssue({ code: "custom", path: ["port"], message: "Port must be between 1024 and 10000" });
  }

  if (data.source === "remote" && !data.run_cmd.trim() && data.runtime !== "static") {
    ctx.addIssue({ code: "custom", path: ["run_cmd"], message: "Run command is required for remote source" });
  }
  if (data.source === "image" && !data.image.trim()) {
    ctx.addIssue({ code: "custom", path: ["image"], message: "Image is required for image source" });
  }
});

export function validateDraft(draft: Partial<DeploymentDraft>): DeploymentDraftValidation {
  const result = draftValidationSchema.safeParse(draft);
  if (result.success) return { isValid: true, errors: {} };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as string;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { isValid: false, errors };
}

const blueprintParseSchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  source: z.enum(["remote", "image"]).default("remote"),
  type: z.enum(["web", "worker", "static", "job"]).default("web"),
  runtime: z
    .union([z.object({ type: z.string().default("nodejs"), version: z.coerce.string().default("") }), z.string().transform(type => ({ type, version: "" }))])
    .default({ type: "nodejs", version: "" }),
  run_cmd: z.string().default(""),
  build_cmd: z.string().default(""),
  port: z.coerce.number().nullable().default(null),
  working_dir: z.string().default(""),
  static_dir: z.string().default(""),
  image: z.string().default(""),
  env_vars: z.record(z.string(), z.coerce.string()).default({}),
  secrets: z.record(z.string(), z.coerce.string()).default({}),
  remote: remoteSchema.default(REMOTE_DEFAULT),
  domain: z.string().default(""),
});

const STORAGE_KEY = "dployr_deployment_drafts";

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

const DEFAULT_DRAFT: Omit<DeploymentDraft, "id" | "updated_at"> = {
  name: "",
  description: "",
  source: "remote",
  type: "web",
  runtime: "nodejs",
  version: "",
  run_cmd: "",
  build_cmd: "",
  port: null,
  working_dir: "",
  static_dir: "",
  image: "",
  env_vars: {},
  secrets: {},
  remote: REMOTE_DEFAULT,
  domain: "",
};

export function useDeploymentDraft() {
  const clusterId = useClusterId();
  const [drafts, setDrafts] = useState<DeploymentDraft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<DeploymentDraft | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setDrafts(getDraftsFromStorage());
  }, []);

  const hasUnsavedChanges = useCallback(() => {
    if (!currentDraft || !isDirty) return false;
    return Boolean(currentDraft.name.trim() || currentDraft.run_cmd.trim() || currentDraft.image.trim() || currentDraft.remote.url.trim());
  }, [currentDraft, isDirty]);

  const createDraft = useCallback((): DeploymentDraft => {
    const newDraft: DeploymentDraft = { ...DEFAULT_DRAFT, id: generateId(), updated_at: Date.now() };
    setCurrentDraft(newDraft);
    setIsDirty(false);
    return newDraft;
  }, [clusterId]);

  const updateDraft = useCallback(<K extends keyof DeploymentDraft>(field: K, value: DeploymentDraft[K]) => {
    setCurrentDraft(prev => (prev ? { ...prev, [field]: value, updated_at: Date.now() } : prev));
    setIsDirty(true);
  }, []);

  const updateDraftFields = useCallback((fields: Partial<DeploymentDraft>) => {
    setCurrentDraft(prev => (prev ? { ...prev, ...fields, updated_at: Date.now() } : prev));
    setIsDirty(true);
  }, []);

  const saveDraft = useCallback(() => {
    if (!currentDraft) return null;
    const updatedDraft = { ...currentDraft, updated_at: Date.now() };
    const existingIndex = drafts.findIndex(d => d.id === currentDraft.id);
    const newDrafts = existingIndex >= 0 ? drafts.map((d, i) => (i === existingIndex ? updatedDraft : d)) : [...drafts, updatedDraft];
    saveDraftsToStorage(newDrafts);
    setDrafts(newDrafts);
    setIsDirty(false);
    return updatedDraft;
  }, [currentDraft, drafts]);

  const loadDraft = useCallback(
    (draftId: string) => {
      const draft = drafts.find(d => d.id === draftId) ?? null;
      if (draft) {
        setCurrentDraft(draft);
        setIsDirty(false);
      }
      return draft;
    },
    [drafts]
  );

  const deleteDraft = useCallback(
    (draftId: string) => {
      const newDrafts = drafts.filter(d => d.id !== draftId);
      saveDraftsToStorage(newDrafts);
      setDrafts(newDrafts);
      if (currentDraft?.id === draftId) {
        setCurrentDraft(null);
        setIsDirty(false);
      }
    },
    [drafts, currentDraft]
  );

  const discardDraft = useCallback(() => {
    setCurrentDraft(null);
    setIsDirty(false);
  }, []);

  const toBlueprint = useCallback((): string => {
    if (!currentDraft) return "{}";
    const bp: Record<string, unknown> = {
      name: currentDraft.name,
      source: currentDraft.source,
      type: currentDraft.type,
      runtime: { type: currentDraft.runtime, version: currentDraft.version || "latest" },
    };
    if (currentDraft.description) bp.description = currentDraft.description;
    if (currentDraft.port != null) bp.port = currentDraft.port;
    if (currentDraft.domain) bp.domain = currentDraft.domain;
    if (currentDraft.static_dir) bp.static_dir = currentDraft.static_dir;
    if (Object.keys(currentDraft.env_vars).length > 0) bp.env_vars = currentDraft.env_vars;
    if (Object.keys(currentDraft.secrets).length > 0) bp.secrets = currentDraft.secrets;
    if (currentDraft.source === "image") {
      if (currentDraft.image) bp.image = currentDraft.image;
    } else {
      if (currentDraft.run_cmd) bp.run_cmd = currentDraft.run_cmd;
      if (currentDraft.build_cmd) bp.build_cmd = currentDraft.build_cmd;
      if (currentDraft.working_dir) bp.working_dir = currentDraft.working_dir;
      if (currentDraft.remote.url) {
        bp.remote = {
          url: currentDraft.remote.url,
          branch: currentDraft.remote.branch || "main",
          ...(currentDraft.remote.commit_hash ? { commit_hash: currentDraft.remote.commit_hash } : {}),
        };
      }
    }
    return JSON.stringify(bp, null, 2);
  }, [currentDraft]);

  const fromBlueprint = useCallback(
    (json: string): boolean => {
      try {
        const raw = JSON.parse(json);
        const parsed = blueprintParseSchema.parse(raw);
        const draft: DeploymentDraft = {
          id: currentDraft?.id || generateId(),
          updated_at: Date.now(),
          ...parsed,
          type: "web",
          runtime: (parsed.runtime.type as DeploymentDraft["runtime"]) || "nodejs",
          version: parsed.runtime.version,
          port: parsed.port ?? currentDraft?.port ?? null,
        };
        setCurrentDraft(draft);
        setIsDirty(true);
        return true;
      } catch {
        return false;
      }
    },
    [currentDraft?.id, currentDraft?.port]
  );

  const validate = useCallback((): DeploymentDraftValidation => {
    if (!currentDraft) return { isValid: false, errors: { _form: "No draft to validate" } };
    return validateDraft(currentDraft);
  }, [currentDraft]);

  return {
    currentDraft,
    drafts,
    isDirty,
    hasUnsavedChanges,
    createDraft,
    updateDraft,
    updateDraftFields,
    saveDraft,
    loadDraft,
    deleteDraft,
    discardDraft,
    toBlueprint,
    fromBlueprint,
    validate,
  };
}
