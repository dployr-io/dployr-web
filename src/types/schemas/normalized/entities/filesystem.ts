// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Normalized filesystem permissions
 */
export const normalizedFsPermissionsSchema = z.object({
  readable: z.boolean(),
  writable: z.boolean(),
  executable: z.boolean(),
});

/**
 * Normalized filesystem node
 */
export const normalizedFsNodeSchema: z.ZodType<NormalizedFsNode> = z.lazy(() =>
  z.object({
    path: z.string(),
    name: z.string(),
    type: z.enum(["file", "dir", "symlink"]),
    sizeBytes: z.number(),
    modifiedAt: z.string().nullable(),
    mode: z.string().nullable(),
    owner: z.string().nullable(),
    group: z.string().nullable(),
    uid: z.number().nullable(),
    gid: z.number().nullable(),
    permissions: normalizedFsPermissionsSchema.nullable(),
    children: z.array(normalizedFsNodeSchema).nullable(),
    truncated: z.boolean(),
    childCount: z.number().nullable(),
  })
);

/**
 * Normalized filesystem
 */
export const normalizedFilesystemSchema = z.object({
  generatedAt: z.string(),
  roots: z.array(normalizedFsNodeSchema),
});

export interface NormalizedFsNode {
  path: string;
  name: string;
  type: "file" | "dir" | "symlink";
  sizeBytes: number;
  modifiedAt: string | null;
  mode: string | null;
  owner: string | null;
  group: string | null;
  uid: number | null;
  gid: number | null;
  permissions: NormalizedFsPermissions | null;
  children: NormalizedFsNode[] | null;
  truncated: boolean;
  childCount: number | null;
}

export type NormalizedFsPermissions = z.infer<typeof normalizedFsPermissionsSchema>;
export type NormalizedFilesystem = z.infer<typeof normalizedFilesystemSchema>;

export const defaultFilesystem: NormalizedFilesystem | null = null;