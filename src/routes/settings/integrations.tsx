import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem, Integration } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { useMemo } from "react";
import { Mail, MessageSquare, Globe } from "lucide-react";
import { RxGithubLogo } from "react-icons/rx";
import { FaGitlab, FaBitbucket } from "react-icons/fa6";
import { IntegrationSection } from "@/components/integration-section";
import { useClusters } from "@/hooks/use-clusters";

export const Route = createFileRoute("/settings/integrations")({
    component: Integrations,
});

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Integrations",
        href: "/settings/integrations",
    },
];

const integrationDefinitions: Omit<Integration, "connected">[] = [
    // Email & Notifications
    {
        id: "resendMail",
        name: "Resend",
        description: "Send transactional emails with Resend",
        icon: <Mail className="h-5 w-5" />,
        category: "email",
    },
    {
        id: "mailChimp",
        name: "Mailchimp",
        description: "Email marketing and automation platform",
        icon: <Mail className="h-5 w-5" />,
        category: "email",
    },
    {
        id: "mailerSend",
        name: "Mailersend",
        description: "Transactional email delivery service",
        icon: <Mail className="h-5 w-5" />,
        category: "email",
    },
    {
        id: "discord",
        name: "Discord",
        description: "Send notifications to Discord channels",
        icon: <MessageSquare className="h-5 w-5" />,
        category: "email",
    },
    {
        id: "slack",
        name: "Slack",
        description: "Send notifications to Slack workspaces",
        icon: <MessageSquare className="h-5 w-5" />,
        category: "email",
    },
    // Remotes
    {
        id: "gitHub",
        name: "GitHub",
        description: "Connect your GitHub repositories",
        icon: <RxGithubLogo className="h-5 w-5" />,
        category: "remote",
    },
    {
        id: "gitLab",
        name: "GitLab",
        description: "Connect your GitLab repositories",
        icon: <FaGitlab className="h-5 w-5" />,
        category: "remote",
    },
    {
        id: "bitBucket",
        name: "Bitbucket",
        description: "Connect your Bitbucket repositories",
        icon: <FaBitbucket className="h-5 w-5" />,
        category: "remote",
    },
    // Domains
    {
        id: "godaddy",
        name: "GoDaddy",
        description: "Manage domains with GoDaddy",
        icon: <Globe className="h-5 w-5" />,
        category: "domain",
    },
    {
        id: "cloudflare",
        name: "Cloudflare",
        description: "Manage domains and DNS with Cloudflare",
        icon: <Globe className="h-5 w-5" />,
        category: "domain",
    },
    {
        id: "route53",
        name: "Route 53",
        description: "Amazon Route 53 DNS management",
        icon: <Globe className="h-5 w-5" />,
        category: "domain",
    },
];

function Integrations() {
    const { integrations: apiIntegrations } = useClusters();

    const integrations = useMemo(() => {
        return integrationDefinitions.map((def) => ({
            ...def,
            connected: apiIntegrations?.[def.id as keyof typeof apiIntegrations] || false,
        }));
    }, [apiIntegrations]);

    const connectedIntegrations = useMemo(() => {
        return new Set(integrations.filter((i) => i.connected).map((i) => i.id));
    }, [integrations]);

    const handleToggle = (id: string) => {
        // TODO: Implement API call to toggle integration
        console.log("Toggle integration:", id);
    };

    const handleSettings = (id: string) => {
        // TODO: Implement settings modal/page
        console.log("Open settings for:", id);
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
