// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Proxy route schema
 */
export const proxyRouteSchema = z.object({
  domain: z.string(),
  upstream: z.string(),
  template: z.string(),
  root: z.string().nullable().optional(),
  status: z.string(),
});

/**
 * Proxy configuration schema
 */
export const proxySchema = z.object({
  type: z.string(),
  status: z.string(),
  version: z.string().optional(),
  route_count: z.number().optional(),
  routes: z.array(proxyRouteSchema).optional(),
});

export type ProxyRoute = z.infer<typeof proxyRouteSchema>;
export type Proxy = z.infer<typeof proxySchema>;
