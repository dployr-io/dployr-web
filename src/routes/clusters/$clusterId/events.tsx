import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, EventTarget, User } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEvents } from "@/hooks/use-events";
import { useClusters } from "@/hooks/use-clusters";
import { UserInfo } from "@/components/user-info";
import { useUrlState } from "@/hooks/use-url-state";

export const Route = createFileRoute("/clusters/$clusterId/events")({
  component: Notifications,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Events",
    href: "/events",
  },
];

function Notifications() {
  const { users, clusterId } = useClusters();
  const { useEventsUrlState } = useUrlState();
  const [{ type, search, sort, window, page }, setEventsUrlState] = useEventsUrlState();

  const selectedType = type;
  const searchQuery = search;
  const sortOrder = (sort as "newest" | "oldest") ?? "newest";
  const timeWindow = (window as "all" | "24h" | "7d" | "30d") ?? "all";
  const currentPage = page ?? 1;

  const { events, pagination, isLoading, formatTimestamp } = useEvents(clusterId, currentPage);

  const eventsArray = Array.isArray(events) ? events : [];
  const usersArray = Array.isArray(users) ? users : [];

  const userById = useMemo(() => {
    const map = new Map<string, User>();
    usersArray.forEach((user) => {
      map.set(user.id, user);
    });
    return map;
  }, [usersArray]);

  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(eventsArray.map((e) => e.type))).sort();
    return types;
  }, [eventsArray]);

  const filteredEvents = useMemo(() => {
    let result = eventsArray;

    // Time window filter (client-side)
    if (timeWindow !== "all") {
      const now = Date.now();
      const windowMs =
        timeWindow === "24h"
          ? 24 * 60 * 60 * 1000
          : timeWindow === "7d"
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;

      result = result.filter((event) => {
        return now - event.timestamp <= windowMs;
      });
    }

    if (selectedType !== "ALL") {
      result = result.filter((event) => event.type === selectedType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((event) => {
        const actorUser = event.actor.type === "user" ? userById.get(event.actor.id) : undefined;

        const actorLabel = `${event.actor.type}:${event.actor.id}`.toLowerCase();
        const actorName = actorUser?.name?.toLowerCase() ?? "";
        const actorEmail = actorUser?.email?.toLowerCase() ?? "";
        const targetsLabel = (event.targets || []).map((t: EventTarget) => t.id).join(", ").toLowerCase();

        return (
          actorName.includes(query) ||
          actorEmail.includes(query) ||
          actorLabel.includes(query) ||
          targetsLabel.includes(query)
        );
      });
    }

    // Sort by timestamp
    result = [...result].sort((a, b) => {
      if (sortOrder === "newest") {
        return b.timestamp - a.timestamp;
      }
      return a.timestamp - b.timestamp;
    });

    return result;
  }, [eventsArray, searchQuery, selectedType, sortOrder, timeWindow, userById]);

  const totalPages = pagination?.totalPages ?? 1;
  const pageSize = pagination?.pageSize ?? 20;

  const paginationRange = useMemo(() => {
    const totalPageNumbersToShow = 7;
    if (totalPages <= totalPageNumbersToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const current = currentPage;
    const firstPage = 1;
    const lastPage = totalPages;
    const siblingCount = 1;
    const leftSibling = Math.max(current - siblingCount, firstPage + 1);
    const rightSibling = Math.min(current + siblingCount, lastPage - 1);

    const showLeftDots = leftSibling > firstPage + 1;
    const showRightDots = rightSibling < lastPage - 1;

    const pages: (number | "dots")[] = [firstPage];

    if (!showLeftDots && showRightDots) {
      const leftRangeEnd = 3 + 2 * siblingCount;
      for (let i = 2; i <= leftRangeEnd; i++) {
        pages.push(i);
      }
      pages.push("dots");
    } else if (showLeftDots && !showRightDots) {
      pages.push("dots");
      const rightRangeStart = totalPages - (3 + 2 * siblingCount) + 1;
      for (let i = rightRangeStart; i < lastPage; i++) {
        pages.push(i);
      }
    } else if (showLeftDots && showRightDots) {
      pages.push("dots");
      for (let i = leftSibling; i <= rightSibling; i++) {
        pages.push(i);
      }
      pages.push("dots");
    } else {
      for (let i = 2; i < lastPage; i++) {
        pages.push(i);
      }
    }

    pages.push(lastPage);
    return pages;
  }, [currentPage, totalPages]);

  const goToPage = (page: number) => {
    const nextPage = Math.max(1, Math.min(page, totalPages));
    setEventsUrlState({ page: nextPage });
  };

  const goToPreviousPage = () => {
    const prev = Math.max(1, currentPage - 1);
    setEventsUrlState({ page: prev });
  };

  const goToNextPage = () => {
    const next = Math.min(totalPages, currentPage + 1);
    setEventsUrlState({ page: next });
  };

  const hasEvents = eventsArray.length > 0;

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full flex-col gap-4 px-9 pb-6">
            {!isLoading && !hasEvents ? (
              <div className="flex min-h-[400px] flex-1 items-center justify-center">
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No events yet</EmptyTitle>
                    <EmptyDescription>
                      When there is activity in your cluster, events will appear here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div>
                <div className="flex flex-col overflow-hidden rounded-xl border border-sidebar-border">
                  <div className="flex flex-wrap items-center gap-2 border-b border-sidebar-border bg-neutral-50 p-2 dark:bg-neutral-900">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="default"
                          variant="outline"
                          className="group min-w-40 text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
                        >
                          {selectedType === "ALL" ? "All event types" : selectedType}
                          <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-180" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-40 rounded-lg" align="start">
                        <DropdownMenuItem onClick={() => setEventsUrlState({ type: "ALL", page: 1 })}>
                          All event types
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {availableTypes.map((type) => (
                          <DropdownMenuItem
                            key={type}
                            onClick={() => setEventsUrlState({ type, page: 1 })}
                          >
                            {type}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="default"
                          variant="outline"
                          className="group min-w-40 text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
                        >
                          {sortOrder === "newest" ? "Newest first" : "Oldest first"}
                          <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-180" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-40 rounded-lg" align="start">
                        <DropdownMenuItem onClick={() => { setEventsUrlState({ sort: "newest", page: 1 }); }}>
                          Newest first
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setEventsUrlState({ sort: "oldest", page: 1 }); }}>
                          Oldest first
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="default"
                          variant="outline"
                          className="group min-w-40 text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
                        >
                          {timeWindow === "all"
                            ? "All time"
                            : timeWindow === "24h"
                              ? "Last 24 hours"
                              : timeWindow === "7d"
                                ? "Last 7 days"
                                : "Last 30 days"}
                          <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-180" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-40 rounded-lg" align="start">
                        <DropdownMenuItem onClick={() => { setEventsUrlState({ window: "all", page: 1 }); }}>
                          All time
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setEventsUrlState({ window: "24h", page: 1 }); }}>
                          Last 24 hours
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEventsUrlState({ window: "7d", page: 1 }); }}>
                          Last 7 days
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEventsUrlState({ window: "30d", page: 1 }); }}>
                          Last 30 days
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Input
                      id="search"
                      type="search"
                      name="search"
                      value={searchQuery}
                      onChange={(e) => {
                        setEventsUrlState({ search: e.target.value, page: 1 });
                      }}
                      autoComplete="search"
                      placeholder="Search by actor..."
                      className="dark:bg-neutral-950 flex-1 min-w-[200px]"
                    />
                  </div>
                </div>

                <Table>
                  <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
                    <TableRow>
                      <TableHead>Actor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Targets</TableHead>
                      <TableHead className="w-[220px]">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.length > 0 ? (
                      filteredEvents.map((event) => {
                        const actorUser = event.actor.type === "user" ? userById.get(event.actor.id) : undefined;

                        return (
                          <TableRow key={event.id} className="h-16">
                            <TableCell className="h-16 align-middle">
                              {actorUser ? (
                                <div className="flex items-center gap-2">
                                  <UserInfo user={actorUser} showEmail={false} />
                                </div>
                              ) : (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {event.actor.type}: {event.actor.id}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="h-16 align-middle font-mono text-xs">
                              {event.type}
                            </TableCell>
                            <TableCell className="h-16 align-middle">
                              {event.targets && event.targets.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {event.targets.map((target: EventTarget) => (
                                    <span
                                      key={target.id}
                                      className="inline-flex items-center rounded-full border border-sidebar-border px-2 py-0.5 text-xs font-mono text-muted-foreground"
                                    >
                                      {target.id}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="h-16 align-middle whitespace-nowrap">
                              {formatTimestamp(event.timestamp, event.timezoneOffset)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow className="h-16">
                        <TableCell colSpan={4} className="h-16 text-center align-middle text-sm text-muted-foreground">
                          {isLoading ? "Loading events..." : "No events match your filters"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const totalItems = pagination?.totalItems ?? filteredEvents.length;
                      if (totalItems === 0) return "No events found";
                      if (totalItems === 1) return "Showing 1 of 1 event";

                      const current = pagination?.page ?? currentPage;
                      const size = pagination?.pageSize ?? pageSize;
                      const start = (current - 1) * size + 1;
                      const end = start + filteredEvents.length - 1;

                      return `Showing ${start} to ${Math.min(end, totalItems)} of ${totalItems} events`;
                    })()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {paginationRange.map((item, index) => {
                        if (item === "dots") {
                          return (
                            <Button key={`dots-${index}`} variant="outline" size="sm" disabled className="h-8 w-8 p-0">
                              ...
                            </Button>
                          );
                        }

                        const page = item as number;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
