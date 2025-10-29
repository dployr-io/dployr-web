import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, Deployment } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/protected-route";
import { toJson, toYaml } from "@/lib/utils";
import { useServiceForm } from "@/hooks/use-service-form";
import { useLogs } from "@/hooks/use-logs";
import { LogsWindow } from "@/components/logs-window";
import { BlueprintSection } from "@/components/blueprint";
import { useDeployments } from "@/hooks/use-deployments";
import {
    ArrowUpRightIcon,
    ChevronLeft,
    FileX2,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
export const Route = createFileRoute("/deployments/$id")({
    component: ViewDeployment,
});

const ViewProjectBreadcrumbs = (deployment?: Deployment) => {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: "Deployments",
            href: "/deployments",
        },
        {
            title: deployment?.config?.name || "",
            href: `/deployments/${deployment?.id || ""}`,
        },
    ];

    return breadcrumbs;
};

function ViewDeployment() {
    const { selectedDeployment: deployment, isLoading } = useDeployments();
    const config = deployment?.config;
    const breadcrumbs = ViewProjectBreadcrumbs(deployment!);
    const {
        logs,
        filteredLogs,
        selectedLevel,
        searchQuery,
        logsEndRef,
        setSelectedLevel,
        setSearchQuery,
    } = useLogs(deployment?.id, deployment);
    const { blueprintFormat, setBlueprintFormat } = useServiceForm();

    const yamlConfig = config ? toYaml(config) : "";
    const jsonConfig = config ? toJson(config) : "";
    const handleBlueprintCopy = async () => {
        try {
            if (!deployment || !config) return;
            await navigator.clipboard.writeText(
                blueprintFormat === "yaml" ? yamlConfig : jsonConfig,
            );
        } catch {
            return;
        }
    };

    if (isLoading) {
        return (
            <ProtectedRoute>
                <AppLayout breadcrumbs={breadcrumbs}>
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </EmptyMedia>
                            <EmptyTitle>Retrieving Deployment...</EmptyTitle>
                            <EmptyDescription>
                                This shouldn&apos;t take too long! Try
                                refreshing your browser if you see this.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <div className="flex justify-center gap-2">
                                <Button>
                                    <a href={"#"}>Deploy Service</a>
                                </Button>
                                <Button
                                    variant="link"
                                    asChild
                                    className="text-muted-foreground"
                                    size="sm"
                                >
                                    <a href="#">
                                        Learn More <ArrowUpRightIcon />
                                    </a>
                                </Button>
                            </div>
                        </EmptyContent>
                    </Empty>
                </AppLayout>
            </ProtectedRoute>
        );
    }

    if (!deployment) {
        return (
            <ProtectedRoute>
                <AppLayout breadcrumbs={breadcrumbs}>
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <FileX2 />
                            </EmptyMedia>
                            <EmptyTitle>No Deployment Found!</EmptyTitle>
                            <EmptyDescription>
                                The requested deployment was not found. Please
                                verify the ID and try again.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <div className="flex justify-center gap-2">
                                <Button onClick={() => window.history.back()}>
                                    <ChevronLeft /> Back
                                </Button>
                                <Button
                                    variant="link"
                                    asChild
                                    className="text-muted-foreground"
                                    size="sm"
                                >
                                    <a href="#">
                                        Learn More <ArrowUpRightIcon />
                                    </a>
                                </Button>
                            </div>
                        </EmptyContent>
                    </Empty>
                </AppLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="flex h-full min-h-0 flex-col gap-4 rounded-xl p-4">
                    <div className="flex min-h-0 flex-1 auto-rows-min flex-col gap-6 px-9 py-2">
                        <div className="flex min-h-0 flex-1">
                            <Tabs
                                defaultValue="logs"
                                className="flex min-h-0 w-full flex-col"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <TabsList className="self-start">
                                        <TabsTrigger value="logs">
                                            Logs
                                        </TabsTrigger>
                                        <TabsTrigger value="blueprint">
                                            Blueprint
                                        </TabsTrigger>
                                    </TabsList>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => window.history.back()}
                                        className="h-8 px-3 text-muted-foreground"
                                    >
                                        <ChevronLeft /> Back
                                    </Button>
                                </div>
                                <TabsContent
                                    value="logs"
                                    className="flex min-h-0 flex-1 flex-col"
                                >
                                    <LogsWindow
                                        logs={logs}
                                        filteredLogs={filteredLogs}
                                        selectedLevel={selectedLevel}
                                        searchQuery={searchQuery}
                                        logsEndRef={logsEndRef}
                                        setSelectedLevel={setSelectedLevel}
                                        setSearchQuery={setSearchQuery}
                                    />
                                </TabsContent>
                                <TabsContent value="blueprint">
                                    {config?.name ? (
                                        <BlueprintSection
                                            name={config.name}
                                            blueprintFormat={blueprintFormat}
                                            yamlConfig={yamlConfig}
                                            jsonConfig={jsonConfig}
                                            setBlueprintFormat={
                                                setBlueprintFormat
                                            }
                                            handleBlueprintCopy={
                                                handleBlueprintCopy
                                            }
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center p-8 gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <p className="text-muted-foreground">
                                                Loading blueprint...
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </AppLayout>
        </ProtectedRoute>
    );
}
