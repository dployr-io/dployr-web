// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Runtime schema
 */
export const runtimeSchema = z.object({
  type: z.string(),
  version: z.string().optional(),
});

/**
 * Remote repository schema
 */
export const remoteSchema = z.object({
  url: z.string(),
  branch: z.string(),
  commit_hash: z.string().optional(),
});

/**
 * Deployment schema
 */
export const deploymentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.string(),
  source: z.string(),
  runtime: runtimeSchema,
  remote: remoteSchema.optional(),
  port: z.number().optional(),
  working_dir: z.string().optional(),
  run_command: z.string().optional(),
  build_command: z.string().optional(),
  env_vars: z.record(z.string()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Service schema
 */
export const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  runtime: z.string(),
  runtime_version: z.string().optional(),
  port: z.number().optional(),
  working_dir: z.string().optional(),
  run_command: z.string().optional(),
  build_command: z.string().optional(),
  env_vars: z.record(z.string()).optional(),
  remote_url: z.string().optional(),
  branch: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Workloads schema containing deployments and services
 */
export const workloadsSchema = z.object({
  deployments: z.array(deploymentSchema).optional(),
  services: z.array(serviceSchema).optional(),
});

export type Runtime = z.infer<typeof runtimeSchema>;
export type Remote = z.infer<typeof remoteSchema>;
export type Deployment = z.infer<typeof deploymentSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Workloads = z.infer<typeof workloadsSchema>;
