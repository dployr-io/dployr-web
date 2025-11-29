// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { ConfigTable } from "@/components/config-table";
import { useEnv } from "@/hooks/use-env";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { use2FA } from "@/hooks/use-2fa";
import { useConfirmation } from "@/hooks/use-confirmation";

export const Route = createFileRoute("/clusters/$clusterId/settings/config")({
  component: ConfigPage,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Configuration",
    href: "/settings/config",
  },
];

function ConfigPage() {
  const { config, editValue, editingKey, setEditValue, handleCancel, handleEdit, handleKeyboardPress, handleSave } = useEnv();
  const twoFactor = use2FA({ enabled: true });
  const confirmation = useConfirmation();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Convert config to entries and paginate
  const configEntries = useMemo(() => Object.entries(config || {}), [config]);

  const totalPages = Math.ceil(configEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEntries = configEntries.slice(startIndex, endIndex);
  const paginatedConfig = useMemo(() => Object.fromEntries(paginatedEntries), [paginatedEntries]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <SettingsLayout twoFactor={twoFactor} confirmation={confirmation}>
          <div className="space-y-4">
            <ConfigTable
              config={paginatedConfig}
              editingKey={editingKey}
              editValue={editValue}
              setEditValue={setEditValue}
              handleEdit={handleEdit}
              handleSave={handleSave}
              handleKeyboardPress={handleKeyboardPress}
              handleCancel={handleCancel}
            />

            {configEntries.length > itemsPerPage && (
              <div className="flex items-center justify-between px-2 py-4">
                <div className="text-sm text-muted-foreground">
                  {configEntries.length === 0
                    ? "No config entries found"
                    : configEntries.length === 1
                      ? "Showing 1 of 1 entry"
                      : `Showing ${startIndex + 1} to ${Math.min(endIndex, configEntries.length)} of ${configEntries.length} entries`}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1} className="flex items-center gap-1">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => goToPage(page)} className="h-8 w-8 p-0">
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages} className="flex items-center gap-1">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SettingsLayout>
      </AppLayout>
    </ProtectedRoute>
  );
}
