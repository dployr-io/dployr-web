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
  commitHash: z.string().optional().nullable(),
});

const valueSchema = z.union([z.string(), z.number(), z.boolean()]);

const secretSchema = z.object({
  key: z.string(),
  source: z.enum(["local"]),
});

/**
 * Normalized service
 */
export const normalizedServiceSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  type: z.string().optional(),
  runtime: normalizedRuntimeSchema.optional(),
  remote: normalizedRemoteSchema.nullable().optional(),
  runCmd: z.string().nullable().optional(),
  buildCmd: z.string().nullable().optional(),
  port: z.number().nullable().optional(),
  workingDir: z.string().nullable().optional(),
  staticDir: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  envVars: z.record(z.string(), valueSchema).nullable().optional(),
  secrets: z.array(secretSchema).nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  status: z.enum(["running", "sleeping"]).optional(),
  healthCheck: z.string().nullable().optional(),
  health: z.enum(["healthy", "degraded"]).optional(),
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
  staticDir: z.string().nullable(),
  image: z.string().nullable(),
  envVars: z.record(z.string(), valueSchema).nullable(),
  secrets: z.array(secretSchema).nullable(),
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
