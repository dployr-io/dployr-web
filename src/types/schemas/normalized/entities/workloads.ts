// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized runtime information
 */
export const normalizedRuntimeSchema = z.object({
  type: z.string(),
  version: z.string().nullable(),
});

/**
 * Normalized remote (git) information
 */
export const normalizedRemoteSchema = z.object({
  url: z.string(),
  branch: z.string(),
  commitHash: z.string().nullable(),
});

/**
 * Normalized service
 */
export const normalizedServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  source: z.string().nullable(),
  runtime: normalizedRuntimeSchema,
  remote: normalizedRemoteSchema.nullable(),
  runCmd: z.string().nullable(),
  buildCmd: z.string().nullable(),
  port: z.number().nullable(),
  workingDir: z.string().nullable(),
  envVars: z.record(z.string()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Normalized deployment
 */
export const normalizedDeploymentSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  source: z.string(),
  runtime: normalizedRuntimeSchema,
  remote: normalizedRemoteSchema.nullable(),
  runCmd: z.string().nullable(),
  buildCmd: z.string().nullable(),
  port: z.number().nullable(),
  workingDir: z.string().nullable(),
  envVars: z.record(z.string()).nullable(),
  status: z.string(),
  metadata: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Normalized workloads
 */
export const normalizedWorkloadsSchema = z.object({
  services: z.array(normalizedServiceSchema),
  deployments: z.array(normalizedDeploymentSchema),
});

export type NormalizedRuntime = z.infer<typeof normalizedRuntimeSchema>;
export type NormalizedRemote = z.infer<typeof normalizedRemoteSchema>;
export type NormalizedService = z.infer<typeof normalizedServiceSchema>;
export type NormalizedDeployment = z.infer<typeof normalizedDeploymentSchema>;
export type NormalizedWorkloads = z.infer<typeof normalizedWorkloadsSchema>;

export const defaultWorkloads: NormalizedWorkloads = {
  services: [],
  deployments: [],
};
