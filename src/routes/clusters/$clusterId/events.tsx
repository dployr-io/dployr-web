import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, User } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  const itemsPerPage = 20;

  const { events, isLoading, formatTimestamp } = useEvents(clusterId, currentPage, itemsPerPage);

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
        const targetsLabel = (event.targets || []).map((t) => t.id).join(", ").toLowerCase();

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

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

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
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full flex-1 flex-col gap-4 px-9 pb-6">
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
              <>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 rounded-t-xl border border-b-0 border-sidebar-border bg-neutral-50 p-2 dark:bg-neutral-900">
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
                  <Separator />
                </div>

                <Table className="overflow-hidden rounded-b-lg border border-t-0 border-sidebar-border">
                  <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
                    <TableRow>
                      <TableHead>Actor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[220px]">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEvents.length > 0 ? (
                      paginatedEvents.map((event) => {
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
                            <TableCell className="h-16 align-middle whitespace-nowrap">
                              {formatTimestamp(event.timestamp, event.timezoneOffset)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow className="h-16">
                        <TableCell colSpan={3} className="h-16 text-center align-middle text-sm text-muted-foreground">
                          {isLoading ? "Loading events..." : "No events match your filters"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    {filteredEvents.length === 0
                      ? "No events found"
                      : filteredEvents.length === 1
                        ? "Showing 1 of 1 event"
                        : `Showing ${startIndex + 1} to ${Math.min(endIndex, filteredEvents.length)} of ${filteredEvents.length} events`}
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
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
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
              </>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
