// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import HeadingSmall from "@/components/heading-small";
import { Skeleton } from "@/components/ui/skeleton";
import { use2FA } from "@/hooks/use-2fa";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useVersion } from "@/hooks/use-version";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/clusters/$clusterId/settings/about")({
  component: AboutPage,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "About",
    href: "/settings/about",
  },
];

function AboutPage() {
  const twoFactor = use2FA({ enabled: true });
  const confirmation = useConfirmation();
  const { version, isLoading, error } = useVersion();

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <SettingsLayout twoFactor={twoFactor} confirmation={confirmation}>
          <div className="space-y-6">
            <HeadingSmall title="About" description="Your app, your server, your rules!" />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">App version</p>
              <p className="text-sm font-medium">{import.meta.env.VITE_APP_VERSION ?? "Unknown"}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Base version</p>
              {isLoading ? <Skeleton className="h-5 w-24" /> : error ? <p className="text-sm text-red-500">{error}</p> : <p className="text-sm font-medium">{version ?? "Unknown"}</p>}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                } catch {
                  // ignore storage errors
                }
                window.location.reload();
              }}
            >
              Restart tutorial
            </Button>
          </div>
        </SettingsLayout>
      </AppLayout>
    </ProtectedRoute>
  );
}
