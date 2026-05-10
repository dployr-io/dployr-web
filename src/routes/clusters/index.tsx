// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/clusters/")({
  component: ClustersIndex,
});

function ClustersIndex() {
  const { clusters, user } = useAuth();

  const ownedCluster = clusters?.find(c => c.owner === user?.id) ?? clusters?.[0];

  if (ownedCluster) {
    return <Navigate to="/clusters/$clusterId/dashboard" params={{ clusterId: ownedCluster.id }} replace />;
  }

  return null;
}
