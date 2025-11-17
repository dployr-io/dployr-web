import { useQuery } from "@tanstack/react-query";
import { useUrlState } from "@/hooks/use-url-state";
import axios from "axios";
import type { ApiSuccessResponse, ClusterEvent, EventsResponse } from "@/types";

export function useEvents(clusterId?: string, page = 1, pageSize = 20) {
  const { useAppError } = useUrlState();
  const [{}, setError] = useAppError();

  const { data: events, isLoading } = useQuery<ClusterEvent[]>({
    queryKey: ["runtime-events", clusterId, page, pageSize],
    queryFn: async () => {
      try {
        if (!clusterId) return [];

        const response = await axios.get<ApiSuccessResponse<EventsResponse>>(
          `${import.meta.env.VITE_BASE_URL}/v1/runtime/events`,
          {
            withCredentials: true,
            params: {
              clusterId,
              page,
              pageSize,
            },
          }
        );

        const data = response?.data?.data?.items;
        return Array.isArray(data) ? data : [];
      } catch (error: any) {
        const errorData = error?.response?.data?.error;
        const errorMessage =
          typeof errorData === "string"
            ? errorData
            : errorData?.message || error?.message || "An error occurred while loading events.";
        const helpLink = error?.response?.data?.error?.helpLink;

        setError({
          appError: {
            message: errorMessage,
            helpLink,
          },
        });

        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!clusterId,
  });

  function formatTimestamp(timestamp: number, timezoneOffset: string) {
    try {
      const date = new Date(timestamp);

      const datePart = date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });

      const timePart = date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Extract just the timezone label (e.g. "GMT+1") from the provided offset string
      const tzLabel = (() => {
        if (!timezoneOffset) return "";
        const parts = timezoneOffset.split(" ");
        const last = parts[parts.length - 1];
        return last?.startsWith("GMT") ? last : timezoneOffset;
      })();

      return tzLabel ? `${datePart}, ${timePart} • ${tzLabel}` : `${datePart}, ${timePart}`;
    } catch {
      return timezoneOffset || String(timestamp);
    }
  }

  return {
    events,
    isLoading,
    formatTimestamp,
  };
}

