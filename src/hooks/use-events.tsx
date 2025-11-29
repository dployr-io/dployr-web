// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from "@tanstack/react-query";
import { useUrlState } from "@/hooks/use-url-state";
import axios from "axios";
import type { ApiSuccessResponse, EventsResponse, PaginationMeta } from "@/types";

type EventsFilters = {
  type?: string;
  search?: string;
  sort?: "newest" | "oldest";
  window?: "all" | "24h" | "7d" | "30d";
};

export function useEvents(clusterId?: string, page = 1, pageSize?: number, filters?: EventsFilters) {
  const { useAppError } = useUrlState();
  const [{}, setError] = useAppError();

  const estimatedRowHeight = 64; // px, matches h-16 rows
  const viewportHeight =
    typeof globalThis !== "undefined" && typeof globalThis.innerHeight === "number"
      ? globalThis.innerHeight
      : 800;
  const reservedHeight = 320; // header + filters + paddings
  const availableHeight = Math.max(0, viewportHeight - reservedHeight);
  const effectivePageSize = pageSize ?? Math.max(6, Math.floor(availableHeight / estimatedRowHeight));

  const { type, search, sort, window } = filters ?? {};

  const { data, isLoading } = useQuery<EventsResponse>({
    queryKey: [
      "runtime-events",
      clusterId,
      page,
      effectivePageSize,
      type ?? null,
      search ?? null,
      sort ?? null,
      window ?? null,
    ],
    queryFn: async () => {
      try {
        if (!clusterId) {
          return {
            items: [],
            pagination: {
              page,
              pageSize: effectivePageSize,
              totalItems: 0,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            } satisfies PaginationMeta,
          };
        }

        const response = await axios.get<ApiSuccessResponse<EventsResponse>>(
          `${import.meta.env.VITE_BASE_URL}/v1/runtime/events`,
          {
            withCredentials: true,
            params: {
              clusterId,
              page,
              pageSize: effectivePageSize,
              type,
              search,
              sort,
              window,
            },
          }
        );

        const payload = response?.data?.data;
        if (!payload) {
          return {
            items: [],
            pagination: {
              page,
              pageSize: effectivePageSize,
              totalItems: 0,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            } satisfies PaginationMeta,
          };
        }

        return payload;
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

        return {
          items: [],
          pagination: {
            page,
            pageSize: effectivePageSize,
            totalItems: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          } satisfies PaginationMeta,
        };
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
    events: data?.items ?? [],
    pagination: data?.pagination,
    isLoading,
    formatTimestamp,
  };
}

