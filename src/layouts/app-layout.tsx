// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import AppLayoutTemplate from "@/layouts/app/app-sidebar-layout";
import { type BreadcrumbItem } from "@/types";
import { type ReactNode, useEffect } from "react";
import { useUrlState } from "@/hooks/use-url-state";
import { AlertBanner } from "@/components/ui/alert-banner";

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => {
  const { useAppError, useAppNotification } = useUrlState();
  const [{ appError }, setError] = useAppError();
  const [{ appNotification }, setAppNotification] = useAppNotification();

  useEffect(() => {
    if (appError.message) {
      const timer = setTimeout(() => {
        setError({
          appError: {
            message: "",
            helpLink: "",
          },
        });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [appError.message, setError]);
  return (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
      <div className="flex-1 min-h-0 px-9">
        {appError.message && (
          <AlertBanner
            message={appError.message}
            helpLink={appError.helpLink || ""}
            onDismiss={() =>
              setError({
                appError: {
                  message: "",
                  helpLink: "",
                },
              })
            }
          />
        )}

        {appNotification.message && (
            <AlertBanner
              message={appNotification.message}
              helpLink={appNotification.link || ""}
              variant="success"
              onDismiss={() =>
                setAppNotification({
                  appNotification: {
                    message: "",
                    link: "",
                  },
                })
              }
            />
          )}
      </div>
      {children}
    </AppLayoutTemplate>
  );
};
