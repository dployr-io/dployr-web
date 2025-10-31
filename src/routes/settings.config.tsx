import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem } from "@/types";
import { ProtectedRoute } from "@/components/protected-route";
import { ConfigTable } from "@/components/config-table";
import { useEnv } from "@/hooks/use-env";

export const Route = createFileRoute("/settings/config")({
    component: ConfigPage,
});

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Configuration",
        href: "/settings/config",
    },
];

function ConfigPage() {
    const {
        config,
        editValue,
        editingKey,
        setEditValue,
        handleCancel,
        handleEdit,
        handleKeyboardPress,
        handleSave,
    } = useEnv();

    return (
        <ProtectedRoute>
            <AppLayout breadcrumbs={breadcrumbs}>
                <SettingsLayout>
                    <div className="space-y-4">
                        <ConfigTable
                            config={config}
                            editingKey={editingKey}
                            editValue={editValue}
                            setEditValue={setEditValue}
                            handleEdit={handleEdit}
                            handleSave={handleSave}
                            handleKeyboardPress={handleKeyboardPress}
                            handleCancel={handleCancel}
                        />
                    </div>
                </SettingsLayout>
            </AppLayout>
        </ProtectedRoute>
    );
}
