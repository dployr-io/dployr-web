// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/lib/utils";
import { useInstanceStream, type StreamConnectionState } from "@/hooks/use-instance-stream";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const stateConfig: Record<StreamConnectionState, { dotColor: string; iconColor: string; label: string }> = {
  idle: { dotColor: "bg-gray-400", iconColor: "text-gray-400 dark:text-gray-500", label: "Stream idle" },
  connecting: { dotColor: "bg-amber-400", iconColor: "text-amber-400", label: "Connecting to stream..." },
  open: { dotColor: "bg-emerald-400", iconColor: "text-emerald-400", label: "Live" },
  closed: { dotColor: "bg-gray-400", iconColor: "text-gray-400 dark:text-gray-500", label: "Stream disconnected" },
  error: { dotColor: "bg-red-400", iconColor: "text-red-400", label: "Stream error" },
};

export function ConnectionStatus() {
  let state: StreamConnectionState = "idle";
  let error: string | null = null;

  try {
    const stream = useInstanceStream();
    state = stream.state;
    error = stream.error;
  } catch {
    // Not inside InstanceStreamProvider, show idle state
  }

  const config = stateConfig[state];
  const isLive = state === "open";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "h-2 w-2 rounded-full cursor-default",
            config.dotColor,
            (state === "connecting" || isLive) && "animate-pulse"
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{error || config.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
