// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { QueryClient } from '@tanstack/react-query';
import type { InstanceStream } from '@/types';

const CACHE_KEY = 'dployr_instance_cache';
const CACHE_VERSION = 1;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 2 * 1024 * 1024; // 2MB limit

interface CacheEntry {
  data: InstanceStream;
  timestamp: number;
}

interface PersistedCache {
  version: number;
  entries: Record<string, CacheEntry>;
}

let lastPersistedState: Record<string, number> = {};

export function persistCacheToStorage(queryClient: QueryClient): void {
  try {
    const cache: PersistedCache = {
      version: CACHE_VERSION,
      entries: {},
    };

    // Extract only changed instance-status queries
    const cacheData = queryClient.getQueryCache().getAll();
    let hasChanges = false;

    cacheData.forEach(query => {
      if (query.queryKey[0] === 'instance-status' && query.state.data) {
        const instanceId = query.queryKey[1] as string;
        const data = query.state.data as InstanceStream;
        const currentHash = hashInstanceStream(data);

        // Only include if data changed since last persist
        if (lastPersistedState[instanceId] !== currentHash) {
          cache.entries[instanceId] = {
            data,
            timestamp: Date.now(),
          };
          lastPersistedState[instanceId] = currentHash;
          hasChanges = true;
        }
      }
    });

    // Skip write if nothing changed
    if (!hasChanges) return;

    const serialized = JSON.stringify(cache);
    
    // Check size before writing
    if (serialized.length > MAX_CACHE_SIZE) {
      console.warn('Cache too large, skipping persist:', serialized.length);
      return;
    }

    localStorage.setItem(CACHE_KEY, serialized);
  } catch (error) {
    console.warn('Failed to persist cache:', error);
  }
}

// Simple hash to detect changes without deep comparison
function hashInstanceStream(data: InstanceStream): number {
  const deploymentCount = ((data?.update as any)?.deployments?.length ?? 0);
  const status = (data?.update as any)?.status?.state ?? '';
  const timestamp = (data?.update as any)?.timestamp ?? 0;
  return deploymentCount * 1000 + status.charCodeAt(0) + (timestamp % 10000);
}

export function restoreCacheFromStorage(queryClient: QueryClient): void {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return;

    const cache: PersistedCache = JSON.parse(stored);
    if (cache.version !== CACHE_VERSION) return;

    const now = Date.now();
    Object.entries(cache.entries).forEach(([instanceId, entry]) => {
      // Skip if cache entry is stale
      if (now - entry.timestamp > CACHE_TTL) return;

      queryClient.setQueryData(['instance-status', instanceId], entry.data);
    });
  } catch (error) {
    console.warn('Failed to restore cache:', error);
  }
}

export function clearCacheStorage(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}
