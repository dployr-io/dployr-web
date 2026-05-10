// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useClusterId } from "@/hooks/use-cluster-id";

interface FeatureGateProps {
  feature: string;
  description?: string;
  requiredPlan?: string;
}

/** Renders as an absolute glass overlay — parent must be `relative overflow-hidden`. */
export function FeatureGate({ feature, description, requiredPlan = "Pro" }: FeatureGateProps) {
  const clusterId = useClusterId();
  const billingHref = clusterId ? `/clusters/${clusterId}/settings/billing` : "/settings/billing";

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[3px] bg-background/30">
      {/* Glass card */}
      <div className="flex flex-col items-center text-center gap-3 max-w-xs px-6 py-5 rounded-2xl border border-border/50 bg-background/70 shadow-lg backdrop-blur-xl">
        <div className="h-9 w-9 rounded-xl bg-muted/80 border border-border/40 flex items-center justify-center">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">{feature}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description ?? `${feature} is available on the ${requiredPlan} plan and above.`}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" asChild>
            <Link to={billingHref as any}>Upgrade your plan</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to={billingHref as any} search={{ compare: true } as any}>Learn more</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Faint file-tree skeleton rendered behind the glass gate. */
export function FileExplorerGatePlaceholder() {
  const entries = [
    { name: "app", type: "dir", indent: 0 },
    { name: "controllers", type: "dir", indent: 1 },
    { name: "models", type: "dir", indent: 1 },
    { name: "views", type: "dir", indent: 1 },
    { name: "config", type: "dir", indent: 0 },
    { name: "database.yml", type: "file", indent: 1 },
    { name: "routes.rb", type: "file", indent: 1 },
    { name: "public", type: "dir", indent: 0 },
    { name: "package.json", type: "file", indent: 0 },
    { name: "tsconfig.json", type: "file", indent: 0 },
    { name: ".env", type: "file", indent: 0 },
    { name: "README.md", type: "file", indent: 0 },
  ];

  const fileRows = [
    { name: "server.ts", size: "4.2 KB", modified: "2 days ago" },
    { name: "index.html", size: "1.8 KB", modified: "5 days ago" },
    { name: "styles.css", size: "12.4 KB", modified: "1 week ago" },
    { name: "app.config.ts", size: "2.1 KB", modified: "3 days ago" },
    { name: "package-lock.json", size: "248 KB", modified: "2 days ago" },
    { name: "tsconfig.json", size: "0.9 KB", modified: "1 week ago" },
    { name: ".gitignore", size: "0.3 KB", modified: "2 weeks ago" },
    { name: "Makefile", size: "1.1 KB", modified: "4 days ago" },
  ];

  return (
    <div className="h-full w-full flex select-none pointer-events-none" aria-hidden>
      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r bg-muted/20 overflow-hidden">
        <div className="px-3 py-2 border-b">
          <span className="text-xs font-medium text-foreground/50">Files</span>
        </div>
        <div className="p-1">
          {entries.map((e, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-[5px] rounded text-xs"
              style={{ paddingLeft: `${8 + e.indent * 14}px` }}
            >
              <span className={`text-[10px] ${e.type === "dir" ? "text-foreground/40" : "text-foreground/30"}`}>
                {e.type === "dir" ? "▶" : "·"}
              </span>
              <span className={`truncate ${e.type === "dir" ? "text-foreground/60 font-medium" : "text-foreground/45"}`}>
                {e.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b text-xs text-foreground/40">
          <span>/app</span>
          <span className="ml-auto">Name</span>
          <span className="w-16 text-right">Size</span>
          <span className="w-24 text-right">Modified</span>
        </div>
        {/* Rows */}
        <div className="divide-y divide-border/30">
          {fileRows.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 text-xs">
              <span className="text-foreground/30 text-[10px]">·</span>
              <span className="flex-1 text-foreground/55 truncate">{f.name}</span>
              <span className="text-foreground/35 w-16 text-right">{f.size}</span>
              <span className="text-foreground/35 w-24 text-right">{f.modified}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
