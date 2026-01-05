// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Globe,
  Server,
  Folder,
  Code2,
  FileCode,
  RefreshCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  Activity,
  Timer,
} from "lucide-react";
import type { ProxyApp, ProxyApps } from "@/types";

interface ProxyGraphProps {
  apps: ProxyApps | null;
  instanceName: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onSelectApp?: (domain: string, app: ProxyApp) => void;
  className?: string;
}

interface GraphNode {
  id: string;
  type: "instance" | "proxy" | "app" | "upstream";
  label: string;
  sublabel?: string;
  status?: "running" | "stopped" | "error" | string;
  metadata?: Record<string, unknown>;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  type: "request" | "upstream" | "static";
}

// Template-specific icons and colors
const templateConfig: Record<string, { icon: typeof Globe; color: string; label: string }> = {
  reverse_proxy: { icon: Server, color: "text-blue-500", label: "Reverse Proxy" },
  static: { icon: Folder, color: "text-green-500", label: "Static Files" },
  php_fastcgi: { icon: FileCode, color: "text-purple-500", label: "PHP FastCGI" },
  default: { icon: Code2, color: "text-gray-500", label: "Custom" },
};

const getTemplateConfig = (template: string) => {
  return templateConfig[template] || templateConfig.default;
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case "running":
      return "bg-green-500";
    case "stopped":
      return "bg-yellow-500";
    case "error":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
};

const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "running":
      return "default";
    case "stopped":
      return "secondary";
    case "error":
      return "destructive";
    default:
      return "outline";
  }
};

// Mini status indicator dot
function StatusDot({ status, className }: { status?: string; className?: string }) {
  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)}>
      {status === "running" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      )}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", getStatusColor(status))} />
    </span>
  );
}

// Graph node component
function GraphNodeCard({
  node,
  isSelected,
  onClick,
}: {
  node: GraphNode;
  isSelected: boolean;
  onClick?: () => void;
}) {
  const config = node.type === "app" && node.metadata?.template 
    ? getTemplateConfig(node.metadata.template as string)
    : { icon: Globe, color: "text-muted-foreground", label: "" };
  
  const Icon = node.type === "instance" ? Server : node.type === "proxy" ? Activity : config.icon;

  return (
    <div
      className={cn(
        "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200",
        onClick && "cursor-pointer hover:scale-105"
      )}
      style={{ left: node.x, top: node.y }}
      onClick={onClick}
    >
      <Card
        className={cn(
          "min-w-[140px] transition-shadow",
          isSelected && "ring-2 ring-primary shadow-lg",
          node.type === "instance" && "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20",
          node.type === "proxy" && "border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20",
          node.type === "app" && "border-muted"
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-md", node.type === "instance" ? "bg-blue-100 dark:bg-blue-900" : "bg-muted")}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <StatusDot status={node.status} />
                <span className="text-sm font-medium truncate">{node.label}</span>
              </div>
              {node.sublabel && (
                <span className="text-xs text-muted-foreground truncate block">{node.sublabel}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// SVG edge line with arrow
function GraphEdgeLine({
  from,
  to,
  label,
  type,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  label?: string;
  type: GraphEdge["type"];
}) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  // Calculate arrow angle
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const arrowLength = 10;

  // Arrow points
  const arrowX = to.x - 70 * Math.cos(angle); // Offset from destination
  const arrowY = to.y - 70 * Math.sin(angle);

  const edgeColors = {
    request: "stroke-blue-400",
    upstream: "stroke-green-400",
    static: "stroke-purple-400",
  };

  return (
    <g>
      {/* Main line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x - 70 * Math.cos(angle)}
        y2={to.y - 70 * Math.sin(angle)}
        className={cn("stroke-2", edgeColors[type])}
        strokeDasharray={type === "static" ? "5,5" : undefined}
      />
      {/* Arrow head */}
      <polygon
        points={`
          ${arrowX},${arrowY}
          ${arrowX - arrowLength * Math.cos(angle - Math.PI / 6)},${arrowY - arrowLength * Math.sin(angle - Math.PI / 6)}
          ${arrowX - arrowLength * Math.cos(angle + Math.PI / 6)},${arrowY - arrowLength * Math.sin(angle + Math.PI / 6)}
        `}
        className={cn("fill-current", edgeColors[type].replace("stroke-", "text-"))}
      />
      {/* Label */}
      {label && (
        <text
          x={midX}
          y={midY - 8}
          className="text-xs fill-muted-foreground"
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  );
}

// App detail panel
function AppDetailPanel({
  domain,
  app,
  onClose,
}: {
  domain: string;
  app: ProxyApp;
  onClose: () => void;
}) {
  const config = getTemplateConfig(app.template);
  const Icon = config.icon;

  return (
    <Card className="absolute right-4 top-4 w-80 shadow-lg z-10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.color)} />
            <CardTitle className="text-base">{domain}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
        <CardDescription>{config.label}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {app.status && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={getStatusBadgeVariant(app.status.status)}>
              {app.status.status}
            </Badge>
          </div>
        )}

        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Upstream</span>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted font-mono text-xs">
            <Server className="h-3 w-3" />
            {app.upstream}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Root Directory</span>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted font-mono text-xs">
            <Folder className="h-3 w-3" />
            {app.root}
          </div>
        </div>

        {app.status?.uptime && app.status.uptime > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Uptime
            </span>
            <span className="text-sm">{formatUptime(app.status.uptime)}</span>
          </div>
        )}

        {app.status?.version && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-mono">{app.status.version}</span>
          </div>
        )}

        <div className="pt-2 border-t">
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open in browser
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

export function ProxyGraph({
  apps,
  instanceName,
  isLoading,
  onRefresh,
  onSelectApp,
  className,
}: ProxyGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedApp, setSelectedApp] = useState<{ domain: string; app: ProxyApp } | null>(null);

  // Build graph data from apps
  const { nodes, edges } = useMemo(() => {
    const graphNodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];

    if (!apps || Object.keys(apps).length === 0) {
      return { nodes: graphNodes, edges: graphEdges };
    }

    const appEntries = Object.entries(apps);
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    // Instance node (center-left)
    graphNodes.push({
      id: "instance",
      type: "instance",
      label: instanceName,
      sublabel: "dployr agent",
      status: "running",
      x: 100,
      y: centerY,
    });

    // Proxy node (center)
    graphNodes.push({
      id: "proxy",
      type: "proxy",
      label: "Proxy",
      sublabel: `${appEntries.length} ${appEntries.length === 1 ? 'service' : 'services'}`,
      status: "running",
      x: centerX,
      y: centerY,
    });

    // Edge from instance to proxy
    graphEdges.push({
      from: "instance",
      to: "proxy",
      type: "request",
    });

    // App nodes (arranged in arc on right side)
    appEntries.forEach(([domain, app], index) => {
      const totalApps = appEntries.length;
      const angleSpread = Math.PI * 0.8; // 144 degrees spread
      const startAngle = -angleSpread / 2;
      const angle = startAngle + (totalApps > 1 ? (index / (totalApps - 1)) * angleSpread : 0);

      const x = centerX + radius * Math.cos(angle) + 150;
      const y = centerY + radius * Math.sin(angle);

      graphNodes.push({
        id: domain,
        type: "app",
        label: domain.length > 20 ? domain.substring(0, 17) + "..." : domain,
        sublabel: app.template,
        status: app.status?.status,
        metadata: { template: app.template, upstream: app.upstream },
        x,
        y,
      });

      // Edge from proxy to app
      graphEdges.push({
        from: "proxy",
        to: domain,
        type: app.template === "static" ? "static" : "upstream",
      });
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, [apps, instanceName]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.type === "app" && apps) {
        const app = apps[node.id];
        if (app) {
          setSelectedApp({ domain: node.id, app });
          onSelectApp?.(node.id, app);
        }
      }
    },
    [apps, onSelectApp]
  );

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  if (!apps || Object.keys(apps).length === 0) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No proxy routes configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add a service to see the proxy graph
          </p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground px-2 min-w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetZoom}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset Zoom</TooltipContent>
          </Tooltip>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-background/80 backdrop-blur-sm rounded-md border p-2">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-blue-400" />
            <span className="text-muted-foreground">Request</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-green-400" />
            <span className="text-muted-foreground">Upstream</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-purple-400" style={{ backgroundImage: "repeating-linear-gradient(90deg, currentColor, currentColor 4px, transparent 4px, transparent 8px)" }} />
            <span className="text-muted-foreground">Static</span>
          </div>
        </div>
      </div>

      {/* Graph container */}
      <div
        className="relative w-full h-[500px] overflow-hidden"
        style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
      >
        {/* SVG for edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            return (
              <GraphEdgeLine
                key={`${edge.from}-${edge.to}`}
                from={{ x: fromNode.x, y: fromNode.y }}
                to={{ x: toNode.x, y: toNode.y }}
                label={edge.label}
                type={edge.type}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <GraphNodeCard
            key={node.id}
            node={node}
            isSelected={selectedApp?.domain === node.id}
            onClick={node.type === "app" ? () => handleNodeClick(node) : undefined}
          />
        ))}
      </div>

      {/* Detail panel */}
      {selectedApp && (
        <AppDetailPanel
          domain={selectedApp.domain}
          app={selectedApp.app}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </Card>
  );
}