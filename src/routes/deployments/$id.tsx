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
            title: deployment?.id || "",
            href: `/deployments/${deployment?.id}`,
        },
    ];

    return breadcrumbs;
};

function ViewDeployment() {
    const deployment: Deployment = {
        id: "123",
        config: {},
        status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
    };
    const config = deployment.config;
    const breadcrumbs = ViewProjectBreadcrumbs(deployment);
    const {
        logs,
        filteredLogs,
        selectedLevel,
        searchQuery,
        logsEndRef,
        setSelectedLevel,
        setSearchQuery,
    } = useLogs(deployment);
    const { blueprintFormat, setBlueprintFormat } = useServiceForm();

    const yamlConfig = toYaml(config);
    const jsonConfig = toJson(config);
    const handleBlueprintCopy = async () => {
        try {
            if (!deployment) return;
            await navigator.clipboard.writeText(
                blueprintFormat === "yaml" ? yamlConfig : jsonConfig,
            );
        } catch {
            return;
        }
    };

    return (
        <ProtectedRoute>
            <AppLayout breadcrumbs={breadcrumbs}>
                <head title="Projects" />
                <div className="flex h-full min-h-0 flex-col gap-4 rounded-xl p-4">
                    <div className="flex min-h-0 flex-1 auto-rows-min flex-col gap-6 px-9 py-6">
                        <div className="flex flex-col gap-1">
                            <p className="text-xl font-semibold">
                                {config?.name || "Deployment"}
                            </p>
                        </div>
                        <div className="flex min-h-0 flex-1">
                            <Tabs
                                defaultValue="logs"
                                className="flex min-h-0 w-full flex-col"
                            >
                                <TabsList className="self-start">
                                    <TabsTrigger value="logs">Logs</TabsTrigger>
                                    <TabsTrigger value="blueprint">
                                        Blueprint
                                    </TabsTrigger>
                                </TabsList>
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
                                    <BlueprintSection
                                        name={config.name!}
                                        blueprintFormat={blueprintFormat}
                                        yamlConfig={yamlConfig}
                                        jsonConfig={jsonConfig}
                                        setBlueprintFormat={setBlueprintFormat}
                                        handleBlueprintCopy={
                                            handleBlueprintCopy
                                        }
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </AppLayout>
        </ProtectedRoute>
    );
}
