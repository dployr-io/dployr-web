// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Outlet, createRootRoute } from '@tanstack/react-router'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { TawkChat } from '@/components/tawk-chat'
import { AuthProvider } from '@/hooks/use-auth'

function RootComponent() {
  return (
    <NuqsAdapter>
      <AuthProvider>
        <Outlet />
        <TawkChat />
      </AuthProvider>
    </NuqsAdapter>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})