// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized status information
 */
export const normalizedStatusSchema = z.object({
  state: z.string(),
  mode: z.string(),
  uptimeSeconds: z.number(),
});

export type NormalizedStatus = z.infer<typeof normalizedStatusSchema>;

export const defaultStatus: NormalizedStatus = {
  state: "-",
  mode: "-",
  uptimeSeconds: 0,
};