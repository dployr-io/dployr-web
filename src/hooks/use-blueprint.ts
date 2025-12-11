// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useState } from "react";

export interface Blueprint {
  name: string;
  description: string;
  source: "remote" | "image";
  runtime: {
    type: string;
    version: string;
  };
  version: string;
  run_cmd: string;
  build_cmd: string;
  port: number;
  working_dir: string;
  static_dir: string;
  image: string;
  env_vars: Record<string, string>;
  secrets: Record<string, string>;
  remote: {
    url: string;
    branch: string;
    commit_hash: string;
  };
  domain: string;
  dns_provider: string;
}

const DEFAULT_BLUEPRINT: Blueprint = {
  name: "my-awesome-app",
  description: "Demo deployment of my awesome app",
  source: "remote",
  runtime: {
    type: "nodejs",
    version: "18",
  },
  version: "1.0.0",
  run_cmd: "npm run start",
  build_cmd: "npm run build",
  port: 3000,
  working_dir: "/app",
  static_dir: "build",
  image: "",
  env_vars: {
    NODE_ENV: "production",
    LOG_LEVEL: "info",
  },
  secrets: {
    DB_PASSWORD: "",
    API_KEY: "",
  },
  remote: {
    url: "",
    branch: "main",
    commit_hash: "",
  },
  domain: "",
  dns_provider: "cloudflare",
};

export function useBlueprint() {
  const [content, setContent] = useState<string>(JSON.stringify(DEFAULT_BLUEPRINT, null, 2));
  const [error, setError] = useState<string>("");

  const validate = useCallback((value: string): boolean => {
    try {
      JSON.parse(value);
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      return false;
    }
  }, []);

  const format = useCallback(() => {
    try {
      const parsed = JSON.parse(content);
      setContent(JSON.stringify(parsed, null, 2));
      setError("");
    } catch {
      // Keep content as-is if invalid
    }
  }, [content]);

  const reset = useCallback(() => {
    setContent(JSON.stringify(DEFAULT_BLUEPRINT, null, 2));
    setError("");
  }, []);

  const getBlueprint = useCallback((): Blueprint | null => {
    try {
      return JSON.parse(content) as Blueprint;
    } catch {
      return null;
    }
  }, [content]);

  const updateField = useCallback(<K extends keyof Blueprint>(field: K, value: Blueprint[K]) => {
    try {
      const parsed = JSON.parse(content) as Blueprint;
      parsed[field] = value;
      setContent(JSON.stringify(parsed, null, 2));
      setError("");
    } catch {
      // Invalid JSON, can't update
    }
  }, [content]);

  return {
    content,
    setContent,
    error,
    validate,
    format,
    reset,
    getBlueprint,
    updateField,
  };
}
