// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/lib/utils";
import { getStatusColor } from "./utils";

export function StatusDot({ status, pulse = true }: { status?: string; pulse?: boolean }) {
  const color = getStatusColor(status);
  return (
    <span className="relative flex h-2.5 w-2.5">
      {pulse && status === "running" && (
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", color)} />
      )}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", color)} />
    </span>
  );
}
