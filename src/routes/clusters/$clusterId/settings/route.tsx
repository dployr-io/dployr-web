import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/clusters/$clusterId/settings")({
  component: Outlet,
  beforeLoad: ({ params, location }) => {
    // redirect from settings root
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const expectedSegments = ["clusters", params.clusterId, "settings"];
    const isAtSettingsRoot = pathSegments.length === expectedSegments.length && pathSegments[0] === "clusters" && pathSegments[1] === params.clusterId && pathSegments[2] === "settings";

    if (isAtSettingsRoot) {
      throw redirect({
        to: "/clusters/$clusterId/settings/profile",
        params: { clusterId: params.clusterId },
      });
    }
  },
});
