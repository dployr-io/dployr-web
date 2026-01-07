// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Runtime schema (v1 format)
 */
export const runtimeSchema = z.object({
  type: z.string(),
  version: z.string().optional(),
});

/**
 * Remote schema (v1 format)
 */
export const remoteSchema = z.object({
  url: z.string(),
  branch: z.string(),
  commit_hash: z.string().optional(),
});

/**
 * Deployment config schema (v1 nested format)
 */
export const deploymentConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  source: z.string(),
  runtime: runtimeSchema,
  remote: remoteSchema.optional(),
  run_cmd: z.string().optional(),
  build_cmd: z.string().optional(),
  port: z.number().optional(),
  working_dir: z.string().optional(),
  env_vars: z.record(z.string()).optional(),
  status: z.string().optional(),
});

/**
 * Deployment schema (v1 format with nested config)
 */
export const deploymentSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  config: deploymentConfigSchema,
  status: z.string(),
  metadata: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Service blueprint schema (v1 format)
 */
export const blueprintSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  source: z.string(),
  runtime: runtimeSchema,
  remote: remoteSchema.optional(),
  run_cmd: z.string().optional(),
  build_cmd: z.string().optional(),
  port: z.number().optional(),
  working_dir: z.string().optional(),
  env_vars: z.record(z.string()).optional(),
  status: z.string().optional(),
});

/**
 * Service schema (v1 format)
 */
export const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  source: z.string().optional(),
  runtime: z.string(),
  runtime_version: z.string().optional(),
  run_cmd: z.string().optional(),
  build_cmd: z.string().optional(),
  port: z.number().optional(),
  working_dir: z.string().optional(),
  env_vars: z.record(z.string()).optional(),
  remote: z.string().optional(),
  branch: z.string().optional(),
  commit_hash: z.string().optional(),
  blueprint: blueprintSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Runtime = z.infer<typeof runtimeSchema>;
export type Remote = z.infer<typeof remoteSchema>;
export type DeploymentConfig = z.infer<typeof deploymentConfigSchema>;
export type Deployment = z.infer<typeof deploymentSchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;
export type Service = z.infer<typeof serviceSchema>;
