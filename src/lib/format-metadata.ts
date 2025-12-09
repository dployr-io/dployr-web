// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

/**
 * Parses a value, attempting to expand JSON strings into objects.
 */
export function parseValue(val: unknown): unknown {
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
    } catch {
      // Not JSON
    }
  }
  return val;
}

/**
 * Formats a metadata value for display.
 * Returns an array of { label, value, indent } for flat rendering.
 */
export interface FormattedEntry {
  label: string;
  value: string | null;
  indent: number;
  isNested: boolean;
}

export function formatMetadata(
  metadata: Record<string, unknown>,
): FormattedEntry[] {
  const entries: FormattedEntry[] = [];

  const process = (obj: Record<string, unknown>, indent: number) => {
    for (const [key, rawVal] of Object.entries(obj)) {
      const val = parseValue(rawVal);

      if (val === null || val === undefined) {
        entries.push({ label: key, value: null, indent, isNested: false });
      } else if (typeof val === "object" && !Array.isArray(val)) {
        entries.push({ label: key, value: null, indent, isNested: true });
        process(val as Record<string, unknown>, indent + 1);
      } else if (Array.isArray(val)) {
        entries.push({ label: key, value: `[${val.length} items]`, indent, isNested: false });
      } else {
        entries.push({ label: key, value: String(val), indent, isNested: false });
      }
    }
  };

  process(metadata, 0);
  return entries;
}

/**
 * Returns color class for a metadata label.
 * Only errors/warnings get distinct colors; everything else is muted for consistency.
 */
export function getLabelColor(label: string): string {
  const lower = label.toLowerCase();
  if (lower === "error" || lower === "code") {
    return "text-red-400";
  }
  return "text-muted-foreground";
}
