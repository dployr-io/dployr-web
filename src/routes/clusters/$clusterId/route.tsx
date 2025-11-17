import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/clusters/$clusterId")({
  component: Outlet,
  beforeLoad: ({ params, location }) => {
    // Only redirect if we're not already on dashboard, console, logs, or notifications
    const currentPath = location.pathname;
    const isSubRoute = currentPath.includes('/dashboard') ||
                      currentPath.includes('/console') ||
                      currentPath.includes('/logs') ||
                      currentPath.includes('/notifications') ||
                      currentPath.includes('/settings') ||
                      currentPath.includes('/services') ||
                      currentPath.includes('/deployments');
    
    if (!isSubRoute) {
      throw redirect({
        to: "/clusters/$clusterId/dashboard",
        params: { clusterId: params.clusterId }
      });
    }
  },
});
