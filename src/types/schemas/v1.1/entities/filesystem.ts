// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * File/directory permissions schema
 */
export const fsPermissionsSchema = z.object({
  mode: z.string(),
  owner: z.string(),
  group: z.string(),
  uid: z.number(),
  gid: z.number(),
  readable: z.boolean(),
  writable: z.boolean(),
  executable: z.boolean(),
});

/**
 * Filesystem node schema (recursive)
 */
export const fsNodeSchema: z.ZodType<FsNode> = z.lazy(() =>
  z.object({
    path: z.string(),
    name: z.string(),
    type: z.enum(["file", "directory", "symlink", "dir"]),
    size_bytes: z.number(),
    modified_at: z.string().optional(),
    permissions: fsPermissionsSchema.optional(),
    children: z.array(fsNodeSchema).optional(),
    is_truncated: z.boolean().optional(),
    total_children: z.number().optional(),
  })
);

/**
 * Filesystem snapshot schema
 */
export const filesystemSchema = z.object({
  generated_at: z.string(),
  is_stale: z.boolean().optional(),
  roots: z.array(fsNodeSchema),
});

export type FsPermissions = z.infer<typeof fsPermissionsSchema>;
export interface FsNode {
  path: string;
  name: string;
  type: "file" | "directory" | "symlink" | "dir";
  size_bytes: number;
  modified_at?: string;
  permissions?: FsPermissions;
  children?: FsNode[];
  is_truncated?: boolean;
  total_children?: number;
}
export type Filesystem = z.infer<typeof filesystemSchema>;