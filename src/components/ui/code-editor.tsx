// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Copy, RotateCcw, Wand2 } from "lucide-react";
import { useCallback, useMemo, useRef, type ReactNode } from "react";
import type { BlueprintFormat } from "@/types";
import type { SchemaError } from "@/lib/blueprint-schema";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: BlueprintFormat;
  filename?: string;
  disabled?: boolean;
  minHeight?: number;
  onFormat?: () => void;
  onReset?: () => void;
  onFormatChange?: (format: BlueprintFormat) => void;
  errors?: SchemaError[];
  showFormatSelector?: boolean;
}

// VS Code syntax highlighting colors
const SYNTAX_COLORS = {
  key: "#9cdcfe", // light blue
  string: "#ce9178", // orange
  number: "#b5cea8", // green
  boolean: "#569cd6", // blue
  null: "#569cd6", // blue
  punctuation: "#d4d4d4", // light gray
  whitespace: "#1e1e1e", // background
};

function highlightJSON(text: string): ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts: ReactNode[] = [];
    let i = 0;

    while (i < line.length) {
      // Skip whitespace
      if (/\s/.test(line[i])) {
        const wsStart = i;
        while (i < line.length && /\s/.test(line[i])) i++;
        parts.push(
          <span key={`${lineIdx}-ws-${wsStart}`} style={{ color: SYNTAX_COLORS.whitespace }}>
            {line.slice(wsStart, i)}
          </span>
        );
        continue;
      }

      // String (quoted)
      if (line[i] === '"') {
        const strStart = i;
        i++;
        while (i < line.length && line[i] !== '"') {
          if (line[i] === "\\") i++;
          i++;
        }
        if (i < line.length) i++;
        const str = line.slice(strStart, i);
        // Check if it's a key (followed by :)
        const isKey = /:\s*$/.test(line.slice(i));
        parts.push(
          <span key={`${lineIdx}-str-${strStart}`} style={{ color: isKey ? SYNTAX_COLORS.key : SYNTAX_COLORS.string }}>
            {str}
          </span>
        );
        continue;
      }

      // Numbers
      if (/\d/.test(line[i])) {
        const numStart = i;
        while (i < line.length && /[\d.]/.test(line[i])) i++;
        parts.push(
          <span key={`${lineIdx}-num-${numStart}`} style={{ color: SYNTAX_COLORS.number }}>
            {line.slice(numStart, i)}
          </span>
        );
        continue;
      }

      // Boolean and null
      if (line.slice(i, i + 4) === "true" || line.slice(i, i + 5) === "false") {
        const len = line.slice(i, i + 4) === "true" ? 4 : 5;
        parts.push(
          <span key={`${lineIdx}-bool-${i}`} style={{ color: SYNTAX_COLORS.boolean }}>
            {line.slice(i, i + len)}
          </span>
        );
        i += len;
        continue;
      }

      if (line.slice(i, i + 4) === "null") {
        parts.push(
          <span key={`${lineIdx}-null-${i}`} style={{ color: SYNTAX_COLORS.null }}>
            null
          </span>
        );
        i += 4;
        continue;
      }

      // Punctuation
      if (/[{}[\]:,]/.test(line[i])) {
        parts.push(
          <span key={`${lineIdx}-punc-${i}`} style={{ color: SYNTAX_COLORS.punctuation }}>
            {line[i]}
          </span>
        );
        i++;
        continue;
      }

      // Default
      parts.push(
        <span key={`${lineIdx}-char-${i}`} style={{ color: SYNTAX_COLORS.punctuation }}>
          {line[i]}
        </span>
      );
      i++;
    }

    return <div key={lineIdx}>{parts}</div>;
  });
}

function highlightYAML(text: string): ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts: ReactNode[] = [];

    // Comment
    if (line.trim().startsWith("#")) {
      return (
        <div key={lineIdx}>
          <span style={{ color: "#6a9955" }}>{line}</span>
        </div>
      );
    }

    // Key: value pattern
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx);
      const rest = line.slice(colonIdx);

      // Leading whitespace
      const leadingWs = key.match(/^(\s*)/)?.[1] || "";
      const keyName = key.slice(leadingWs.length);

      parts.push(
        <span key={`${lineIdx}-ws`} style={{ color: SYNTAX_COLORS.whitespace }}>
          {leadingWs}
        </span>
      );
      parts.push(
        <span key={`${lineIdx}-key`} style={{ color: SYNTAX_COLORS.key }}>
          {keyName}
        </span>
      );
      parts.push(
        <span key={`${lineIdx}-colon`} style={{ color: SYNTAX_COLORS.punctuation }}>
          :
        </span>
      );

      const value = rest.slice(1).trim();
      if (value) {
        parts.push(
          <span key={`${lineIdx}-space`} style={{ color: SYNTAX_COLORS.whitespace }}>
            {" "}
          </span>
        );
        parts.push(highlightYAMLValue(value, lineIdx));
      }
    } else {
      // List item or plain text
      if (line.trim().startsWith("-")) {
        const leadingWs = line.match(/^(\s*)/)?.[1] || "";
        const afterDash = line.slice(leadingWs.length + 1).trim();
        parts.push(
          <span key={`${lineIdx}-ws`} style={{ color: SYNTAX_COLORS.whitespace }}>
            {leadingWs}
          </span>
        );
        parts.push(
          <span key={`${lineIdx}-dash`} style={{ color: SYNTAX_COLORS.punctuation }}>
            -
          </span>
        );
        if (afterDash) {
          parts.push(
            <span key={`${lineIdx}-space`} style={{ color: SYNTAX_COLORS.whitespace }}>
              {" "}
            </span>
          );
          parts.push(highlightYAMLValue(afterDash, lineIdx));
        }
      } else {
        parts.push(
          <span key={`${lineIdx}-text`} style={{ color: SYNTAX_COLORS.string }}>
            {line}
          </span>
        );
      }
    }

    return <div key={lineIdx}>{parts}</div>;
  });
}

function highlightYAMLValue(value: string, lineIdx: number): ReactNode {
  // Boolean
  if (value === "true" || value === "false") {
    return (
      <span key={`${lineIdx}-val`} style={{ color: SYNTAX_COLORS.boolean }}>
        {value}
      </span>
    );
  }
  // Null
  if (value === "null" || value === "~") {
    return (
      <span key={`${lineIdx}-val`} style={{ color: SYNTAX_COLORS.null }}>
        {value}
      </span>
    );
  }
  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return (
      <span key={`${lineIdx}-val`} style={{ color: SYNTAX_COLORS.number }}>
        {value}
      </span>
    );
  }
  // String
  return (
    <span key={`${lineIdx}-val`} style={{ color: SYNTAX_COLORS.string }}>
      {value}
    </span>
  );
}

function highlightTOML(text: string): ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts: ReactNode[] = [];
    const trimmed = line.trim();

    // Comment
    if (trimmed.startsWith("#")) {
      return (
        <div key={lineIdx}>
          <span style={{ color: "#6a9955" }}>{line}</span>
        </div>
      );
    }

    // Section header [section]
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      return (
        <div key={lineIdx}>
          <span style={{ color: SYNTAX_COLORS.key }}>{line}</span>
        </div>
      );
    }

    // Key = value pattern
    const eqIdx = line.indexOf("=");
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx);
      const value = line.slice(eqIdx + 1).trim();

      parts.push(
        <span key={`${lineIdx}-key`} style={{ color: SYNTAX_COLORS.key }}>
          {key}
        </span>
      );
      parts.push(
        <span key={`${lineIdx}-eq`} style={{ color: SYNTAX_COLORS.punctuation }}>
          =
        </span>
      );
      parts.push(
        <span key={`${lineIdx}-space`} style={{ color: SYNTAX_COLORS.whitespace }}>
          {" "}
        </span>
      );
      parts.push(highlightTOMLValue(value, lineIdx));
    } else {
      parts.push(
        <span key={`${lineIdx}-text`} style={{ color: SYNTAX_COLORS.punctuation }}>
          {line}
        </span>
      );
    }

    return <div key={lineIdx}>{parts}</div>;
  });
}

function highlightTOMLValue(value: string, lineIdx: number): ReactNode {
  // String (quoted)
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return (
      <span key={`${lineIdx}-val`} style={{ color: SYNTAX_COLORS.string }}>
        {value}
      </span>
    );
  }
  // Boolean
  if (value === "true" || value === "false") {
    return (
      <span key={`${lineIdx}-val`} style={{ color: SYNTAX_COLORS.boolean }}>
        {value}
      </span>
    );
  }
  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return (
      <span key={`${lineIdx}-val`} style={{ color: SYNTAX_COLORS.number }}>
        {value}
      </span>
    );
  }
  // Array
  if (value.startsWith("[")) {
    return (
      <span key={`${lineIdx}-val`} style={{ color: SYNTAX_COLORS.punctuation }}>
        {value}
      </span>
    );
  }
  // String without quotes
  return (
    <span key={`${lineIdx}-val`} style={{ color: SYNTAX_COLORS.string }}>
      {value}
    </span>
  );
}

function highlightCode(text: string, language: BlueprintFormat): ReactNode[] {
  switch (language) {
    case "json":
      return highlightJSON(text);
    case "yaml":
      return highlightYAML(text);
    case "toml":
      return highlightTOML(text);
    default:
      return highlightJSON(text);
  }
}

export function CodeEditor({
  value,
  onChange,
  language = "json",
  filename = "file.json",
  disabled = false,
  minHeight = 400,
  onFormat,
  onReset,
  onFormatChange,
  errors = [],
  showFormatSelector = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lines = useMemo(() => value.split("\n"), [value]);
  const highlightedLines = useMemo(() => highlightCode(value, language), [value, language]);
  const hasErrors = errors.length > 0;

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  }, [value]);

  const handleFormat = useCallback(() => {
    if (onFormat) {
      onFormat();
      return;
    }
    // Default JSON formatting
    if (language === "json") {
      try {
        const parsed = JSON.parse(value);
        onChange(JSON.stringify(parsed, null, 2));
      } catch {
        // invalid JSON
      }
    }
  }, [value, onChange, language, onFormat]);

  return (
    <div className="flex flex-col gap-0">
      {/* Editor container */}
      <div className={`relative rounded-lg overflow-hidden border bg-[#1e1e1e] ${hasErrors ? "border-red-500/50" : "border-neutral-700"}`}>
        {/* Header with filename and toolbar */}
        <div className="flex items-center justify-between bg-[#252526] px-3 py-2 border-b border-neutral-700">
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400 font-mono">{filename}</span>
            {showFormatSelector && onFormatChange && (
              <Select value={language} onValueChange={value => onFormatChange(value as BlueprintFormat)}>
                <SelectTrigger className="h-6 w-20 bg-transparent border-neutral-600 text-xs text-neutral-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="yaml">YAML</SelectItem>
                  <SelectItem value="toml">TOML</SelectItem>
                </SelectContent>
              </Select>
            )}
            {/* Validation status */}
            {hasErrors ? (
              <div className="flex items-center gap-1 text-red-400">
                <AlertCircle className="h-3 w-3" />
                <span className="text-xs">{errors.length} error{errors.length > 1 ? "s" : ""}</span>
              </div>
            ) : value.trim() ? (
              <div className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                <span className="text-xs">Valid</span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                  onClick={handleFormat}
                  disabled={disabled}
                >
                  <Wand2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Format {language.toUpperCase()}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                  onClick={handleCopy}
                  disabled={disabled}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Copy to clipboard</TooltipContent>
            </Tooltip>
            {onReset && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                    onClick={onReset}
                    disabled={disabled}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Reset to default</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Editor area */}
        <div className="relative flex" style={{ minHeight }}>
          {/* Line numbers */}
          <div className="w-10 bg-[#1e1e1e] border-r border-neutral-800 select-none pointer-events-none shrink-0">
            <div className="py-3 px-2 text-right">
              {lines.map((_, i) => (
                <div key={i} className="text-xs leading-5 text-neutral-600 font-mono h-5">
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Editor wrapper - contains both textarea and syntax highlighting */}
          <div className="relative flex-1">
            {/* Syntax highlighted overlay (read-only) */}
            <pre
              ref={preRef}
              className="absolute inset-0 text-neutral-100 font-mono text-sm leading-5 p-3 m-0 pointer-events-none overflow-hidden whitespace-pre-wrap"
              style={{ wordBreak: "break-word" }}
            >
              {highlightedLines}
            </pre>

            {/* Textarea (transparent, on top) */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              onScroll={handleScroll}
              disabled={disabled}
              spellCheck={false}
              className="absolute inset-0 w-full h-full bg-transparent text-transparent font-mono text-sm leading-5 p-3 m-0 resize-none focus:outline-none focus:ring-0 border-0 caret-white overflow-auto"
              style={{
                tabSize: 2,
              }}
            />
          </div>
        </div>

        {/* Error panel */}
        {hasErrors && (
          <div className="bg-[#1e1e1e] border-t border-neutral-700 px-3 py-2 max-h-32 overflow-auto">
            <div className="text-xs font-medium text-red-400 mb-1">Problems</div>
            <div className="space-y-1">
              {errors.map((error, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-neutral-300">
                    {error.path && <span className="text-neutral-500">{error.path}: </span>}
                    {error.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
