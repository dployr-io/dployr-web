// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized health status
 * Maps v1 'ws' to 'websocket' for consistency
 */
export const normalizedHealthSchema = z.object({
  overall: z.string(),
  websocket: z.string(),
  tasks: z.string(),
  proxy: z.string(),
  auth: z.string(),
});

export type NormalizedHealth = z.infer<typeof normalizedHealthSchema>;

export const defaultHealth: NormalizedHealth = {
  overall: "-",
  websocket: "-",
  tasks: "-",
  proxy: "-",
  auth: "-",
};
