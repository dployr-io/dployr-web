// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem, IntegrationUI } from "@/types";
import { integrationIds, INTEGRATIONS_METADATA } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { useMemo, useState } from "react";
import { IntegrationSection } from "@/components/integration-section";
import { useClusters } from "@/hooks/use-clusters";
import { use2FA } from "@/hooks/use-2fa";
import { useConfirmation } from "@/hooks/use-confirmation";
import { RemoteConnectDialog } from "@/components/remote-connect-dialog";
import { DomainConnectDialog } from "@/components/domain-connect-dialog";
import { NotificationsConnectDialog } from "@/components/notifications-connect-dialog";

export const Route = createFileRoute("/clusters/$clusterId/settings/integrations")({
  component: Integrations,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Integrations",
    href: "/settings/integrations",
  },
];

function Integrations() {
  const { integrations: apiIntegrations } = useClusters();
  const twoFactor = use2FA({ enabled: true });
  const confirmation = useConfirmation();
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const integrations = useMemo<IntegrationUI[]>(() => {
    return integrationIds
      .map(id => {
        const metadata = INTEGRATIONS_METADATA[id];

        if (!metadata) {
          return null;
        }

        const category = metadata.category;

        let isConnected = false;
        if (apiIntegrations && apiIntegrations[category]) {
          const categoryIntegrations = apiIntegrations[category];
          if (categoryIntegrations && categoryIntegrations[id as keyof typeof categoryIntegrations]) {
            isConnected = true;
          }
        }

        return {
          id,
          ...metadata,
          connected: isConnected,
        } as IntegrationUI;
      })
      .filter((integration): integration is IntegrationUI => integration !== null);
  }, [apiIntegrations]);

  const connectedIntegrations = useMemo(() => {
    return new Set(integrations.filter(i => i.connected).map(i => i.id));
  }, [integrations]);

  const handleToggle = (id: string) => {
    setSelectedIntegrationId(id);
    setDialogOpen(true);
  };

  const selectedIntegration = selectedIntegrationId ? integrations.find(i => i.id === selectedIntegrationId) || null : null;

  const handleSettings = (id: string) => {
    // TODO: Implement settings modal/page
    console.log("Open settings for:", id);
  };

  const sections = [
    {
      title: "Email & Notifications",
      description: "Configure email and notification services",
      integrations: integrations.filter(i => i.category === "notifications"),
    },
    {
      title: "Remotes",
      description: "Connect your version control repositories",
      integrations: integrations.filter(i => i.category === "remote"),
    },
    {
      title: "Domains",
      description: "Manage your domain and DNS providers",
      integrations: integrations.filter(i => i.category === "domain"),
    },
  ];

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <SettingsLayout twoFactor={twoFactor} confirmation={confirmation}>
          <div className="space-y-12">
            {sections.map(section => (
              <IntegrationSection
                key={section.title}
                title={section.title}
                description={section.description}
                integrations={section.integrations}
                connectedIntegrations={connectedIntegrations}
                onToggle={handleToggle}
                onConnect={handleToggle}
                onSettings={handleSettings}
                twoFactor={twoFactor}
              />
            ))}
          </div>
          <RemoteConnectDialog integration={selectedIntegration} integrations={apiIntegrations} open={dialogOpen && selectedIntegration?.category === "remote"} onOpenChange={setDialogOpen} />
          <DomainConnectDialog integration={selectedIntegration} open={dialogOpen && selectedIntegration?.category === "domain"} onOpenChange={setDialogOpen} />
          <NotificationsConnectDialog integration={selectedIntegration} open={dialogOpen && selectedIntegration?.category === "notifications"} onOpenChange={setDialogOpen} />
        </SettingsLayout>
      </AppLayout>
    </ProtectedRoute>
  );
}
