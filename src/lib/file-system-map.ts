// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { FsNode, FileUpdateEvent } from "@/types";

/**
 * Consolidated file system map for efficient querying
 */
export interface FileSystemMap {
  byPath: Map<string, FsNode>;
  byType: Map<"file" | "dir" | "symlink", Set<string>>;
  children: Map<string, Set<string>>;
  parents: Map<string, string>;
}

/**
 * Consolidate a file tree into a flat, queryable structure
 */
export function consolidateTree(root: FsNode): FileSystemMap {
  const map: FileSystemMap = {
    byPath: new Map(),
    byType: new Map([
      ["file", new Set()],
      ["dir", new Set()],
      ["symlink", new Set()],
    ]),
    children: new Map(),
    parents: new Map(),
  };

  function traverse(node: FsNode, parentPath?: string) {
    // Index by path
    map.byPath.set(node.path, node);

    // Index by type
    map.byType.get(node.type)!.add(node.path);

    // Track parent relationship
    if (parentPath) {
      map.parents.set(node.path, parentPath);
      if (!map.children.has(parentPath)) {
        map.children.set(parentPath, new Set());
      }
      map.children.get(parentPath)!.add(node.path);
    }

    // Recurse through children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => traverse(child, node.path));
    }
  }

  traverse(root);
  return map;
}

/**
 * Apply a file update event to the file system map
 */
export function applyFileUpdate(
  map: FileSystemMap,
  event: FileUpdateEvent
): FileSystemMap {
  const { type, path, oldPath } = event;

  switch (type) {
    case "created": {
      // For new files, we need to fetch the full node data
      // This is a placeholder - actual implementation would need to fetch node details
      console.log(`[FileSystemMap] File created: ${path} (requires fetch)`);
      break;
    }

    case "modified": {
      // Update modification time if node exists
      const node = map.byPath.get(path);
      if (node && event.timestamp) {
        node.mod_time = new Date(event.timestamp).toISOString();
        if (event.size !== undefined) {
          node.size_bytes = event.size;
        }
      }
      break;
    }

    case "deleted": {
      // Remove from all indexes
      const node = map.byPath.get(path);
      if (node) {
        // Remove from byPath
        map.byPath.delete(path);

        // Remove from byType
        map.byType.get(node.type)?.delete(path);

        // Remove from parent's children
        const parentPath = map.parents.get(path);
        if (parentPath) {
          map.children.get(parentPath)?.delete(path);
        }

        // Remove from parents
        map.parents.delete(path);

        // If it's a directory, recursively remove all children
        if (node.type === "dir") {
          const childPaths = map.children.get(path);
          if (childPaths) {
            childPaths.forEach((childPath) => {
              applyFileUpdate(map, {
                type: "deleted",
                path: childPath,
                timestamp: event.timestamp,
              });
            });
          }
          map.children.delete(path);
        }
      }
      break;
    }

    case "renamed": {
      if (!oldPath) {
        console.warn(`[FileSystemMap] Rename event missing oldPath for ${path}`);
        break;
      }

      const node = map.byPath.get(oldPath);
      if (node) {
        // Update the node's path and name
        const newName = path.split("/").pop() || "";
        node.path = path;
        node.name = newName;

        // Move in byPath index
        map.byPath.delete(oldPath);
        map.byPath.set(path, node);

        // Update in byType index
        map.byType.get(node.type)?.delete(oldPath);
        map.byType.get(node.type)?.add(path);

        // Update parent's children
        const parentPath = map.parents.get(oldPath);
        if (parentPath) {
          map.children.get(parentPath)?.delete(oldPath);
          map.children.get(parentPath)?.add(path);
        }

        // Update in parents index
        map.parents.delete(oldPath);
        if (parentPath) {
          map.parents.set(path, parentPath);
        }

        // If it's a directory, recursively update all children paths
        if (node.type === "dir") {
          const childPaths = Array.from(map.children.get(oldPath) || []);
          map.children.delete(oldPath);
          map.children.set(path, new Set());

          childPaths.forEach((childPath) => {
            const newChildPath = childPath.replace(oldPath, path);
            applyFileUpdate(map, {
              type: "renamed",
              path: newChildPath,
              oldPath: childPath,
              timestamp: event.timestamp,
            });
          });
        }
      }
      break;
    }
  }

  return map;
}

/**
 * Query helpers for the file system map
 */
export const FileSystemQuery = {
  /**
   * Get a node by path
   */
  getNode(map: FileSystemMap, path: string): FsNode | undefined {
    return map.byPath.get(path);
  },

  /**
   * Get all files
   */
  getAllFiles(map: FileSystemMap): FsNode[] {
    const filePaths = Array.from(map.byType.get("file") || []);
    return filePaths.map((path) => map.byPath.get(path)!).filter(Boolean);
  },

  /**
   * Get all directories
   */
  getAllDirs(map: FileSystemMap): FsNode[] {
    const dirPaths = Array.from(map.byType.get("dir") || []);
    return dirPaths.map((path) => map.byPath.get(path)!).filter(Boolean);
  },

  /**
   * Get children of a directory
   */
  getChildren(map: FileSystemMap, path: string): FsNode[] {
    const childPaths = Array.from(map.children.get(path) || []);
    return childPaths.map((childPath) => map.byPath.get(childPath)!).filter(Boolean);
  },

  /**
   * Get parent of a node
   */
  getParent(map: FileSystemMap, path: string): FsNode | undefined {
    const parentPath = map.parents.get(path);
    return parentPath ? map.byPath.get(parentPath) : undefined;
  },

  /**
   * Get all ancestors of a node (parent, grandparent, etc.)
   */
  getAncestors(map: FileSystemMap, path: string): FsNode[] {
    const ancestors: FsNode[] = [];
    let currentPath = path;

    while (true) {
      const parentPath = map.parents.get(currentPath);
      if (!parentPath) break;

      const parent = map.byPath.get(parentPath);
      if (parent) {
        ancestors.push(parent);
      }
      currentPath = parentPath;
    }

    return ancestors;
  },

  /**
   * Get all descendants of a directory (recursive)
   */
  getDescendants(map: FileSystemMap, path: string): FsNode[] {
    const descendants: FsNode[] = [];
    const childPaths = Array.from(map.children.get(path) || []);

    childPaths.forEach((childPath) => {
      const child = map.byPath.get(childPath);
      if (child) {
        descendants.push(child);
        if (child.type === "dir") {
          descendants.push(...FileSystemQuery.getDescendants(map, childPath));
        }
      }
    });

    return descendants;
  },

  /**
   * Search nodes by name pattern
   */
  searchByName(map: FileSystemMap, pattern: string | RegExp): FsNode[] {
    const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
    const results: FsNode[] = [];

    map.byPath.forEach((node) => {
      if (regex.test(node.name)) {
        results.push(node);
      }
    });

    return results;
  },

  /**
   * Get total size of a directory (recursive)
   */
  getDirectorySize(map: FileSystemMap, path: string): number {
    const node = map.byPath.get(path);
    if (!node || node.type !== "dir") return 0;

    let totalSize = 0;
    const descendants = FileSystemQuery.getDescendants(map, path);

    descendants.forEach((descendant) => {
      if (descendant.type === "file") {
        totalSize += descendant.size_bytes;
      }
    });

    return totalSize;
  },

  /**
   * Get file count in a directory (recursive)
   */
  getFileCount(map: FileSystemMap, path: string): { files: number; dirs: number } {
    const descendants = FileSystemQuery.getDescendants(map, path);
    
    return {
      files: descendants.filter((n) => n.type === "file").length,
      dirs: descendants.filter((n) => n.type === "dir").length,
    };
  },
};
