import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem, Integration } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { useState } from "react";
import {
    Mail,
    MessageSquare,
    Globe,
} from "lucide-react";
import { RxGithubLogo } from "react-icons/rx";
import { FaGitlab, FaBitbucket } from "react-icons/fa6";
import { IntegrationSection } from "@/components/integration-section";

export const Route = createFileRoute("/settings/integrations")({
    component: Integrations,
});

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Integrations",
        href: "/settings/integrations",
    },
];



const integrations: Integration[] = [
    // Email & Notifications
    {
        id: "resend",
        name: "Resend",
        description: "Send transactional emails with Resend",
        icon: <Mail className="h-5 w-5" />,
        category: "email",
        connected: false,
    },
    {
        id: "mailchimp",
        name: "Mailchimp",
        description: "Email marketing and automation platform",
        icon: <Mail className="h-5 w-5" />,
        category: "email",
        connected: false,
    },
    {
        id: "mailersend",
        name: "Mailersend",
        description: "Transactional email delivery service",
        icon: <Mail className="h-5 w-5" />,
        category: "email",
        connected: false,
    },
    {
        id: "discord",
        name: "Discord",
        description: "Send notifications to Discord channels",
        icon: <MessageSquare className="h-5 w-5" />,
        category: "email",
        connected: false,
    },
    {
        id: "slack",
        name: "Slack",
        description: "Send notifications to Slack workspaces",
        icon: <MessageSquare className="h-5 w-5" />,
        category: "email",
        connected: false,
    },
    // Remotes
    {
        id: "github",
        name: "GitHub",
        description: "Connect your GitHub repositories",
        icon: <RxGithubLogo className="h-5 w-5" />,
        category: "remote",
        connected: true,
    },
    {
        id: "gitlab",
        name: "GitLab",
        description: "Connect your GitLab repositories",
        icon: <FaGitlab className="h-5 w-5" />,
        category: "remote",
        connected: false,
    },
    {
        id: "bitbucket",
        name: "Bitbucket",
        description: "Connect your Bitbucket repositories",
        icon: <FaBitbucket className="h-5 w-5" />,
        category: "remote",
        connected: false,
    },
    // Domains
    {
        id: "godaddy",
        name: "GoDaddy",
        description: "Manage domains with GoDaddy",
        icon: <Globe className="h-5 w-5" />,
        category: "domain",
        connected: false,
    },
    {
        id: "cloudflare",
        name: "Cloudflare",
        description: "Manage domains and DNS with Cloudflare",
        icon: <Globe className="h-5 w-5" />,
        category: "domain",
        connected: false,
    },
    {
        id: "route53",
        name: "Route 53",
        description: "Amazon Route 53 DNS management",
        icon: <Globe className="h-5 w-5" />,
        category: "domain",
        connected: false,
    },
];

function Integrations() {
    const [connectedIntegrations, setConnectedIntegrations] = useState<
        Set<string>
    >(new Set(integrations.filter((i) => i.connected).map((i) => i.id)));

    const handleToggle = (id: string) => {
        setConnectedIntegrations((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSettings = (id: string) => {
        // Find the integration for logging/debugging
        const integration = integrations.find((i) => i.id === id);
        console.log(`Opening settings for integration: ${id}`, integration);
        
        // TODO: Implement integration settings modal or navigation
        // For now, this is a placeholder that can be extended later
        alert(`Settings for ${integration?.name || id} - Coming soon!`);
    };

    const sections = [
        {
            title: "Email & Notifications",
            description: "Configure email and notification services",
            integrations: integrations.filter((i) => i.category === "email"),
        },
        {
            title: "Remotes",
            description: "Connect your version control repositories",
            integrations: integrations.filter((i) => i.category === "remote"),
        },
        {
            title: "Domains",
            description: "Manage your domain and DNS providers",
            integrations: integrations.filter((i) => i.category === "domain"),
        },
    ];

    return (
        <ProtectedRoute>
            <AppLayout breadcrumbs={breadcrumbs}>
                <SettingsLayout>
                    <div className="space-y-12">
                        {sections.map((section) => (
                            <IntegrationSection
                                key={section.title}
                                title={section.title}
                                description={section.description}
                                integrations={section.integrations}
                                connectedIntegrations={connectedIntegrations}
                                onToggle={handleToggle}
                                onSettings={handleSettings}
                            />
                        ))}
                    </div>
                </SettingsLayout>
            </AppLayout>
        </ProtectedRoute>
    );
}
