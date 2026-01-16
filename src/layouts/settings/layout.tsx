// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { type NavItem } from "@/types";
import { type PropsWithChildren } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { AlertBanner } from "@/components/ui/alert-banner";
import { useUrlState } from "@/hooks/use-url-state";
import { useConfirmation } from "@/hooks/use-confirmation";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { TwoFactorDialog } from "@/components/two-factor-dialog";
import { use2FA } from "@/hooks/use-2fa";
import { useClusterId } from "@/hooks/use-cluster-id";

interface SettingsLayoutProps extends PropsWithChildren {
  twoFactor: ReturnType<typeof use2FA>;
  confirmation: ReturnType<typeof useConfirmation>;
}

export default function SettingsLayout({ children, twoFactor, confirmation }: SettingsLayoutProps) {
  const clusterId = useClusterId();
  const location = useLocation();
  const { useAppError, useAppNotification, useAutoInitializeAppState } = useUrlState();
  const [{ appError }, setError] = useAppError();
  const [{ appNotification }, setAppNotification] = useAppNotification();
  useAutoInitializeAppState(setError, setAppNotification);
  const { pendingAction, setPendingAction } = confirmation;

  const sidebarNavItems: NavItem[] = [
    {
      title: "Profile",
      href: clusterId ? "/clusters/$clusterId/settings/profile" : "/settings/profile",
      icon: null,
    },
    {
      title: "Users",
      href: clusterId ? "/clusters/$clusterId/settings/users" : "/settings/users",
      icon: null,
    },
    {
      title: "Integrations",
      href: clusterId ? "/clusters/$clusterId/settings/integrations" : "/settings/integrations",
      icon: null,
    },
    {
      title: "About",
      href: clusterId ? "/clusters/$clusterId/settings/about" : "/settings/about",
      icon: null,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col px-4 pt-6">
      <div className="flex w-full max-w-6xl flex-col lg:flex-row lg:space-x-12 flex-1">
        <aside className="w-full shrink-0 max-w-xl lg:w-48 lg:sticky lg:top-6 lg:self-start">
          <nav className="flex flex-col space-y-1 space-x-0">
            {sidebarNavItems.map((item, index) => (
              <Button
                key={`${item.href}-${index}`}
                size="sm"
                variant="ghost"
                asChild
                className={cn("w-full justify-start", {
                  "bg-muted": location.pathname === item.href,
                })}
              >
                <Link to={item.href}>
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.title}
                </Link>
              </Button>
            ))}
          </nav>
        </aside>

        <Separator className="my-6 lg:hidden" />

        <div className="flex-1 min-h-0">
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

          <ConfirmationDialog pendingAction={pendingAction} setPendingAction={setPendingAction} />

          <TwoFactorDialog open={twoFactor.isOpen} onOpenChange={twoFactor.setIsOpen} onVerify={twoFactor.verify} isSubmitting={twoFactor.isVerifying} />

          <section className="w-full space-y-12 overflow-y-auto max-h-full">{children}</section>
        </div>
      </div>

      <footer className="lg:sticky lg:bottom-0 border-t min-h-12 bg-background/80 backdrop-blur-sm -mx-4 px-4">
        <div className="flex w-full justify-center py-3">
          <div className="flex space-x-6 text-xs text-muted-foreground">
            <a href="https://dployr.instatus.com" className="hover:underline">
              Status
            </a>
            <span className="text-border">•</span>
            <a href="https://dployr.io/changelog" className="hover:underline">
              Changelog
            </a>
            <span className="text-border">•</span>
            <a href="https://dployr.io/legal/terms-of-service.html" className="hover:underline">
              Terms of Use
            </a>
            <span className="text-border">•</span>
            <a href="https://dployr.io/legal/privacy-policy.html" className="hover:underline">
              Privacy Policy
            </a>
            <span className="text-border">•</span>
            <a href="https://dployr.io/docs/quickstart.html" className="hover:underline">
              Docs
            </a>
            <span className="text-border">•</span>
            <a href="https://discord.gg/RdJdctub" className="hover:underline">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
