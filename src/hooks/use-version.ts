// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

interface CompatibilityCheckResponse {
  success: boolean;
  data: {
    compatible: boolean;
    compatibilityDate: string;
    version: string;
    latestVersion: string;
    upgradeLevel: "patch" | "minor" | "major";
    requiredCompatibilityDate: string;
    message: string;
  };
}

interface AvailableVersionsResponse {
  success: boolean;
  data: {
    latest: string;
    oldestSupportedVersion: string;
    versions: string[];
    includePreReleases: boolean;
  };
}

export function useVersion(options?: {
  showPreReleases?: boolean;
  enableAvailableVersions?: boolean;
  currentVersion?: string | null;
  compatibilityDate?: string;
}) {
  const {
    showPreReleases = false,
    enableAvailableVersions = true,
    currentVersion = null,
    compatibilityDate,
  } = options || {};

  const [version, setVersion] = useState<string | null>(null);
  const [availableVersions, setAvailableVersions] = useState<AvailableVersionsResponse["data"] | null>(null);
  const [compatibility, setCompatibility] = useState<CompatibilityCheckResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBaseVersion = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${import.meta.env.VITE_BASE_URL}/v1/health`, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as HealthResponse;
        if (isMounted) {
          setVersion(data.version ?? null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load version");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBaseVersion();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!enableAvailableVersions) {
      return;
    }

    let isMounted = true;

    const fetchVersions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BASE_URL}/v1/runtime/versions?showPreReleases=${showPreReleases}`,
          { headers: { Accept: "application/json" } },
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const result = (await response.json()) as AvailableVersionsResponse;
        if (isMounted && result.success) {
          setAvailableVersions(result.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch versions");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchVersions();

    return () => {
      isMounted = false;
    };
  }, [showPreReleases, enableAvailableVersions]);

  useEffect(() => {
    if (!currentVersion) {
      setCompatibility(null);
      return;
    }

    let isMounted = true;

    const checkCompatibility = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${import.meta.env.VITE_BASE_URL}/v1/runtime/compatibility/check`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: currentVersion,
            compatibilityDate: compatibilityDate || new Date().toISOString().split("T")[0],
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as CompatibilityCheckResponse;
        if (isMounted && data.success) {
          setCompatibility(data.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to check compatibility");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkCompatibility();

    return () => {
      isMounted = false;
    };
  }, [currentVersion, compatibilityDate]);

  return {
    version,
    availableVersions,
    compatibility,
    isLoading,
    error,
  };
}
