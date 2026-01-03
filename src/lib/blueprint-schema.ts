// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Blueprint, BlueprintFormat, ServiceSource, Runtime } from "@/types";
import { runtimes } from "@/types/runtimes";
import * as YAML from "js-yaml";
import * as TOML from "smol-toml";

/**
 * Schema validation error with location info for editor highlighting
 */
export interface SchemaError {
  message: string;
  path: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: SchemaError[];
  parsed?: Blueprint;
}

/**
 * Parse content based on format
 */
export function parseContent(content: string, format: BlueprintFormat): { success: boolean; data?: unknown; error?: string } {
  if (!content.trim()) {
    return { success: false, error: "Content is empty" };
  }

  try {
    switch (format) {
      case "json":
        return { success: true, data: JSON.parse(content) };
      case "yaml":
        return parseYaml(content);
      case "toml":
        return parseToml(content);
      default:
        return { success: false, error: `Unsupported format: ${format}` };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Parse error" };
  }
}

/**
 * Parse YAML using js-yaml library
 */
function parseYaml(content: string): { success: boolean; data?: unknown; error?: string } {
  try {
    const data = YAML.load(content);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Invalid YAML" };
  }
}

/**
 * Parse TOML using smol-toml library
 */
function parseToml(content: string): { success: boolean; data?: unknown; error?: string } {
  try {
    const data = TOML.parse(content);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Invalid TOML" };
  }
}

/**
 * Convert object to specified format
 */
export function stringifyContent(data: unknown, format: BlueprintFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);
    case "yaml":
      return YAML.dump(data, { indent: 2, lineWidth: -1, noRefs: true });
    case "toml":
      return TOML.stringify(data as Record<string, unknown>);
    default:
      return JSON.stringify(data, null, 2);
  }
}


/**
 * Validate blueprint schema
 */
export function validateBlueprint(data: unknown): ValidationResult {
  const errors: SchemaError[] = [];

  if (!data || typeof data !== "object") {
    return {
      isValid: false,
      errors: [{ message: "Blueprint must be an object", path: "", severity: "error" }],
    };
  }

  const obj = data as Record<string, unknown>;

  // Required: name
  if (!obj.name || typeof obj.name !== "string") {
    errors.push({ message: "name is required and must be a string", path: "name", severity: "error" });
  } else if (!/^[a-z0-9-]+$/.test(obj.name)) {
    errors.push({ message: "name must be lowercase alphanumeric with hyphens only", path: "name", severity: "error" });
  }

  // Required: source
  const validSources: ServiceSource[] = ["remote", "image"];
  if (!obj.source || !validSources.includes(obj.source as ServiceSource)) {
    errors.push({ message: `source must be one of: ${validSources.join(", ")}`, path: "source", severity: "error" });
  }

  // Required: runtime
  if (!obj.runtime) {
    errors.push({ message: "runtime is required", path: "runtime", severity: "error" });
  } else if (typeof obj.runtime === "object") {
    const rt = obj.runtime as Record<string, unknown>;
    if (!rt.type || !runtimes.includes(rt.type as Runtime)) {
      errors.push({ message: `runtime.type must be one of: ${runtimes.join(", ")}`, path: "runtime.type", severity: "error" });
    }
  } else if (typeof obj.runtime === "string") {
    if (!runtimes.includes(obj.runtime as Runtime)) {
      errors.push({ message: `runtime must be one of: ${runtimes.join(", ")}`, path: "runtime", severity: "error" });
    }
  }

  // Port validation
  if (obj.port !== undefined && obj.port !== null) {
    const port = Number(obj.port);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push({ message: "port must be between 1 and 65535", path: "port", severity: "error" });
    }
  }

  // Source-specific validation
  if (obj.source === "remote") {
    const runtime = typeof obj.runtime === "object" ? (obj.runtime as Record<string, unknown>).type : obj.runtime;
    if (runtime !== "static" && !obj.run_cmd) {
      errors.push({ message: "run_cmd is required for remote source (non-static)", path: "run_cmd", severity: "error" });
    }
  }

  if (obj.source === "image") {
    if (!obj.image) {
      errors.push({ message: "image is required for image source", path: "image", severity: "error" });
    }
  }

  // Remote object validation
  if (obj.remote && typeof obj.remote === "object") {
    const remote = obj.remote as Record<string, unknown>;
    if (remote.url && typeof remote.url !== "string") {
      errors.push({ message: "remote.url must be a string", path: "remote.url", severity: "error" });
    }
  }

  // Env vars validation
  if (obj.env_vars && typeof obj.env_vars !== "object") {
    errors.push({ message: "env_vars must be an object", path: "env_vars", severity: "error" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    parsed: errors.length === 0 ? (obj as unknown as Blueprint) : undefined,
  };
}

/**
 * Full validation: parse + schema check
 */
export function validateContent(content: string, format: BlueprintFormat): ValidationResult {
  if (!content.trim()) {
    return {
      isValid: false,
      errors: [{ message: "Content is empty", path: "", severity: "error" }],
    };
  }

  const { data, error } = parseContent(content, format);

  if (error) {
    return {
      isValid: false,
      errors: [{ message: `Syntax error: ${error}`, path: "", severity: "error" }],
    };
  }

  return validateBlueprint(data);
}

/**
 * Format content (parse and re-stringify with proper formatting)
 */
export function formatContent(content: string, format: BlueprintFormat): { success: boolean; formatted?: string; error?: string } {
  const parsed = parseContent(content, format);

  if (!parsed.success) {
    return { success: false, error: parsed.error || "Parse error" };
  }

  try {
    const formatted = stringifyContent(parsed.data, format);
    return { success: true, formatted };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Format error" };
  }
}

/**
 * Convert content between formats
 */
export function convertFormat(content: string, fromFormat: BlueprintFormat, toFormat: BlueprintFormat): { content: string; error?: string } {
  if (fromFormat === toFormat) {
    const result = formatContent(content, fromFormat);
    return { content: result.formatted || content, error: result.error };
  }

  const parsed = parseContent(content, fromFormat);

  if (!parsed.success) {
    return { content, error: parsed.error };
  }

  try {
    return { content: stringifyContent(parsed.data, toFormat) };
  } catch (e) {
    return { content, error: e instanceof Error ? e.message : "Conversion error" };
  }
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: BlueprintFormat): string {
  switch (format) {
    case "json":
      return "json";
    case "yaml":
      return "yaml";
    case "toml":
      return "toml";
    default:
      return "json";
  }
}

/**
 * Get default template for format
 */
export function getDefaultTemplate(format: BlueprintFormat): string {
  const template = {
    name: "",
    description: "",
    source: "remote",
    runtime: {
      type: "nodejs",
      version: "22",
    },
    port: 3001,
    run_cmd: "",
    build_cmd: "",
    working_dir: "/app",
    env_vars: {},
    remote: {
      url: "",
      branch: "main",
    },
  };

  return stringifyContent(template, format);
}
