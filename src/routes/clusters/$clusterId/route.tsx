// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { InstanceStreamProvider } from "@/hooks/use-instance-stream";

function ClusterLayout() {
  return (
    <InstanceStreamProvider>
      <Outlet />
    </InstanceStreamProvider>
  );
}

export const Route = createFileRoute("/clusters/$clusterId")({
  component: ClusterLayout,
  beforeLoad: ({ params, location }) => { 
    // redirect from cluster root
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const expectedSegments = ['clusters', params.clusterId];
    const isAtClusterRoot = pathSegments.length === expectedSegments.length &&
                           pathSegments[0] === 'clusters' &&
                           pathSegments[1] === params.clusterId;
    
    if (isAtClusterRoot) {
      throw redirect({
        to: "/clusters/$clusterId/dashboard",
        params: { clusterId: params.clusterId }
      });
    }
  },
});
