// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useRouterState } from "@tanstack/react-router";

export function useClusterContext() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const isInClusterContext = currentPath.includes("/clusters/");
  const pathParts = currentPath.split("/");
  const clusterId = isInClusterContext && pathParts.length > 2 ? pathParts[2] : null;

  return { clusterId }
}
