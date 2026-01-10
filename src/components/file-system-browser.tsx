// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { NormalizedFilesystem, NormalizedFsNode } from "@/types";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Link2,
  FilePlus,
  FolderPlus,
  Trash2,
  Pencil,
  Eye,
  Save,
  X,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { formatBytes } from "./instance-metrics";
import { useFileSystemMap } from "@/hooks/use-file-system-map";

interface FileSystemBrowserProps {
  instanceId: string;
  fs?: NormalizedFilesystem;
  clusterId: string;
  className?: string;
  onRefresh?: () => void;
}

interface FileOperation {
  type: "read" | "write" | "create" | "delete";
  path: string;
  loading: boolean; 
  error?: string;
}

export function FileSystemBrowser({ instanceId, fs, className }: FileSystemBrowserProps) {
  const [selectedNode, setSelectedNode] = useState<NormalizedFsNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [fileContent, setFileContent] = useState<string>("");
  const [editedContent, setEditedContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [operation, setOperation] = useState<FileOperation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NormalizedFsNode[]>([]);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [createType, setCreateType] = useState<"file" | "dir">("file");
  const [newItemName, setNewItemName] = useState("");
  const [targetPath, setTargetPath] = useState("");

  // Use WebSocket-based file system with map and watching
  const {
    map,
    rootNode,
    mapLoading,
    isWatching,
    updateCount,
    loadTree,
    reloadSubtree,
    query,
    readFile: fsReadFile,
    writeFile: fsWriteFile,
    createItem: fsCreateItem,
    deleteItem: fsDeleteItem,
  } = useFileSystemMap({
    instanceId,
    rootPath: "/",
    initialDepth: 2,
    autoWatch: false, 
    watchRecursive: true,
  });

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Search functionality
  useEffect(() => {
    if (!map || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      if (query) {
        const results = query.searchByName(searchQuery);
        setSearchResults(results.slice(0, 50)); // Limit to 50 results
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
  }, [map, searchQuery]);

  const readFile = useCallback(async () => {
    const { readable } = selectedNode?.permissions || {};
    if (!readable) return;
    
    setOperation({ type: "read", path: selectedNode!.path, loading: true });
    setSelectedNode(selectedNode);
    
    try {
      const result = await fsReadFile(selectedNode!.path);
      setFileContent(result.content);
      setEditedContent(result.content);
      setOperation(null);
    } catch (error: any) {
      const message = error?.message || "Failed to read file";
      setOperation({ type: "read", path: selectedNode!.path, loading: false, error: message });
    }
  }, [fsReadFile]);

  const writeFile = useCallback(async () => {
    const { writable } = selectedNode?.permissions || {};
    if (!selectedNode || !writable) return;
    
    setOperation({ type: "write", path: selectedNode.path, loading: true });
    
    try {
      await fsWriteFile(selectedNode.path, editedContent, { encoding: "utf8" });
      setFileContent(editedContent);
      setIsEditing(false);
      setOperation(null);
    } catch (error: any) {
      const message = error?.message || "Failed to write file";
      setOperation({ type: "write", path: selectedNode.path, loading: false, error: message });
    }
  }, [fsWriteFile, selectedNode, editedContent]);

  const createItem = useCallback(async () => {
    if (!newItemName.trim()) return;
    
    const fullPath = targetPath ? `${targetPath}/${newItemName}` : `/${newItemName}`;
    setOperation({ type: "create", path: fullPath, loading: true });
    
    try {
      await fsCreateItem(fullPath, createType);
      setShowCreateDialog(false);
      setNewItemName("");
      setOperation(null);
      // File watching will auto-update the tree
    } catch (error: any) {
      const message = error?.message || "Failed to create item";
      setOperation({ type: "create", path: fullPath, loading: false, error: message });
    }
  }, [fsCreateItem, targetPath, newItemName, createType]);

  const deleteItem = useCallback(async () => {
    const { writable } = selectedNode?.permissions || {};
    if (!selectedNode || !writable) return;
    
    setOperation({ type: "delete", path: selectedNode.path, loading: true });
    
    try {
      const recursive = selectedNode.type === "dir";
      await fsDeleteItem(selectedNode.path, recursive);
      setShowDeleteDialog(false);
      setSelectedNode(null);
      setFileContent("");
      setOperation(null);
    } catch (error: any) {
      const message = error?.message || "Failed to delete item";
      setOperation({ type: "delete", path: selectedNode.path, loading: false, error: message });
    }
  }, [fsDeleteItem, selectedNode]);

  const handleContextAction = useCallback((action: string, node: NormalizedFsNode) => {
    switch (action) {
      case "view":
        readFile();
        break;
      case "edit":
        readFile();
        setIsEditing(true);
        break;
      case "new-file":
        setTargetPath(node.path.substring(0, node.path.lastIndexOf("/")));
        setCreateType("file");
        setShowCreateDialog(true);
        break;
      case "new-folder":
        setTargetPath(node.path.substring(0, node.path.lastIndexOf("/")));
        setCreateType("dir");
        setShowCreateDialog(true);
        break;
      case "delete":
        setSelectedNode(node);
        setShowDeleteDialog(true);
        break;
    }
  }, [readFile]);

  const getParentWritable = useCallback((node: NormalizedFsNode): boolean => {
    // For root nodes, assume writable if the node itself is writable
    const { writable } = node.permissions || {};
    return writable || false;
  }, []);

  if (fs?.roots.length === 0 && !mapLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        No filesystem data available
      </div>
    );
  }

  return (
    <div className={cn("flex h-full", className)}>
      {/* File Tree */}
      <div className="w-72 border-r flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Files</span>
            <div className="flex items-center gap-1">
              {isWatching && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                  Live
                </Badge>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7" 
                onClick={() => loadTree("/", 2)}
                disabled={mapLoading}
              >
                {mapLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {searchQuery && searchResults.length > 0 ? (
            <div className="p-2 space-y-1">
              <div className="text-xs text-muted-foreground px-2 py-1">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map((node, idx) => (
                <div
                  key={`${node.path}-${idx}`}
                  className={cn(
                    "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer text-sm",
                    selectedNode?.path === node.path ? "bg-accent" : "hover:bg-muted/50"
                  )}
                  onClick={() => {
                    setSelectedNode(node);
                    if (node.type === "file") {
                      readFile();
                    }
                  }}
                >
                  {node.type === "dir" ? (
                    <Folder className="h-4 w-4 text-yellow-500 shrink-0" />
                  ) : (
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate" title={node.path}>{node.path}</span>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No results found
            </div>
          ) : (
            <div className="p-2">
              {(fs?.roots || []).map((root, idx) => (
                <FileTreeNode
                  key={`${root.path}-${idx}`}
                  node={root}
                  depth={0}
                  expandedPaths={expandedPaths}
                  selectedPath={selectedNode?.path}
                  onToggle={toggleExpand}
                  onSelect={setSelectedNode}
                  onContextAction={handleContextAction}
                  getParentWritable={getParentWritable}
                  onExpand={async (path) => {
                    // Load deeper when expanding
                    if (query && !query.getChildren(path).length) {
                      await reloadSubtree(path, 3);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        {/* Status bar */}
        {map && (
          <div className="p-2 border-t text-[10px] text-muted-foreground space-y-0.5">
            <div>Files: {map.byType.get("file")?.size || 0}</div>
            <div>Dirs: {map.byType.get("dir")?.size || 0}</div>
            {updateCount > 0 && <div>Updates: {updateCount}</div>}
          </div>
        )}
      </div>

      {/* Content Panel */}
      <div className="flex-1 flex flex-col">
        {selectedNode ? (
          <>
            {/* Header */}
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {selectedNode.type === "file" ? (
                  <File className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 text-yellow-500 shrink-0" />
                )}
                <span className="text-sm font-medium truncate">{selectedNode.name}</span>
                <div className="flex gap-1">
                  {selectedNode.permissions?.readable && <Badge variant="outline" className="text-[10px] px-1 py-0">R</Badge>}
                  {selectedNode.permissions?.writable && <Badge variant="outline" className="text-[10px] px-1 py-0">W</Badge>}
                  {selectedNode.permissions?.executable && <Badge variant="outline" className="text-[10px] px-1 py-0">X</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedNode.type === "file" && selectedNode.permissions?.writable && !isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      readFile();
                      setIsEditing(true);
                    }}
                    disabled={!selectedNode.permissions?.writable || operation?.loading}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditedContent(fileContent);
                      }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={writeFile}
                      disabled={operation?.loading || editedContent === fileContent}
                    >
                      {operation?.loading && operation.type === "write" ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1" />
                      )}
                      Save
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setSelectedNode(null);
                    setFileContent("");
                    setIsEditing(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* File Info */}
            <div className="px-3 py-2 border-b bg-muted/30 text-xs text-muted-foreground flex items-center gap-4">
              <span>{selectedNode.path}</span>
              <span>{formatBytes(selectedNode.sizeBytes)}</span>
              <span>{selectedNode.owner}:{selectedNode.group}</span>
              <span className="font-mono">{selectedNode.mode}</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {operation?.loading && operation.type === "read" ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : operation?.error ? (
                <div className="flex items-center justify-center h-full text-destructive text-sm">
                  {operation.error}
                </div>
              ) : selectedNode.type === "file" && fileContent !== undefined ? (
                isEditing ? (
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="h-full w-full resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
                    placeholder="File content..."
                  />
                ) : (
                  <ScrollArea className="h-full">
                    <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-all">
                      {fileContent || <span className="text-muted-foreground italic">Empty file</span>}
                    </pre>
                  </ScrollArea>
                )
              ) : selectedNode.type === "dir" ? (
                <div className="p-4 text-sm text-muted-foreground">
                  <p>Directory: {selectedNode.path}</p>
                  <p className="mt-1">{selectedNode.children?.length ?? 0} items</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Select a file to view its contents
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a file to view its contents
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {createType === "file" ? "File" : "Folder"}</DialogTitle>
            <DialogDescription>
              Create in: {targetPath || "/"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Name</Label>
              <Input
                id="item-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={createType === "file" ? "filename.txt" : "folder-name"}
              />
            </div>
            {operation?.error && operation.type === "create" && (
              <p className="text-sm text-destructive">{operation.error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createItem} disabled={!newItemName.trim() || operation?.loading}>
              {operation?.loading && operation.type === "create" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : createType === "file" ? (
                <FilePlus className="h-4 w-4" />
              ) : (
                <FolderPlus className="h-4 w-4" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedNode?.type === "dir" ? "Folder" : "File"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedNode?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {operation?.error && operation.type === "delete" && (
            <p className="text-sm text-destructive">{operation.error}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteItem} disabled={operation?.loading}>
              {operation?.loading && operation.type === "delete" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FileTreeNodeProps {
  node: NormalizedFsNode;
  depth: number;
  expandedPaths: Set<string>;
  selectedPath?: string;
  onToggle: (path: string) => void;
  onSelect: (node: NormalizedFsNode) => void;
  onContextAction: (action: string, node: NormalizedFsNode) => void;
  getParentWritable: (node: NormalizedFsNode) => boolean;
  onExpand?: (path: string) => Promise<void>;
}

function FileTreeNode({
  node,
  depth,
  expandedPaths,
  selectedPath,
  onToggle,
  onSelect,
  onContextAction,
  getParentWritable,
  onExpand,
}: FileTreeNodeProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children && node.children.length > 0;
  const isDir = node.type === "dir";
  const isSymlink = node.type === "symlink";
  const parentWritable = getParentWritable(node);

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

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group",
              isSelected ? "bg-accent" : "hover:bg-muted/50",
              !node.permissions?.readable && "opacity-50"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={async () => {
              onSelect(node);
              if (isDir) {
                if (!isExpanded && onExpand) {
                  await onExpand(node.path);
                }
                onToggle(node.path);
              }
            }}
          >
            {isDir ? (
              <button
                onClick={async (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (!isExpanded && onExpand) {
                    await onExpand(node.path);
                  }
                  onToggle(node.path);
                }}
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
            {node.truncated && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                +{node.childCount}
              </Badge>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {node.type === "file" && (
            <>
              <ContextMenuItem
                onClick={() => onContextAction("view", node)}
                disabled={!node.permissions?.readable}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onContextAction("edit", node)}
                disabled={!node.permissions?.readable || !node.permissions?.writable}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          {isDir && (
            <>
              <ContextMenuItem
                onClick={() => onContextAction("new-file", node)}
                disabled={!node.permissions?.writable}
              >
                <FilePlus className="h-4 w-4 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onContextAction("new-folder", node)}
                disabled={!node.permissions?.writable}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem
            onClick={() => onContextAction("delete", node)}
            disabled={!parentWritable}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child, idx) => (
            <FileTreeNode
              key={`${child.path}-${idx}`}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggle={onToggle}
              onSelect={onSelect}
              onContextAction={onContextAction}
              getParentWritable={(node) => node.permissions?.writable ?? false}
              onExpand={onExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}
