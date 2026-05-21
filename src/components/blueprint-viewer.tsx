// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from "react";
import { Copy, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BlueprintFormat } from "@/types";

interface BlueprintViewerProps {
  name: string;
  yamlConfig: string;
  jsonConfig: string;
  blueprintFormat: BlueprintFormat;
  setBlueprintFormat: (f: BlueprintFormat) => void;
}

export function BlueprintViewer({ name, yamlConfig, jsonConfig, blueprintFormat, setBlueprintFormat }: BlueprintViewerProps) {
  const [copied, setCopied] = useState(false);
  const content = blueprintFormat === "yaml" ? yamlConfig : jsonConfig;
  const lines = content ? content.split("\n") : [];
  const hasContent = content.trim().length > 0;

  const handleCopy = useCallback(() => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.${blueprintFormat === "yaml" ? "yml" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, name, blueprintFormat]);

  return (
    <div className="rounded-xl border bg-background/40 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-muted/20">
        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded-md">{name}</code>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-md border overflow-hidden">
            <button
              onClick={() => setBlueprintFormat("yaml")}
              className={cn("px-2.5 py-1 text-xs transition-colors", blueprintFormat === "yaml" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
            >
              YAML
            </button>
            <button
              onClick={() => setBlueprintFormat("json")}
              className={cn("px-2.5 py-1 text-xs transition-colors border-l", blueprintFormat === "json" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
            >
              JSON
            </button>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCopy} disabled={!hasContent}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleDownload} disabled={!hasContent}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {hasContent ? (
        <div className="overflow-auto max-h-[600px] bg-muted/20">
          <table className="w-full border-collapse text-xs font-mono">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-muted/40 group">
                  <td className="select-none pr-4 pl-4 py-0 text-right text-muted-foreground/40 w-10 border-r border-border/40 group-hover:text-muted-foreground/70 leading-5 align-top">
                    {i + 1}
                  </td>
                  <td className="pl-4 pr-6 py-0 text-foreground leading-5 whitespace-pre">
                    {line || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-muted-foreground">No blueprint data</p>
          <p className="text-xs text-muted-foreground/60">Connect an instance to generate the service blueprint</p>
        </div>
      )}
    </div>
  );
}
