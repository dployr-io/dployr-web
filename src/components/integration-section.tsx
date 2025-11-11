import { IntegrationCard } from "@/components/integration-card";
import type { Integration } from "@/types";
import HeadingSmall from "@/components/heading-small";

interface IntegrationSectionProps {
    title: string;
    description: string;
    integrations: Integration[];
    connectedIntegrations: Set<string>;
    onToggle: (id: string) => void;
    onSettings: (id: string) => void;
}

export function IntegrationSection({
    title,
    description,
    integrations,
    connectedIntegrations,
    onToggle,
    onSettings,
}: IntegrationSectionProps) {
    return (
        <section className="space-y-6 mb-12">
            <HeadingSmall title={title} description={description} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {integrations.map((integration) => (
                    <IntegrationCard
                        key={integration.id}
                        integration={integration}
                        isConnected={connectedIntegrations.has(integration.id)}
                        onToggle={onToggle}
                        onSettings={onSettings}
                    />
                ))}
            </div>
        </section>
    );
}