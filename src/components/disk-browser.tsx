// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DiskInfo, FsNode, FsSnapshot } from "@/types";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Link2,
  HardDrive,
  Lock,
  Pencil,
  Eye,
  X,
} from "lucide-react";
import { formatBytes } from "./instance-metrics";

interface DiskUsageCardProps {
  disk: DiskInfo;
  className?: string;
}

export function DiskUsageCard({ disk, className }: DiskUsageCardProps) {
  const usedBytes = disk.used_bytes ?? 0;
  const usedPercent = disk.size_bytes > 0 ? (usedBytes / disk.size_bytes) * 100 : 0;
  const getColorClass = (pct: number) => {
    if (pct >= 90) return "bg-red-500";
    if (pct >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[120px]" title={disk.mountpoint}>
            {disk.mountpoint}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{disk.filesystem}</span>
      </div>
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full transition-all", getColorClass(usedPercent))}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatBytes(usedBytes)} used</span>
          <span>{formatBytes(disk.available_bytes)} free</span>
        </div>
      </div>
    </div>
  );
}

interface DiskOverviewProps {
  disks: DiskInfo[];
  className?: string;
}

export function DiskOverview({ disks, className }: DiskOverviewProps) {
  // Filter out virtual filesystems for the overview
  const physicalDisks = useMemo(() => {
    return disks.filter(d => 
      !d.filesystem.startsWith("tmpfs") && 
      !d.filesystem.startsWith("udev") &&
      d.size_bytes > 0
    );
  }, [disks]);

  if (physicalDisks.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No disk information available
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", className)}>
      {physicalDisks.map((disk, idx) => (
        <DiskUsageCard key={`${disk.filesystem}-${disk.mountpoint}-${idx}`} disk={disk} />
      ))}
    </div>
  );
}

interface FsNodeItemProps {
  node: FsNode;
  depth?: number;
  onSelect?: (node: FsNode) => void;
}

function FsNodeItem({ node, depth = 0, onSelect }: FsNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.type === "dir" && node.children && node.children.length > 0;
  const isDir = node.type === "dir";
  const isSymlink = node.type === "symlink";

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDir) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = () => {
    onSelect?.(node);
  };

  const getIcon = () => {
    if (isSymlink) return <Link2 className="h-4 w-4 text-blue-500" />;
    if (isDir) {
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-yellow-500" />
      ) : (
        <Folder className="h-4 w-4 text-yellow-500" />
      );
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const getPermissionBadges = () => {
    const badges = [];
    if (!node.readable) {
      badges.push(
        <Tooltip key="no-read">
          <TooltipTrigger asChild>
            <Lock className="h-3 w-3 text-red-500" />
          </TooltipTrigger>
          <TooltipContent>No read permission</TooltipContent>
        </Tooltip>
      );
    }
    if (node.readable && !node.writable) {
      badges.push(
        <Tooltip key="read-only">
          <TooltipTrigger asChild>
            <Eye className="h-3 w-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>Read-only</TooltipContent>
        </Tooltip>
      );
    }
    if (node.writable) {
      badges.push(
        <Tooltip key="writable">
          <TooltipTrigger asChild>
            <Pencil className="h-3 w-3 text-green-500" />
          </TooltipTrigger>
          <TooltipContent>Writable</TooltipContent>
        </Tooltip>
      );
    }
    return badges;
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-md hover:bg-muted/50 cursor-pointer group",
          !node.readable && "opacity-50"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelect}
      >
        {isDir ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-muted rounded"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )
            ) : (
              <span className="w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {getIcon()}
        <span className="flex-1 text-sm truncate" title={node.path}>
          {node.name}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {getPermissionBadges()}
        </div>
        {node.type === "file" && (
          <span className="text-xs text-muted-foreground ml-2">
            {formatBytes(node.size_bytes)}
          </span>
        )}
        {node.truncated && (
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            +{node.child_count}
          </Badge>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child, idx) => (
            <FsNodeItem
              key={`${child.path}-${idx}`}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileBrowserProps {
  fs: FsSnapshot;
  onSelectNode?: (node: FsNode) => void;
  className?: string;
}

export function FileBrowser({ fs, onSelectNode, className }: FileBrowserProps) {
  const [selectedNode, setSelectedNode] = useState<FsNode | null>(null);

  const handleSelect = (node: FsNode) => {
    setSelectedNode(node);
    onSelectNode?.(node);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {fs.roots.map((root, idx) => (
            <FsNodeItem
              key={`${root.path}-${idx}`}
              node={root}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </ScrollArea>
      {selectedNode && (
        <div className="border-t p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Selected</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSelectedNode(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Path:</span>
              <span className="font-mono truncate max-w-[200px]" title={selectedNode.path}>
                {selectedNode.path}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="capitalize">{selectedNode.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>{formatBytes(selectedNode.size_bytes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Owner:</span>
              <span>{selectedNode.owner}:{selectedNode.group}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mode:</span>
              <span className="font-mono">{selectedNode.mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Permissions:</span>
              <div className="flex gap-1">
                {selectedNode.readable && <Badge variant="outline" className="text-[10px] px-1 py-0">R</Badge>}
                {selectedNode.writable && <Badge variant="outline" className="text-[10px] px-1 py-0">W</Badge>}
                {selectedNode.executable && <Badge variant="outline" className="text-[10px] px-1 py-0">X</Badge>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DiskBrowserDialogProps {
  disks?: DiskInfo[];
  fs?: FsSnapshot;
  trigger?: React.ReactNode;
  className?: string;
}

export function DiskBrowserDialog({ disks, fs, trigger, className }: DiskBrowserDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className={className}>
            <HardDrive className="h-4 w-4 mr-2" />
            Browse Filesystem
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Filesystem Browser</DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex gap-4 overflow-hidden">
          {disks && disks.length > 0 && (
            <div className="w-64 shrink-0 overflow-auto">
              <div className="text-sm font-medium mb-2">Disk Usage</div>
              <DiskOverview disks={disks} />
            </div>
          )}
          {fs && (
            <div className="flex-1 border rounded-lg overflow-hidden">
              <FileBrowser fs={fs} />
            </div>
          )}
          {!fs && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              No filesystem data available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
