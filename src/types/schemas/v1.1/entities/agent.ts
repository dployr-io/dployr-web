// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Agent information schema - contains version and build details
 */
export const agentSchema = z.object({
  version: z.string(),
  commit: z.string(),
  build_date: z.string(),
  go_version: z.string(),
  os: z.string(),
  arch: z.string(),
});

export type Agent = z.infer<typeof agentSchema>;