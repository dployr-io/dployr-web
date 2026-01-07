// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Instance status schema
 */
export const statusSchema = z.object({
  state: z.string(),
  mode: z.string(),
  uptime_seconds: z.number(),
});

export type Status = z.infer<typeof statusSchema>;
