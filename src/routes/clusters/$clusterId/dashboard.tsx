import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import type { BreadcrumbItem } from "@/types";

export const Route = createFileRoute("/clusters/$clusterId/dashboard")({
  component: Dashboard,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
  },
];

function Dashboard() {
  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full flex-col gap-6 px-9 py-6">
            <p className="text-3xl font-black">Overview</p>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
