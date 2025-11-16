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
import { EmailConnectDialog } from "@/components/email-connect-dialog";

export const Route = createFileRoute("/settings/integrations")({
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
    return integrationIds.map(id => ({
      id,
      ...INTEGRATIONS_METADATA[id],
      connected: false, // TODO: Get from apiIntegrations
    }));
  }, [apiIntegrations]);

  const connectedIntegrations = useMemo(() => {
    return new Set(integrations.filter(i => i.connected).map(i => i.id));
  }, [integrations]);

  const handleToggle = (id: string) => {
    setSelectedIntegrationId(id);
    setDialogOpen(true);
  };

  const selectedIntegration = selectedIntegrationId
    ? integrations.find(i => i.id === selectedIntegrationId) || null
    : null;

  const handleSettings = (id: string) => {
    // TODO: Implement settings modal/page
    console.log("Open settings for:", id);
  };

  const sections = [
    {
      title: "Email & Notifications",
      description: "Configure email and notification services",
      integrations: integrations.filter(i => i.category === "email"),
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
          <RemoteConnectDialog
            integration={selectedIntegration}
            open={dialogOpen && selectedIntegration?.category === "remote"}
            onOpenChange={setDialogOpen}
          />
          <DomainConnectDialog
            integration={selectedIntegration}
            open={dialogOpen && selectedIntegration?.category === "domain"}
            onOpenChange={setDialogOpen}
          />
          <EmailConnectDialog
            integration={selectedIntegration}
            open={dialogOpen && selectedIntegration?.category === "email"}
            onOpenChange={setDialogOpen}
          />
        </SettingsLayout>
      </AppLayout>
    </ProtectedRoute>
  );
}
