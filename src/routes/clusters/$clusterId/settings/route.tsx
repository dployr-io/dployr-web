import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/clusters/$clusterId/settings")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/clusters/$clusterId/settings/profile",
      params: { clusterId: params.clusterId }
    });
  },
});
