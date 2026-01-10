// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Runtime schema (v1.1 format)
 */
export const runtimeSchema = z.object({
  type: z.string(),
  version: z.string().optional(),
});

/**
 * Remote schema (v1.1 format)
 */
export const remoteSchema = z.object({
  url: z.string(),
  branch: z.string(),
  commit_hash: z.string().optional(),
});

const valueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

const secretSchema = z.object({
  key: z.string(),
  source: z.enum(["local"]),
});

/**
 * Deployment config schema (v1.1 format)
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
  env_vars: z.record(z.string(), valueSchema).optional(),
  secrets: z.array(secretSchema).optional(),
  status: z.string().optional(),
});

/**
 * Deployment schema (v1.1 format)
 */
export const deploymentSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  source: z.string(),
  runtime: runtimeSchema,
  remote: remoteSchema.optional(),
  run_command: z.string().optional(),
  build_command: z.string().optional(),
  port: z.number().optional(),
  working_dir: z.string().optional(),
  env_vars: z.record(z.string(), valueSchema).optional(),
  status: z.string(),
  metadata: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Service blueprint schema (v1.1 format)
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
  env_vars: z.record(z.string(), valueSchema).optional(),
  secrets: z.array(secretSchema).optional(),
  status: z.string().optional(),
});

/**
 * Service schema (v1.1 format)
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
  env_vars: z.record(z.string(), valueSchema).optional(),
  secrets: z.array(secretSchema).optional(),
  remote: z.string().optional(),
  branch: z.string().optional(),
  commit_hash: z.string().optional(),
  blueprint: blueprintSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const workloadsSchema = z.object({
  deployments: z.array(deploymentSchema).optional(),
  services: z.array(serviceSchema).optional(),
});

export type Workloads = z.infer<typeof workloadsSchema>;
export type Runtime = z.infer<typeof runtimeSchema>;
export type Remote = z.infer<typeof remoteSchema>;
export type DeploymentConfig = z.infer<typeof deploymentConfigSchema>;
export type Deployment = z.infer<typeof deploymentSchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;
export type Service = z.infer<typeof serviceSchema>;