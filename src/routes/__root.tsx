import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
}

function RootComponent() {
  return (
    <>
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
    </>
  )
}

export const Route = createRootRoute({
  context: ({ queryClient }: { queryClient: QueryClient }): RouterContext => ({
    queryClient,
  }),
  component: RootComponent,
})