import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'

function RootComponent() {
  return (
    <NuqsAdapter>
      <Outlet />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </NuqsAdapter>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})