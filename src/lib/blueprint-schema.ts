// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Blueprint, BlueprintFormat, ServiceSource, Runtime } from "@/types";
import { runtimes } from "@/types/runtimes";

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
export function parseContent(content: string, format: BlueprintFormat): { data: unknown; error?: string } {
  try {
    switch (format) {
      case "json":
        return { data: JSON.parse(content) };
      case "yaml":
        return parseYaml(content);
      case "toml":
        return parseToml(content);
      default:
        return { data: null, error: `Unsupported format: ${format}` };
    }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Parse error" };
  }
}

/**
 * Simple YAML parser (handles common cases)
 */
function parseYaml(content: string): { data: unknown; error?: string } {
  try {
    const lines = content.split("\n");
    const result: Record<string, unknown> = {};
    const stack: { obj: Record<string, unknown>; indent: number }[] = [{ obj: result, indent: -1 }];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) continue;

      const indent = line.search(/\S/);
      const colonIdx = trimmed.indexOf(":");

      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();

      // Pop stack to find correct parent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].obj;

      if (value === "" || value === "|" || value === ">") {
        // Nested object or multiline
        const nested: Record<string, unknown> = {};
        parent[key] = nested;
        stack.push({ obj: nested, indent });
      } else {
        // Parse value
        parent[key] = parseYamlValue(value);
      }
    }

    return { data: result };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "YAML parse error" };
  }
}

function parseYamlValue(value: string): unknown {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;
  // Null
  if (value === "null" || value === "~") return null;
  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) return parseFloat(value);
  // String
  return value;
}

/**
 * Simple TOML parser (handles common cases)
 */
function parseToml(content: string): { data: unknown; error?: string } {
  try {
    const lines = content.split("\n");
    const result: Record<string, unknown> = {};
    let currentSection: Record<string, unknown> = result;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith("#")) continue;

      // Section header [section]
      if (line.startsWith("[") && line.endsWith("]")) {
        const sectionName = line.slice(1, -1);
        const parts = sectionName.split(".");
        currentSection = result;
        for (const part of parts) {
          if (!currentSection[part]) {
            currentSection[part] = {};
          }
          currentSection = currentSection[part] as Record<string, unknown>;
        }
        continue;
      }

      // Key = value
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;

      const key = line.slice(0, eqIdx).trim();
      const value = line.slice(eqIdx + 1).trim();
      currentSection[key] = parseTomlValue(value);
    }

    return { data: result };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "TOML parse error" };
  }
}

function parseTomlValue(value: string): unknown {
  // String (quoted)
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  // Boolean
  if (value === "true") return true;
  if (value === "false") return false;
  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) return parseFloat(value);
  // Array
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map(v => parseTomlValue(v.trim()));
  }
  // String without quotes
  return value;
}

/**
 * Convert object to specified format
 */
export function stringifyContent(data: unknown, format: BlueprintFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);
    case "yaml":
      return toYaml(data);
    case "toml":
      return toToml(data);
    default:
      return JSON.stringify(data, null, 2);
  }
}

function toYaml(data: unknown, indent = 0): string {
  const prefix = "  ".repeat(indent);

  if (data === null || data === undefined) return "null";
  if (typeof data === "boolean") return data ? "true" : "false";
  if (typeof data === "number") return String(data);
  if (typeof data === "string") {
    // Empty string
    if (data === "") return '""';
    // Quote strings with special chars or that look like other types
    if (/[:\[\]{}#&*!|>'"%@`,\n]/.test(data) || /^(true|false|null|\d)/.test(data)) {
      return `"${data.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return data;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return "[]";
    return data.map(item => `${prefix}- ${toYaml(item, indent + 1).trimStart()}`).join("\n");
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, value]) => {
        // For nested objects with content, put on new line
        if (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
          return `${prefix}${key}:\n${toYaml(value, indent + 1)}`;
        }
        // For empty objects, arrays, or primitives, keep inline
        return `${prefix}${key}: ${toYaml(value, 0)}`;
      })
      .join("\n");
  }

  return String(data);
}

function toToml(data: unknown, section = ""): string {
  if (typeof data !== "object" || data === null) return "";

  const lines: string[] = [];
  const nested: [string, unknown][] = [];

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Skip empty objects in TOML (they don't have a good representation)
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      if (Object.keys(value).length > 0) {
        nested.push([key, value]);
      }
      // Empty objects are omitted in TOML
    } else {
      lines.push(`${key} = ${toTomlValue(value)}`);
    }
  }

  // Add section header if needed
  let result = "";
  if (section && lines.length > 0) {
    result = `[${section}]\n`;
  }
  result += lines.join("\n");

  // Process nested sections
  for (const [key, value] of nested) {
    const newSection = section ? `${section}.${key}` : key;
    const nestedContent = toToml(value, newSection);
    if (nestedContent) {
      result += (result ? "\n\n" : "") + nestedContent;
    }
  }

  return result;
}

function toTomlValue(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    // Escape backslashes first, then quotes
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(toTomlValue).join(", ")}]`;
  }
  return '""';
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
export function formatContent(content: string, format: BlueprintFormat): { formatted: string; error?: string } {
  const { data, error } = parseContent(content, format);

  if (error) {
    return { formatted: content, error };
  }

  return { formatted: stringifyContent(data, format) };
}

/**
 * Convert content between formats
 */
export function convertFormat(content: string, fromFormat: BlueprintFormat, toFormat: BlueprintFormat): { content: string; error?: string } {
  if (fromFormat === toFormat) {
    const result = formatContent(content, fromFormat);
    return { content: result.formatted, error: result.error };
  }

  const { data, error } = parseContent(content, fromFormat);

  if (error) {
    return { content, error };
  }

  return { content: stringifyContent(data, toFormat) };
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
    name: "my-service",
    description: "My deployment",
    source: "remote",
    runtime: {
      type: "nodejs",
      version: "20",
    },
    run_cmd: "npm start",
    build_cmd: "npm run build",
    port: 3000,
    working_dir: "",
    remote: {
      url: "",
      branch: "main",
    },
    env_vars: {},
    domain: "",
  };

  return stringifyContent(template, format);
}
