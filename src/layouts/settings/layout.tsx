// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type NavItem } from "@/types";
import { type PropsWithChildren } from "react";
import { Link } from "@tanstack/react-router";
import { useConfirmation } from "@/hooks/use-confirmation";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { TwoFactorDialog } from "@/components/two-factor-dialog";
import { use2FA } from "@/hooks/use-2fa";
import { useClusterId } from "@/hooks/use-cluster-id";
import { useAuth } from "@/hooks/use-auth";
import { useClusters } from "@/hooks/use-clusters";

interface SettingsLayoutProps extends PropsWithChildren {
  twoFactor: ReturnType<typeof use2FA>;
  confirmation: ReturnType<typeof useConfirmation>;
}

export default function SettingsLayout({ children, twoFactor, confirmation }: SettingsLayoutProps) {
  const clusterId = useClusterId();
  const { pendingAction, setPendingAction } = confirmation;
  const { user } = useAuth();
  const { users } = useClusters();

  const isOwner = users?.find(u => u.id === user?.id)?.role === "owner";

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
    ...(isOwner
      ? [
          {
            title: "Billing",
            href: clusterId ? "/clusters/$clusterId/settings/billing" : "/settings/billing",
            icon: null,
          },
        ]
      : []),
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
                className="w-full justify-start"
              >
                <Link
                  to={item.href}
                  params={clusterId ? { clusterId } : {}}
                  activeOptions={{ exact: true }}
                  activeProps={{ className: "bg-muted" }}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.title}
                </Link>
              </Button>
            ))}
          </nav>
        </aside>

        <Separator className="my-6 lg:hidden" />

        <div className="flex-1 min-h-0">
          <ConfirmationDialog pendingAction={pendingAction} setPendingAction={setPendingAction} />

          <TwoFactorDialog open={twoFactor.isOpen} onOpenChange={twoFactor.setIsOpen} onVerify={twoFactor.verify} isSubmitting={twoFactor.isVerifying} />

          <section className="w-full space-y-12 overflow-y-auto max-h-full">{children}</section>
        </div>
      </div>

      <footer className="lg:sticky lg:bottom-0 border-t min-h-12 bg-background/80 backdrop-blur-sm -mx-4 px-4">
        <div className="flex w-full items-center justify-between py-3">
          <div className="flex space-x-6 text-xs text-muted-foreground">
            <a href="https://status.dployr.io" className="hover:underline">
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
            <a href="https://discord.gg/tY8ZbjvrSZ" className="hover:underline">
              Discord
            </a>
            <span className="text-border">•</span>
            <a href="https://x.com/dployr" className="hover:underline">
              X
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Dployr ·{" "}
            <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noreferrer" className="hover:underline">
              Apache-2.0
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
