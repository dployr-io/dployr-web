// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized instance information
 */
export const normalizedInstanceSchema = z.object({
  tag: z.string(),
});

export type NormalizedInstance = z.infer<typeof normalizedInstanceSchema>;

export const defaultInstance: NormalizedInstance = {
  tag: "",
};