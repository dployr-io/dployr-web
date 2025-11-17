import { createFileRoute, Link } from "@tanstack/react-router";

import "@/css/app.css";
import { ProtectedRoute } from "@/components/protected-route";
import type { BreadcrumbItem } from "@/types";
import AppHeaderLayout from "@/layouts/app/app-header-layout";
import { useClusters } from "@/hooks/use-clusters";

export const Route = createFileRoute("/clusters/")({
  component: Clusters,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Clusters",
    href: "/clusters",
  },
];

function Clusters() {
  const { clusters } = useClusters();

  // TODO: Fix overflow
  // const clusters = Array.from({ length: 20 }, (_, i) => ({
  //   id: `cluster-${i + 1}`,
  //   name: `Cluster ${i + 1}`,
  //   owner: "name",
  // }));

  return (
    <ProtectedRoute>
      <AppHeaderLayout breadcrumbs={breadcrumbs}>
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
          <div className="flex w-full flex-col gap-6 px-9 py-6">
            <p className="text-3xl font-black">Overview</p>
          </div>

          {clusters?.map((item, _) => (
            <Link
              className="flex flex-col rounded-xl border border-sidebar-border/70 p-4 no-underline hover:cursor-pointer hover:border-muted-foreground dark:border-sidebar-border dark:hover:border-muted-foreground"
              to={"/clusters/$clusterId"}
              params={{ clusterId: item.id }}
              key={item.id}
            >
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.name}</p>
                  <p className="truncate">{item.owner}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </AppHeaderLayout>
    </ProtectedRoute>
  );
}
