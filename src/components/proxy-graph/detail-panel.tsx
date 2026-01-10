// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Check, Trash2 } from "lucide-react";
import type { NormalizedProxyRoute } from "@/types";

export function DetailPanel({
  domain,
  app,
  onClose,
  onRemove,
}: {
  domain: string;
  app: NormalizedProxyRoute;
  onClose: () => void;
  onRemove?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(domain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="absolute right-4 bottom-20 w-72 bg-background border border-stone-700 rounded-md shadow-lg z-20 font-mono">
      <div className="flex items-start justify-between p-3 border-b border-stone-700">
        <div className="space-y-0.5">
          <h3 className="text-sm font-mono font-semibold">{domain}</h3>
          <p className="text-[10px] text-muted-foreground capitalize font-mono">
            {app.template?.replace(/_/g, " ") || "Service"}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 text-muted-foreground hover:text-foreground" onClick={onClose}>
          ×
        </Button>
      </div>
      
      <div className="space-y-3 p-3">
        {/* Upstream */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground font-mono">Upstream</span>
          <code className="text-[10px] bg-muted px-2 py-1 rounded block font-mono">
            {app.upstream}
          </code>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono">Status</span>
          <span className="text-[10px] tabular-nums font-mono">{app.status}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" asChild>
            <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          {onRemove && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
