// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Proxy app status schema (v1 format)
 */
export const proxyAppStatusSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
});

/**
 * Proxy app schema (individual route - v1 format)
 */
export const proxyAppSchema = z.object({
  domain: z.string(),
  upstream: z.string(),
  template: z.string(),
  root: z.string().optional(),
  status: proxyAppStatusSchema.optional(),
});

/**
 * Proxy status schema (overall proxy server status - v1 format)
 */
export const proxyStatusSchema = z.object({
  status: z.string(),
  routes: z.number(),
});

export type ProxyAppStatus = z.infer<typeof proxyAppStatusSchema>;
export type ProxyApp = z.infer<typeof proxyAppSchema>;
export type ProxyStatus = z.infer<typeof proxyStatusSchema>;