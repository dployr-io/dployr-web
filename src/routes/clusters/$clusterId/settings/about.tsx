// Copyright 2025 Dployr
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Link } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import HeadingSmall from "@/components/heading-small";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { use2FA } from "@/hooks/use-2fa";
import { useConfirmation } from "@/hooks/use-confirmation";
import { useVersion } from "@/hooks/use-version";
import { useInstances } from "@/hooks/use-instances";
import { useInstanceStatus } from "@/hooks/use-instance-status";
import { useClusterId } from "@/hooks/use-cluster-id";
import { useBilling } from "@/hooks/use-billing";
import { CreditCard } from "lucide-react";

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
  const clusterId = useClusterId();
  const twoFactor = use2FA({ enabled: true });
  const confirmation = useConfirmation();
  const { version, isLoading: versionLoading, error: versionError } = useVersion({ enableAvailableVersions: false });
  const { instances } = useInstances();
  const firstInstance = instances?.[0];
  const { update: instanceStatus } = useInstanceStatus(firstInstance?.tag);
  const { billingStatus, isLoadingStatus } = useBilling();
  const appVersion = import.meta.env.VITE_APP_VERSION ?? null;
  const dployrdVersion = instanceStatus?.node?.version && instanceStatus.node.version !== "-" ? instanceStatus.node.version : null;

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <SettingsLayout twoFactor={twoFactor} confirmation={confirmation}>
          <div className="space-y-4">
            <HeadingSmall title="About" description="Your app, your server, your rules!" />

            {/* Versions */}
            <div className="flex items-center gap-2">
              {dployrdVersion && (
                <div className="flex flex-col gap-0.5 rounded-md border bg-muted/40 px-3 py-2 min-w-20">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">dployrd</span>
                  <span className="text-xs font-mono font-medium">{dployrdVersion}</span>
                </div>
              )}
              <div className="flex flex-col gap-0.5 rounded-md border bg-muted/40 px-3 py-2 min-w-20">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">web</span>
                <span className="text-xs font-mono font-medium">{appVersion ?? "–"}</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-md border bg-muted/40 px-3 py-2 min-w-20">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">base</span>
                {versionLoading ? <Skeleton className="h-3.5 w-12 mt-0.5" /> : <span className="text-xs font-mono font-medium">{versionError ? "–" : (version ?? "–")}</span>}
              </div>
            </div>

            {/* Billing shortcut */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{isLoadingStatus ? <Skeleton className="h-4 w-20 inline-block" /> : (billingStatus?.planDetails?.name ?? "Hobby")} plan</p>
                  <p className="text-xs text-muted-foreground">
                    {isLoadingStatus ? (
                      <Skeleton className="h-3 w-32 inline-block mt-0.5" />
                    ) : billingStatus?.planDetails?.price === 0 || !billingStatus?.planDetails ? (
                      "You’re currently on the hobby plan, upgrade to unlock more features."
                    ) : (
                      `$${billingStatus.planDetails.price}/${billingStatus.planDetails.interval}`
                    )}
                  </p>
                </div>
              </div>
              <Link to="/clusters/$clusterId/settings/billing" params={{ clusterId: clusterId ?? "" }}>
                <Button variant="outline" size="sm" className="shrink-0">
                  View billing
                </Button>
              </Link>
            </div>
          </div>
        </SettingsLayout>
      </AppLayout>
    </ProtectedRoute>
  );
}
