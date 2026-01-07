// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized certificate diagnostics
 */
export const normalizedCertDiagnosticsSchema = z.object({
  notAfter: z.string(),
  daysRemaining: z.number(),
});

/**
 * Normalized diagnostics
 * Unified representation from v1 (debug) and v1.1 (diagnostics)
 */
export const normalizedDiagnosticsSchema = z.object({
  bootstrapTokenPreview: z.string().nullable(),
  workers: z.number(),
  activeJobs: z.number(),
  cert: normalizedCertDiagnosticsSchema.nullable(),
});

export type NormalizedCertDiagnostics = z.infer<typeof normalizedCertDiagnosticsSchema>;
export type NormalizedDiagnostics = z.infer<typeof normalizedDiagnosticsSchema>;

export const defaultDiagnostics: NormalizedDiagnostics = {
  bootstrapTokenPreview: null,
  workers: 0,
  activeJobs: 0,
  cert: null,
};
