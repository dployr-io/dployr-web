// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Timer, Copy, Check, Trash2 } from "lucide-react";
import type { ProxyApp } from "@/types";
import { StatusDot } from "./status-dot";
import { formatUptime } from "./utils";

export function DetailPanel({
  domain,
  app,
  onClose,
  onRemove,
}: {
  domain: string;
  app: ProxyApp;
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
    <Card className="absolute right-4 bottom-20 w-72 bg-slate-900 border-slate-700 shadow-xl z-20">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm text-white">{domain}</CardTitle>
            <CardDescription className="text-xs capitalize text-slate-400">
              {app.template?.replace(/_/g, " ") || "Service"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Status */}
        {app.status && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Status</span>
            <Badge variant="outline" className="text-[10px] gap-1.5 border-slate-600">
              <StatusDot status={app.status.status} pulse={false} />
              <span className="capitalize text-slate-300">{app.status.status}</span>
            </Badge>
          </div>
        )}

        {/* Upstream */}
        <div className="space-y-1">
          <span className="text-xs text-slate-400">Upstream</span>
          <code className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded block truncate">
            {app.upstream}
          </code>
        </div>

        {/* Uptime */}
        {app.status?.uptime && app.status.uptime > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Uptime
            </span>
            <span className="text-xs text-slate-300">{formatUptime(app.status.uptime)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-700">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs border-slate-600 text-slate-300" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs border-slate-600 text-slate-300" asChild>
            <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </a>
          </Button>
        </div>
        
        {onRemove && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Remove Route
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
