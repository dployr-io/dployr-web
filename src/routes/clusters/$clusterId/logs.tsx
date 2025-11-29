// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem } from "@/types";
import { LogsWindow } from "@/components/logs-window";
import { useLogs } from "@/hooks/use-logs";
import { ProtectedRoute } from "@/components/protected-route";
export const Route = createFileRoute("/clusters/$clusterId/logs")({
  component: Logs,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Logs",
    href: "/logs",
  },
];

function Logs() {
  const { logs, filteredLogs, selectedLevel, searchQuery, logsEndRef, setSelectedLevel, setSearchQuery } = useLogs();

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-hidden rounded-xl p-4">
          <div className="flex min-h-0 flex-1 auto-rows-min gap-4 p-8">
            <div className="flex min-h-0 w-full flex-1 flex-col gap-6">
              <LogsWindow
                logs={logs}
                filteredLogs={filteredLogs}
                selectedLevel={selectedLevel}
                searchQuery={searchQuery}
                logsEndRef={logsEndRef}
                setSelectedLevel={setSelectedLevel}
                setSearchQuery={setSearchQuery}
              />
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
