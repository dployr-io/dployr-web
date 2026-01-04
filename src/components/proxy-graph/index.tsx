// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RefreshCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Network,
} from "lucide-react";
import type { ProxyApp, ProxyApps, Service } from "@/types";
import { StatusDot } from "./status-dot";
import { ConnectionPath } from "./connection-path";
import { InstanceNode } from "./instance-node";
import { ProxyNode } from "./proxy-node";
import { ServiceNode } from "./service-node";
import { DetailPanel } from "./detail-panel";

interface ProxyGraphVisualizerProps {
  proxyStatus: "running" | "stopped" | "error" | "unknown";
  apps: ProxyApps | null;
  services?: Service[];
  instances?: Array<{ id: string; name: string; status?: string }>;
  isLoading?: boolean;
  onRefresh?: () => void;
  onSelectApp?: (domain: string, app: ProxyApp) => void;
  onSelectInstance?: (instance: { id: string; name: string; status?: string }) => void;
  onAddRoute?: () => void;
  onRemoveRoute?: (domain: string) => Promise<void>;
  onRestart?: () => void;
  className?: string;
}

export function ProxyGraphVisualizer({
  proxyStatus,
  apps,
  services = [],
  instances = [],
  isLoading,
  onRefresh,
  onSelectApp,
  onSelectInstance,
  onAddRoute,
  onRemoveRoute,
  onRestart,
  className,
}: ProxyGraphVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedApp, setSelectedApp] = useState<{ domain: string; app: ProxyApp } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; domain: string | null }>({
    open: false,
    domain: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<{ id: string; type: 'instance' | 'proxy' | 'service'; x: number; y: number; isProxied?: boolean } | null>(null);

  // Fix passive event listener issue
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.3, Math.min(2, z + delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Calculate layout
  const layout = useMemo(() => {
    const width = 1000;
    const instanceCount = Math.max(1, instances.length);
    const serviceCount = Math.max(1, services.length);
    
    // Build service list with proxy status
    const serviceNodes = services.map((service) => {
      const proxyEntry = apps ? Object.entries(apps).find(([domain, app]) => {
        const upstreamPort = app.upstream?.match(/:(\d+)/)?.[1];
        return domain.includes(service.name) || 
               app.upstream?.includes(service.name) ||
               upstreamPort === String(service.port);
      }) : null;

      return {
        service,
        proxyApp: proxyEntry ? proxyEntry[1] : null,
        domain: proxyEntry ? proxyEntry[0] : null,
        isProxied: !!proxyEntry,
      };
    });

    // Calculate height based on content
    const maxVerticalNodes = Math.max(instanceCount, serviceCount);
    const height = Math.max(400, maxVerticalNodes * 110 + 150);

    // Instance positions (left column)
    const instanceGap = 110;
    const instanceStartY = (height - (instanceCount - 1) * instanceGap) / 2;
    const instancePositions = instances.map((inst, i) => ({
      ...inst,
      x: 120,
      y: instanceStartY + i * instanceGap,
    }));

    // Proxy position (center)
    const proxyX = width / 2;
    const proxyY = height / 2;

    // Service positions (right column)
    const serviceGap = 100;
    const serviceStartY = (height - (serviceCount - 1) * serviceGap) / 2;
    const servicePositions = serviceNodes.map((node, i) => ({
      ...node,
      x: width - 120,
      y: serviceStartY + i * serviceGap,
    }));

    return {
      width,
      height,
      instances: instancePositions,
      proxy: { x: proxyX, y: proxyY },
      services: servicePositions,
      proxyRouteCount: apps ? Object.keys(apps).length : 0,
    };
  }, [apps, services, instances]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !e.defaultPrevented) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Node click handlers
  const handleServiceClick = useCallback((domain: string | null, app: ProxyApp | null) => {
    if (domain && app) {
      setSelectedApp({ domain, app });
      onSelectApp?.(domain, app);
    } else {
      // Service is not proxied - trigger add route with prefilled data
      onAddRoute?.();
      // Note: The parent component should handle prefilling the form with service data
    }
  }, [onSelectApp, onAddRoute]);

  // Zoom controls
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.15, 2)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.15, 0.3)), []);
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Delete handlers
  const handleDeleteClick = useCallback((domain: string) => {
    setDeleteDialog({ open: true, domain });
    setSelectedApp(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.domain || !onRemoveRoute) return;
    setIsDeleting(true);
    try {
      await onRemoveRoute(deleteDialog.domain);
      setDeleteDialog({ open: false, domain: null });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteDialog.domain, onRemoveRoute]);

  return (
    <>
      <div className={cn("relative overflow-hidden rounded-lg border border-stone-800", className)}>
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          {/* Left - Status info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-stone-300 border border-stone-400 dark:bg-stone-800 dark:border-stone-700">
              <StatusDot status={proxyStatus} />
              <span className="text-xs font-mono">· {layout.proxyRouteCount} routes</span>
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            {onAddRoute && (
              <div className="relative group">
                <Button 
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-stone-700 text-stone-300 hover:bg-stone-800"
                  onClick={onAddRoute}
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </Button>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 rounded text-xs font-mono border border-stone-600 bg-stone-900 text-stone-300 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                  Add Route
                </div>
              </div>
            )}
            
            {onRestart && (
              <div className="relative group">
                <Button 
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-stone-700 text-stone-300 hover:bg-stone-800"
                  onClick={onRestart}
                  disabled={isLoading}
                >
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                </Button>
                <div className="absolute top-full right-0 mt-2 px-2 py-1 rounded text-xs font-mono border border-stone-600 bg-stone-900 text-stone-300 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                  Restart Proxy
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between">
          {/* Legend */}
          <div className="bg-stone-300 border border-stone-400 dark:bg-stone-800 dark:border-stone-700 rounded-md p-2">
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-5 flex items-center justify-center">
                  <div className="w-5 h-0.5 bg-blue-500 rounded-full" />
                </div>
                <span className="font-mono">Active Connection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-5 flex items-center justify-center">
                  <div className="w-5 h-0.5 border-t border-dashed border-stone-700 dark:border-stone-400" />
                </div>
                <span className="font-mono">Unreachable Connection</span>
              </div>
            </div>
          </div>

          <div className="flex items-center">       
            <div className="flex items-center bg-stone-300 border border-stone-400 dark:bg-stone-800 dark:border-stone-700 rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-stone-400 dark:hover:bg-stone-700" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
              
              <span className="text-xs px-2 min-w-[40px] text-center tabular-nums font-mono">
                {Math.round(zoom * 100)}%
              </span>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-stone-400 dark:hover:bg-stone-700" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
              
              <div className="w-px h-4 bg-stone-500 mx-0.5" />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-stone-400 dark:hover:bg-stone-700" onClick={handleResetView}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset View</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #334155 1px, transparent 1px),
              linear-gradient(to bottom, #334155 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        <div
          ref={containerRef}
          className={cn(
            "relative w-full",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{ height: Math.max(500, layout.height) }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
            {/* Connections */}
            <g className="connections">
              {/* Instances to Proxy */}
              {layout.instances.map((inst) => {
                const isInstanceActive = inst.status === 'running' || inst.status === 'active';
                return (
                  <ConnectionPath
                    key={`inst-proxy-${inst.id}`}
                    from={{ x: inst.x + 70, y: inst.y }}
                    to={{ x: layout.proxy.x - 45, y: layout.proxy.y }}
                    isActive={isInstanceActive}
                    animated={isInstanceActive && proxyStatus === "running"}
                  />
                );
              })}

              {/* Proxy to Services */}
              {layout.services.map(({ service, isProxied, x, y }) => (
                <ConnectionPath
                  key={`proxy-svc-${service.id}`}
                  from={{ x: layout.proxy.x + 45, y: layout.proxy.y }}
                  to={{ x: x - 80, y: y }}
                  isActive={isProxied}
                  animated={isProxied && proxyStatus === "running"}
                />
              ))}
            </g>

            {/* Nodes */}
            <g className="nodes">
              {/* Instance Nodes */}
              {layout.instances.map((inst) => (
                <InstanceNode
                  key={inst.id}
                  name={inst.name}
                  status={inst.status}
                  x={inst.x}
                  y={inst.y}
                  onMouseEnter={() => setHoveredNode({ id: inst.id, type: 'instance', x: inst.x, y: inst.y })}
                  onMouseLeave={() => setHoveredNode(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectInstance?.({ id: inst.id, name: inst.name, status: inst.status });
                  }}
                />
              ))}

              {/* Proxy Node */}
              <ProxyNode
                x={layout.proxy.x}
                y={layout.proxy.y}
                routeCount={layout.proxyRouteCount}
                status={proxyStatus}
              />

              {/* Service Nodes */}
              {layout.services.map(({ service, proxyApp, domain, isProxied, x, y }) => (
                <ServiceNode
                  key={service.id}
                  service={service}
                  proxyApp={proxyApp}
                  isProxied={isProxied}
                  x={x}
                  y={y}
                  isSelected={selectedApp?.domain === domain}
                  onMouseEnter={() => setHoveredNode({ id: domain || service.id, type: 'service', x, y, isProxied })}
                  onMouseLeave={() => setHoveredNode(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleServiceClick(domain, proxyApp);
                  }}
                />
              ))}
            </g>
          </svg>
        </div>

        {/* Empty State */}
        {layout.services.length === 0 && layout.instances.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90">
            <Network className="h-12 w-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No Resources Found</h3>
            <p className="text-sm text-slate-400 mb-4 text-center max-w-sm">
              Deploy instances and services to see them on the graph
            </p>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="border-stone-700 text-slate-300">
                <RefreshCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>
        )}

        {/* Detail Panel */}
        {selectedApp && (
          <DetailPanel
            domain={selectedApp.domain}
            app={selectedApp.app}
            onClose={() => setSelectedApp(null)}
            onRemove={onRemoveRoute ? () => handleDeleteClick(selectedApp.domain) : undefined}
          />
        )}

        {/* Tooltip */}
        {hoveredNode && containerRef.current && hoveredNode.type !== 'proxy' && (
          <div
            className="absolute font-mono border border-stone-600 bg-stone-900 text-stone-300 px-2 py-1 rounded text-xs pointer-events-none z-50"
            style={{
              left: `${containerRef.current.offsetLeft + (hoveredNode.x * zoom + pan.x)}px`,
              top: `${containerRef.current.offsetTop + ((hoveredNode.y - 60) * zoom + pan.y)}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {hoveredNode.type === 'service' && !hoveredNode.isProxied 
              ? 'Right click to add proxy'
              : 'Right click to view'}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, domain: deleteDialog.domain })}
      >
        <AlertDialogContent className="bg-slate-900 border-stone-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove proxy route?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove the route for <strong className="text-white">{deleteDialog.domain}</strong> from the proxy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="border-stone-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ProxyGraphVisualizer;
