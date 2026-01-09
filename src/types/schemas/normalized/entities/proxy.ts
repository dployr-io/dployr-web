
// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized proxy route
 */
export const normalizedProxyRouteSchema = z.object({
  domain: z.string(),
  upstream: z.string(),
  template: z.string(),
  root: z.string().nullable(),
  status: z.string(),
});

/**
 * Normalized proxy status
 */
export const normalizedProxySchema = z.object({
  type: z.string(),
  status: z.string(),
  version: z.string().nullable(),
  routes: z.array(normalizedProxyRouteSchema),
});

export type NormalizedProxyRoute = z.infer<typeof normalizedProxyRouteSchema>;
export type NormalizedProxy = z.infer<typeof normalizedProxySchema>;

export const defaultProxy: NormalizedProxy | null = null;