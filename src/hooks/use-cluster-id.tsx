// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

export function useClusterId() {
  function getClusterIdFromPath() {
    const pathSegments = window.location.pathname.split("/");
    const clusterIndex = pathSegments.indexOf("clusters");
    return clusterIndex !== -1 && pathSegments[clusterIndex + 1]
        ? pathSegments[clusterIndex + 1]
        : undefined;
  }

  const clusterId = getClusterIdFromPath();

  return clusterId;
}