// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";

export type FormattedFileLanguage = "json" | "yaml" | "toml";

interface FormattedFileProps {
  language: FormattedFileLanguage;
  value: unknown;
  className?: string;
}

interface JsonValueProps {
  value: any;
  path: string;
  depth: number;
  expanded: Set<string>;
  toggle: (path: string) => void;
}

function JsonValue({ value, path, depth, expanded, toggle }: JsonValueProps) {
  // Primitive values
  if (value === null || value === undefined) {
    return <span className="text-neutral-500">{String(value)}</span>;
  }

  if (typeof value === "string") {
    return <span className="text-green-400">"{value}"</span>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="text-blue-400">{String(value)}</span>;
  }

  // Arrays
  if (Array.isArray(value)) {
    const isExpanded = expanded.has(path);
    if (value.length === 0) {
      return <span className="text-neutral-500">[]</span>;
    }

    return (
      <div>
        <button
          type="button"
          onClick={() => toggle(path)}
          className="inline-flex h-4 w-4 items-center justify-center rounded border border-neutral-700 bg-neutral-900 text-[10px] leading-none hover:bg-neutral-800"
        >
          {isExpanded ? "-" : "+"}
        </button>
        <span className="ml-1 text-neutral-500">[{value.length}]</span>
        {isExpanded && (
          <div className="ml-4 space-y-0.5 border-l border-neutral-800 pl-2">
            {value.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-neutral-600">{idx}:</span>
                <JsonValue
                  value={item}
                  path={`${path}[${idx}]`}
                  depth={depth + 1}
                  expanded={expanded}
                  toggle={toggle}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Objects
  if (typeof value === "object") {
    const entries = Object.entries(value);
    const isExpanded = expanded.has(path);

    if (entries.length === 0) {
      return <span className="text-neutral-500">{"{}"}</span>;
    }

    return (
      <div>
        <button
          type="button"
          onClick={() => toggle(path)}
          className="inline-flex h-4 w-4 items-center justify-center rounded border border-neutral-700 bg-neutral-900 text-[10px] leading-none hover:bg-neutral-800"
        >
          {isExpanded ? "-" : "+"}
        </button>
        <span className="ml-1 text-neutral-500">{"{"}{entries.length}{"}"}</span>
        {isExpanded && (
          <div className="ml-4 space-y-0.5 border-l border-neutral-800 pl-2">
            {entries.map(([key, val]) => (
              <div key={key} className="flex gap-2">
                <span className="text-neutral-400">{key}:</span>
                <JsonValue
                  value={val}
                  path={`${path}.${key}`}
                  depth={depth + 1}
                  expanded={expanded}
                  toggle={toggle}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span className="text-neutral-500">{String(value)}</span>;
}

export function FormattedFile({ language, value, className }: FormattedFileProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["root"]));

  const toggle = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const baseClass =
    "flex-1 overflow-auto rounded-md bg-neutral-950/90 p-3 text-xs text-neutral-100 font-mono";
  const mergedClass = className ? `${baseClass} ${className}` : baseClass;

  if (language === "json") {
    let parsed: any = value;
    if (typeof value === "string") {
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = value;
      }
    }

    return (
      <div className={mergedClass}>
        <JsonValue value={parsed} path="root" depth={0} expanded={expanded} toggle={toggle} />
      </div>
    );
  }

  // For yaml and toml, just pretty-print for now.
  const text =
    typeof value === "string" ? value : (() => {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    })();

  return (
    <pre className={mergedClass}>{text}</pre>
  );
}
