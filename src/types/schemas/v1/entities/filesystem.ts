// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

/**
 * Filesystem node schema (v1 format)
 */
export const fsNodeSchema: z.ZodType<FsNode> = z.lazy(() =>
  z.object({
    path: z.string(),
    name: z.string(),
    type: z.enum(["file", "dir", "symlink", "directory"]),
    size_bytes: z.number(),
    mod_time: z.string().optional(),
    mode: z.string().optional(),
    owner: z.string().optional(),
    group: z.string().optional(),
    uid: z.number().optional(),
    gid: z.number().optional(),
    readable: z.boolean().optional(),
    writable: z.boolean().optional(),
    executable: z.boolean().optional(),
    children: z.array(fsNodeSchema).optional(),
    truncated: z.boolean().optional(),
    child_count: z.number().optional(),
  })
);

/**
 * Filesystem snapshot schema (v1 format)
 */
export const fsSnapshotSchema = z.object({
  generated_at: z.string(),
  roots: z.array(fsNodeSchema),
});

export interface FsNode {
  path: string;
  name: string;
  type: "file" | "dir" | "symlink" | "directory";
  size_bytes: number;
  mod_time?: string;
  mode?: string;
  owner?: string;
  group?: string;
  uid?: number;
  gid?: number;
  readable?: boolean;
  writable?: boolean;
  executable?: boolean;
  children?: FsNode[];
  truncated?: boolean;
  child_count?: number;
}
export type FsSnapshot = z.infer<typeof fsSnapshotSchema>;