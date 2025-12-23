// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useCallback } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { StreamLanguage } from "@codemirror/language";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { oneDark } from "@codemirror/theme-one-dark";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Copy, RotateCcw, Wand2 } from "lucide-react";

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

// VS Code Dark+ inspired theme extension
const vsCodeDarkTheme = EditorView.theme({
  "&": {
    backgroundColor: "#1e1e1e",
    color: "#d4d4d4",
  },
  ".cm-content": {
    caretColor: "#aeafad",
    fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#aeafad",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "#264f78",
  },
  ".cm-panels": {
    backgroundColor: "#252526",
    color: "#d4d4d4",
  },
  ".cm-panels.cm-panels-top": {
    borderBottom: "1px solid #3c3c3c",
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid #3c3c3c",
  },
  ".cm-searchMatch": {
    backgroundColor: "#515c6a",
    outline: "1px solid #74879f",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "#613214",
  },
  ".cm-activeLine": {
    backgroundColor: "#2a2d2e",
  },
  ".cm-selectionMatch": {
    backgroundColor: "#3a3d41",
  },
  "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
    backgroundColor: "#0064001a",
    outline: "1px solid #888",
  },
  ".cm-gutters": {
    backgroundColor: "#1e1e1e",
    color: "#858585",
    border: "none",
    borderRight: "1px solid #3c3c3c",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#2a2d2e",
    color: "#c6c6c6",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: "#6a9955",
  },
  ".cm-tooltip": {
    border: "1px solid #454545",
    backgroundColor: "#252526",
  },
  ".cm-tooltip .cm-tooltip-arrow:before": {
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
  },
  ".cm-tooltip .cm-tooltip-arrow:after": {
    borderTopColor: "#252526",
    borderBottomColor: "#252526",
  },
  ".cm-tooltip-autocomplete": {
    "& > ul > li[aria-selected]": {
      backgroundColor: "#094771",
      color: "#fff",
    },
  },
  ".cm-lintRange-error": {
    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%23f14c4c' fill='none' stroke-width='.7'/></svg>")`,
  },
  ".cm-lintRange-warning": {
    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%23cca700' fill='none' stroke-width='.7'/></svg>")`,
  },
  ".cm-lintPoint-error:after": {
    borderBottomColor: "#f14c4c",
  },
  ".cm-lintPoint-warning:after": {
    borderBottomColor: "#cca700",
  },
}, { dark: true });

// Get language extension based on format
function getLanguageExtension(language: BlueprintFormat) {
  switch (language) {
    case "json":
      return json();
    case "yaml":
      return yaml();
    case "toml":
      return StreamLanguage.define(toml);
    default:
      return json();
  }
}

// Create a linter from external errors
function createExternalLinter(errors: SchemaError[]) {
  return linter(() => {
    return errors.map((error): Diagnostic => ({
      from: 0,
      to: 0,
      severity: "error",
      message: error.path ? `${error.path}: ${error.message}` : error.message,
    }));
  });
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
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const valueRef = useRef(value);
  const hasErrors = errors.length > 0;

  // Keep value ref in sync
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Create stable update listener
  const updateListener = useCallback(() => {
    return EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newValue = update.state.doc.toString();
        // Update the ref immediately to prevent sync loop
        valueRef.current = newValue;
        onChange(newValue);
      }
    });
  }, [onChange]);

  // Initialize editor
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        getLanguageExtension(language),
        vsCodeDarkTheme,
        oneDark,
        updateListener(),
        EditorView.editable.of(!disabled),
        EditorState.readOnly.of(disabled),
        lintGutter(),
        createExternalLinter(errors),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, [language, disabled, updateListener]);

  // Update content when value prop changes externally
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    // Only update if the value is different from what's in the editor
    // and different from what we last set (to avoid loops)
    if (currentValue !== value && valueRef.current !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
      valueRef.current = value;
    }
  }, [value]);

  // Update linter when errors change
  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    const newState = EditorState.create({
      doc: view.state.doc,
      selection: view.state.selection,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        getLanguageExtension(language),
        vsCodeDarkTheme,
        oneDark,
        updateListener(),
        EditorView.editable.of(!disabled),
        EditorState.readOnly.of(disabled),
        lintGutter(),
        createExternalLinter(errors),
        EditorView.lineWrapping,
      ],
    });

    view.setState(newState);
  }, [errors, language, disabled, updateListener]);

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
      <div
        className={`relative rounded-lg overflow-hidden border bg-[#1e1e1e] ${
          hasErrors ? "border-red-500/50" : "border-neutral-700"
        }`}
      >
        {/* Header with filename and toolbar */}
        <div className="flex items-center justify-between bg-[#252526] px-3 py-2 border-b border-neutral-700">
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400 font-mono">{filename}</span>
            {showFormatSelector && onFormatChange && (
              <Select value={language} onValueChange={(value) => onFormatChange(value as BlueprintFormat)}>
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
                <span className="text-xs">
                  {errors.length} error{errors.length > 1 ? "s" : ""}
                </span>
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

        {/* CodeMirror editor area */}
        <div
          ref={editorContainerRef}
          className="codemirror-wrapper"
          style={{ minHeight }}
        />

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
