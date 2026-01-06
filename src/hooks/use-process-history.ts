import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ulid } from "ulid";
import type { ProcessSnapshot } from "@/types";
import { useInstanceStream } from "./use-instance-stream";

export function useProcessHistory(instanceId: string) {
  const subscriberId = useId();
  const { sendJson, subscribe, unsubscribe, isConnected } = useInstanceStream();
  const [snapshots, setSnapshots] = useState<ProcessSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback((startTime?: number, endTime?: number) => {
    if (!isConnected) {
      setError("WebSocket not connected");
      return;
    }

    setIsLoading(true);
    setError(null);
    const requestId = ulid();

    sendJson({
      kind: "process_history",
      requestId,
      instanceId,
      startTime,
      endTime,
    });
  }, [instanceId, isConnected, sendJson]);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.kind === "process_history_response") {
        setSnapshots(message.data?.snapshots ?? []);
        setIsLoading(false);
      }

      if (message.kind === "error") {
        setError(message.message || "Failed to fetch process history");
        setIsLoading(false);

        console.error("Process history error:", message.message);
      }
    };

    subscribe(subscriberId, handleMessage);

    return () => {
      unsubscribe(subscriberId);
    };
  }, [subscriberId, subscribe, unsubscribe]);

  return { snapshots, fetchHistory, isLoading, error };
}