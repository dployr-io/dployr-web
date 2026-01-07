// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Build information schema (v1 format)
 */
export const buildInfoSchema = z.object({
  version: z.string(),
  commit: z.string(),
  date: z.string(),
  go_version: z.string(),
});

/**
 * Platform information schema (v1 format)
 */
export const platformSchema = z.object({
  os: z.string(),
  arch: z.string(),
});

export type BuildInfo = z.infer<typeof buildInfoSchema>;
export type Platform = z.infer<typeof platformSchema>;
