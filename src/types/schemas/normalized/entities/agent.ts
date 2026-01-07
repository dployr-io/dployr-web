// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized agent information
 * Unified representation from both v1 (build_info + platform) and v1.1 (agent)
 */
export const normalizedAgentSchema = z.object({
  version: z.string(),
  commit: z.string(),
  buildDate: z.string(),
  goVersion: z.string(),
  os: z.string(),
  arch: z.string(),
});

export type NormalizedAgent = z.infer<typeof normalizedAgentSchema>;

export const defaultAgent: NormalizedAgent = {
  version: "-",
  commit: "-",
  buildDate: "-",
  goVersion: "-",
  os: "-",
  arch: "-",
};
