// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { IntegrationCard } from "@/components/integration-card";
import type { IntegrationUI } from "@/types";
import HeadingSmall from "@/components/heading-small";
import { use2FA } from "@/hooks/use-2fa";

interface IntegrationSectionProps {
    title: string;
    description: string;
    integrations: IntegrationUI[];
    connectedIntegrations: Set<string>;
    onToggle: (id: string) => void;
    onConnect: (id: string) => void;
    onSettings: (id: string) => void;
    twoFactor: ReturnType<typeof use2FA>;
}

export function IntegrationSection({
    title,
    description,
    integrations,
    connectedIntegrations,
    onToggle,
    onConnect,
    onSettings,
    twoFactor,
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
                        onConnect={onConnect}
                        onSettings={onSettings}
                        twoFactor={twoFactor}
                    />
                ))}
            </div>
        </section>
    );
}