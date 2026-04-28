// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized node information
 */
export const normalizedNodeSchema = z.object({
  version: z.string(),
  commit: z.string(),
  buildDate: z.string(),
  goVersion: z.string(),
  os: z.string(),
  arch: z.string(),
});

export type NormalizedNode = z.infer<typeof normalizedNodeSchema>;

export const defaultNode: NormalizedNode = {
  version: "-",
  commit: "-",
  buildDate: "-",
  goVersion: "-",
  os: "-",
  arch: "-",
};
