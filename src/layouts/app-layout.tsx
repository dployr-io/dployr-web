// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import AppLayoutTemplate from "@/layouts/app/app-sidebar-layout";
import { type BreadcrumbItem } from "@/types";
import { type ReactNode, useEffect } from "react";
import { AlertBanner } from "@/components/ui/alert-banner";
import { useAppAlert } from "@/contexts/app-alert-context";

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {
  const { error, notification, clearError, clearNotification } = useAppAlert();

  useEffect(() => {
    if (error?.message) {
      const timer = setTimeout(clearError, 10000);
      return () => clearTimeout(timer);
    }
  }, [error?.message, clearError]);

  return (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
      <div className="flex-1 min-h-0 px-9">
        {error?.message && (
          <AlertBanner
            message={error.message}
            helpLink={error.helpLink || ""}
            onDismiss={clearError}
          />
        )}

        {notification?.message && (
          <AlertBanner
            message={notification.message}
            helpLink={notification.helpLink || ""}
            variant="success"
            onDismiss={clearNotification}
          />
        )}
      </div>
      {children}
    </AppLayoutTemplate>
  );
};
