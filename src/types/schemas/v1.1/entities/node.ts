// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Node information schema contains dployrd version and build details running on node
 */
export const nodeSchema = z.object({
  version: z.string(),
  commit: z.string(),
  build_date: z.string(),
  go_version: z.string(),
  os: z.string(),
  arch: z.string(),
});

export type Node = z.infer<typeof nodeSchema>;
