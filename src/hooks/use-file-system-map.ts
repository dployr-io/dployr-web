// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState } from "react";
import { useFileSystem } from "./use-file-system";
import { consolidateTree, applyFileUpdate, FileSystemQuery, type FileSystemMap } from "@/lib/file-system-map";
import type { FileUpdateEvent, NormalizedFilesystem } from "@/types";

interface UseFileSystemMapOptions {
  instanceId: string;
  rootPath?: string;
  initialDepth?: number;
  autoWatch?: boolean;
  watchRecursive?: boolean;
}

interface FileSystemMapState {
  map: FileSystemMap | null;
  rootNode: NormalizedFilesystem | null;
  isLoading: boolean;
  error: string | null;
  isWatching: boolean;
  updateCount: number;
}

/**
 * Combines file system operations with consolidated map and real-time watching
 */
export function useFileSystemMap({
  instanceId,
  rootPath = "/",
  initialDepth = 1,
  autoWatch = false,
  watchRecursive = true,
}: UseFileSystemMapOptions) {
  const fileSystem = useFileSystem({ instanceId });
  const hasLoadedRef = useRef(false);
  const hasStartedWatchRef = useRef(false);
  
  const [state, setState] = useState<FileSystemMapState>({
    map: null,
    rootNode: null,
    isLoading: false,
    error: null,
    isWatching: false,
    updateCount: 0,
  });

  /**
   * Load the file tree and build the map
   */
  const loadTree = useCallback(
    async (path: string, depth: number = initialDepth) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fileSystem.listDirectory(path, { depth });
        const rootNode = response.node;
        const map = consolidateTree(rootNode);

        setState((prev) => ({
          ...prev,
          map,
          rootNode,
          isLoading: false,
          error: null,
        }));

        return { map, rootNode };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load tree";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw error;
      }
    },
    [fileSystem, initialDepth]
  );

  /**
   * Reload a specific subtree and merge into existing map
   */
  const reloadSubtree = useCallback(
    async (path: string, depth: number = 2) => {
      if (!state.map) {
        console.warn("[FileSystemMap] No map loaded, use loadTree first");
        return;
      }

      try {
        const response = await fileSystem.listDirectory(path, { depth });
        const subtreeRoot = response.node;
        const subtreeMap = consolidateTree(subtreeRoot);

        setState((prev) => {
          if (!prev.map) return prev;

          // Merge subtree into existing map
          const updatedMap = { ...prev.map };
          
          // Copy all nodes from subtree
          subtreeMap.byPath.forEach((node, nodePath) => {
            updatedMap.byPath.set(nodePath, node);
          });

          // Update type indexes
          subtreeMap.byType.forEach((paths, type) => {
            paths.forEach((nodePath) => {
              updatedMap.byType.get(type)?.add(nodePath);
            });
          });

          // Update parent/child relationships
          subtreeMap.parents.forEach((parent, child) => {
            updatedMap.parents.set(child, parent);
          });

          subtreeMap.children.forEach((childSet, parent) => {
            updatedMap.children.set(parent, childSet);
          });

          return {
            ...prev,
            map: updatedMap,
            updateCount: prev.updateCount + 1,
          };
        });
      } catch (error) {
        console.error(`[FileSystemMap] Failed to reload subtree ${path}:`, error);
        throw error;
      }
    },
    [fileSystem, state.map]
  );

  /**
   * Handle file update events from watching
   */
  const handleFileUpdate = useCallback((event: FileUpdateEvent) => {
    setState((prev) => {
      if (!prev.map) return prev;

      // Apply the update to the map
      const updatedMap = { ...prev.map };
      applyFileUpdate(updatedMap, event);

      console.log(`[FileSystemMap] Applied ${event.type} update for ${event.path}`);

      return {
        ...prev,
        map: updatedMap,
        updateCount: prev.updateCount + 1,
      };
    });
  }, []);

  /**
   * Start watching the root path
   */
  const startWatching = useCallback(async () => {
    if (state.isWatching) {
      console.warn("[FileSystemMap] Already watching");
      return;
    }

    try {
      await fileSystem.watchFile(rootPath, handleFileUpdate, {
        recursive: watchRecursive,
      });

      setState((prev) => ({ ...prev, isWatching: true }));
      console.log(`[FileSystemMap] Started watching ${rootPath} (recursive: ${watchRecursive})`);
    } catch (error) {
      console.error(`[FileSystemMap] Failed to start watching:`, error);
      throw error;
    }
  }, [fileSystem, rootPath, watchRecursive, handleFileUpdate, state.isWatching]);

  /**
   * Stop watching the root path
   */
  const stopWatching = useCallback(async () => {
    if (!state.isWatching) {
      console.warn("[FileSystemMap] Not watching");
      return;
    }

    try {
      await fileSystem.unwatchFile(rootPath);
      setState((prev) => ({ ...prev, isWatching: false }));
      console.log(`[FileSystemMap] Stopped watching ${rootPath}`);
    } catch (error) {
      console.error(`[FileSystemMap] Failed to stop watching:`, error);
      throw error;
    }
  }, [fileSystem, rootPath, state.isWatching]);

  /**
   * Clear the map
   */
  const clearMap = useCallback(() => {
    setState((prev) => ({
      ...prev,
      map: null,
      rootNode: null,
      updateCount: 0,
    }));
  }, []);

  /**
   * Auto-load on mount if rootPath is provided
   */
  useEffect(() => {
    if (rootPath && !hasLoadedRef.current && !state.isLoading && !state.map && fileSystem.isConnected) {
      hasLoadedRef.current = true;
      loadTree(rootPath, initialDepth);
    }
  }, [rootPath, initialDepth, fileSystem.isConnected]);

  /**
   * Auto-watch if enabled
   */
  useEffect(() => {
    if (autoWatch && state.map && !hasStartedWatchRef.current && !state.isWatching) {
      hasStartedWatchRef.current = true;
      startWatching();
    }
  }, [autoWatch, state.map]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (state.isWatching) {
        fileSystem.unwatchFile(rootPath).catch(console.error);
      }
    };
  }, [state.isWatching, fileSystem, rootPath]);

  return {
    // Map state
    map: state.map,
    rootNode: state.rootNode,
    mapLoading: state.isLoading,
    mapError: state.error,
    isWatching: state.isWatching,
    updateCount: state.updateCount,
    
    ...fileSystem,
    
    // Map operations
    loadTree,
    reloadSubtree,
    clearMap,
    
    // Watching
    startWatching,
    stopWatching,
    
    // Query helpers (bound to current map)
    query: state.map ? {
      getNode: (path: string) => FileSystemQuery.getNode(state.map!, path),
      getAllFiles: () => FileSystemQuery.getAllFiles(state.map!),
      getAllDirs: () => FileSystemQuery.getAllDirs(state.map!),
      getChildren: (path: string) => FileSystemQuery.getChildren(state.map!, path),
      getParent: (path: string) => FileSystemQuery.getParent(state.map!, path),
      getAncestors: (path: string) => FileSystemQuery.getAncestors(state.map!, path),
      getDescendants: (path: string) => FileSystemQuery.getDescendants(state.map!, path),
      searchByName: (pattern: string | RegExp) => FileSystemQuery.searchByName(state.map!, pattern),
      getDirectorySize: (path: string) => FileSystemQuery.getDirectorySize(state.map!, path),
      getFileCount: (path: string) => FileSystemQuery.getFileCount(state.map!, path),
    } : null,
  };
}
