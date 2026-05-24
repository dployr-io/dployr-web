// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useClusterId } from "./use-cluster-id";
import { useClusters } from "./use-clusters";

export function useClusterName(clusterId?: string | undefined) {
  const _clusterId = useClusterId();
  const { clusters } = useClusters();

  function getClusterName(
    clusters: {
      id: string;
      name: string;
      owner: string;
    }[]
  ) {
    let name = "";
    const c = clusterId ?? _clusterId;
    if (!c || !clusters) return;
    clusters.forEach(cluster => {
      if (cluster.id === c) {
        name = cluster.name;
      }
    });
    return name;
  }

  const clusterName = getClusterName(clusters);
  return clusterName;
}
