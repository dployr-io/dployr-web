// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState, useCallback, useRef } from "react";
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
  Timer,
  Network,
  Copy,
  Check,
} from "lucide-react";
import type { ProxyApp, ProxyApps, Service } from "@/types";

interface ProxyGraphVisualizerProps {
  apps: ProxyApps | null;
  services?: Service[];
  instanceName: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onSelectApp?: (domain: string, app: ProxyApp) => void;
  className?: string;
}

// Template configuration
const templateConfig: Record<string, { icon: typeof Globe; color: string; bgColor: string; label: string }> = {
  reverse_proxy: { 
    icon: Server, 
    color: "text-blue-500", 
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
    label: "Reverse Proxy" 
  },
  static: { 
    icon: Folder, 
    color: "text-green-500", 
    bgColor: "bg-green-100 dark:bg-green-900/50",
    label: "Static Files" 
  },
  php_fastcgi: { 
    icon: FileCode, 
    color: "text-purple-500", 
    bgColor: "bg-purple-100 dark:bg-purple-900/50",
    label: "PHP FastCGI" 
  },
  default: { 
    icon: Code2, 
    color: "text-gray-500", 
    bgColor: "bg-gray-100 dark:bg-gray-800",
    label: "Custom" 
  },
};

const getTemplateConfig = (template: string) => {
  return templateConfig[template] || templateConfig.default;
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case "running":
      return { dot: "bg-green-500", ring: "ring-green-500/20" };
    case "stopped":
      return { dot: "bg-yellow-500", ring: "ring-yellow-500/20" };
    case "error":
      return { dot: "bg-red-500", ring: "ring-red-500/20" };
    default:
      return { dot: "bg-gray-400", ring: "ring-gray-400/20" };
  }
};

// Animated status indicator
function StatusIndicator({ status, size = "md" }: { status?: string; size?: "sm" | "md" | "lg" }) {
  const colors = getStatusColor(status);
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  return (
    <span className={cn("relative flex", sizeClasses[size])}>
      {status === "running" && (
        <span 
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            colors.dot
          )} 
        />
      )}
      <span className={cn("relative inline-flex rounded-full", sizeClasses[size], colors.dot)} />
    </span>
  );
}

// Connection line SVG component
function ConnectionLine({ 
  x1, y1, x2, y2, 
  animated = false,
  color = "stroke-muted-foreground/30"
}: { 
  x1: number; 
  y1: number; 
  x2: number; 
  y2: number;
  animated?: boolean;
  color?: string;
}) {
  const controlOffset = Math.abs(x2 - x1) * 0.3;
  const path = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;

  return (
    <g>
      <path
        d={path}
        fill="none"
        className={cn("stroke-2", color)}
        strokeLinecap="round"
      />
      {animated && (
        <circle r="4" className="fill-primary">
          <animateMotion dur="3s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </g>
  );
}

// Instance node (left side)
function InstanceNode({ 
  name, 
  x, 
  y,
}: { 
  name: string; 
  x: number; 
  y: number;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x="-70"
        y="-35"
        width="140"
        height="70"
        rx="12"
        className="fill-blue-50 dark:fill-blue-950/50 stroke-blue-200 dark:stroke-blue-800 stroke-2"
      />
      <foreignObject x="-60" y="-25" width="120" height="50">
        <div className="flex flex-col items-center justify-center h-full">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 mb-1">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs font-medium text-center truncate max-w-[100px]">
            {name}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

// Proxy hub node (center)
function ProxyHubNode({ 
  x, 
  y, 
  routeCount,
  status 
}: { 
  x: number; 
  y: number;
  routeCount: number;
  status: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Outer animated ring */}
      <circle
        r="55"
        className="fill-none stroke-purple-300/30 dark:stroke-purple-700/30 stroke-3"
        strokeDasharray="8 4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0"
          to="360"
          dur="20s"
          repeatCount="indefinite"
        />
      </circle>
      
      {/* Main circle */}
      <circle
        r="45"
        className="fill-purple-50 dark:fill-purple-950/50 stroke-purple-200 dark:stroke-purple-800 stroke-2"
      />
      
      <foreignObject x="-35" y="-35" width="70" height="70">
        <div className="flex flex-col items-center justify-center h-full">
          <div className="relative">
            <Network className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <span className="absolute -top-1 -right-1">
              <StatusIndicator status={status} size="sm" />
            </span>
          </div>
          <span className="text-xs font-semibold mt-1">Proxy</span>
          <span className="text-[10px] text-muted-foreground">{routeCount} routes</span>
        </div>
      </foreignObject>
    </g>
  );
}

// Service node (right side) - handles both proxied and non-proxied services
function ServiceNodeWithStatus({
  service,
  proxyApp,
  isProxied,
  x,
  y,
  isSelected,
  onClick,
}: {
  service: Service;
  proxyApp: ProxyApp | null | undefined;
  isProxied: boolean;
  x: number;
  y: number;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const config = proxyApp ? getTemplateConfig(proxyApp.template) : templateConfig.default;
  const Icon = config.icon;
  const colors = getStatusColor(proxyApp?.status?.status);
  const displayName = service.name.length > 18 ? service.name.substring(0, 15) + "..." : service.name;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={cn("cursor-pointer", onClick && "hover:opacity-90")}
      onClick={onClick}
    >
      <rect
        x="-85"
        y="-40"
        width="170"
        height="80"
        rx="10"
        className={cn(
          "stroke-2 transition-all",
          isProxied ? "fill-card stroke-border" : "fill-muted/50 stroke-muted-foreground/30 stroke-dashed",
          isSelected && "stroke-primary"
        )}
      />
      
      {/* Status indicator */}
      {isProxied ? (
        <circle cx="70" cy="-25" r="6" className={colors.dot}>
          {proxyApp?.status?.status === "running" && (
            <animate
              attributeName="opacity"
              values="1;0.5;1"
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      ) : (
        <circle cx="70" cy="-25" r="6" className="fill-yellow-500">
          <title>Not proxied - service not reachable</title>
        </circle>
      )}
      
      <foreignObject x="-80" y="-35" width="160" height="70">
        <div className={cn("flex flex-col h-full p-2", !isProxied && "opacity-60")}>
          <div className="flex items-center gap-2 mb-1">
            <div className={cn("p-1.5 rounded-md", config.bgColor)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" title={service.name}>
                {displayName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isProxied ? config.label : "Not Proxied"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-auto">
            <code className="text-[9px] bg-muted px-1 py-0.5 rounded truncate flex-1">
              {proxyApp?.upstream || `localhost:${service.port}`}
            </code>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

// Detail panel for selected service
function ServiceDetailPanel({
  domain,
  app,
  onClose,
}: {
  domain: string;
  app: ProxyApp;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const config = getTemplateConfig(app.template);
  const Icon = config.icon;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(domain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  return (
    <Card className="absolute right-4 top-20 w-80 shadow-xl z-20 border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", config.bgColor)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <CardTitle className="text-sm">{domain}</CardTitle>
              <CardDescription className="text-xs">{config.label}</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status */}
        {app.status && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant={
                app.status.status === "running"
                  ? "default"
                  : app.status.status === "error"
                  ? "destructive"
                  : "secondary"
              }
            >
              <StatusIndicator status={app.status.status} size="sm" />
              <span className="ml-1.5 capitalize">{app.status.status}</span>
            </Badge>
          </div>
        )}

        {/* Upstream */}
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Upstream</span>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
            <Server className="h-4 w-4 text-muted-foreground shrink-0" />
            <code className="text-xs font-mono truncate flex-1">{app.upstream}</code>
          </div>
        </div>

        {/* Root Directory */}
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Root Directory</span>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <code className="text-xs font-mono truncate flex-1">{app.root}</code>
          </div>
        </div>

        {/* Uptime */}
        {app.status?.uptime && app.status.uptime > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" />
              Uptime
            </span>
            <span className="text-sm font-medium">{formatUptime(app.status.uptime)}</span>
          </div>
        )}

        {/* Version */}
        {app.status?.version && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">{app.status.version}</code>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProxyGraphVisualizer({
  apps,
  services = [],
  instanceName,
  isLoading,
  onRefresh,
  onSelectApp,
  className,
}: ProxyGraphVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedApp, setSelectedApp] = useState<{ domain: string; app: ProxyApp } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const layout = useMemo(() => {
    const width = 900;
    
    // Build service list with proxy status
    const serviceNodes = services.map((service) => {
      const proxyApp = apps ? Object.values(apps).find(app => {
        const upstreamPort = app.upstream.match(/:(\d+)/)?.[1];
        return app.domain.includes(service.name) || 
               upstreamPort === String(service.port);
      }) : null;

      return {
        service,
        proxyApp,
        isProxied: !!proxyApp,
        domain: proxyApp?.domain || service.domain || service.name,
      };
    });

    const height = Math.max(500, serviceNodes.length * 100 + 100);

    const instanceX = 100;
    const instanceY = height / 2;

    const proxyX = width / 2 - 50;
    const proxyY = height / 2;

    const serviceStartX = width - 120;
    const serviceStartY = 80;
    const serviceGap = 100;

    const servicePositions = serviceNodes.map((node, index) => ({
      ...node,
      x: serviceStartX,
      y: serviceStartY + index * serviceGap,
    }));

    return {
      width,
      height,
      instance: { x: instanceX, y: instanceY },
      proxy: { x: proxyX, y: proxyY },
      services: servicePositions,
      proxyRouteCount: apps ? Object.keys(apps).length : 0,
    };
  }, [apps, services]);

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.5, Math.min(2, z + delta)));
  };

  const handleNodeClick = useCallback(
    (domain: string, app: ProxyApp) => {
      setSelectedApp({ domain, app });
      onSelectApp?.(domain, app);
    },
    [onSelectApp]
  );

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (layout.services.length === 0) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Network className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No services found</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
            Deploy a service to see it on the graph
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
        <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-lg border p-1 shadow-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground px-2 min-w-12 text-center font-medium">
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
          <div className="w-px h-6 bg-border mx-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetView}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset View</TooltipContent>
          </Tooltip>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="shadow-sm">
            <RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg border p-3 shadow-sm">
        <p className="text-xs font-medium mb-2 text-muted-foreground">Legend</p>
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-blue-400 rounded" />
            <span>Request Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status="running" size="sm" />
            <span>Running</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator status="stopped" size="sm" />
            <span>Stopped</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Not Proxied</span>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className={cn(
          "relative w-full overflow-hidden",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ height: Math.max(500, layout.height * zoom) }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width="100%"
          height="100%"
          className="absolute inset-0"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: "center center",
          }}
        >
          {/* Connection lines */}
          <g className="connections">
            {/* Instance to Proxy */}
            <ConnectionLine
              x1={layout.instance.x + 70}
              y1={layout.instance.y}
              x2={layout.proxy.x - 45}
              y2={layout.proxy.y}
              animated
              color="stroke-blue-400/50"
            />

            {/* Proxy to Services */}
            {layout.services.map(({ service, isProxied, x, y }) => (
              <ConnectionLine
                key={service.id}
                x1={layout.proxy.x + 45}
                y1={layout.proxy.y}
                x2={x - 85}
                y2={y}
                animated={isProxied}
                color={isProxied ? "stroke-green-400/50" : "stroke-muted-foreground/20"}
              />
            ))}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {/* Instance Node */}
            <InstanceNode
              name={instanceName}
              x={layout.instance.x}
              y={layout.instance.y}
            />

            {/* Proxy Hub */}
            <ProxyHubNode
              x={layout.proxy.x}
              y={layout.proxy.y}
              routeCount={layout.proxyRouteCount}
              status="running"
            />

            {/* Service Nodes */}
            {layout.services.map(({ service, proxyApp, isProxied, domain, x, y }) => (
              <ServiceNodeWithStatus
                key={service.id}
                service={service}
                proxyApp={proxyApp}
                isProxied={isProxied}
                x={x}
                y={y}
                isSelected={selectedApp?.domain === domain}
                onClick={proxyApp ? () => handleNodeClick(domain, proxyApp) : undefined}
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Detail Panel */}
      {selectedApp && (
        <ServiceDetailPanel
          domain={selectedApp.domain}
          app={selectedApp.app}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </Card>
  );
}