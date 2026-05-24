// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { AppSidebar } from '@/components/app-sidebar';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { SidebarProvider } from '../ui/sidebar';

vi.mock('@/hooks/use-auth', () => ({
    useAuth: () => ({
        clusters: [{ id: 'cluster-1', name: 'Test Cluster', owner: 'user-1' }],
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    }),
}));

vi.mock('@/hooks/use-clusters', () => ({
    useClusters: () => ({
        clusterId: 'cluster-1',
        userCluster: { id: 'cluster-1', name: 'Test Cluster' },
        clusters: [{ id: 'cluster-1', name: 'Test Cluster' }],
    }),
}));

vi.mock('@/hooks/use-cluster-id', () => ({
    useClusterId: () => 'cluster-1',
}));

vi.mock('@/hooks/use-plan-features', () => ({
    usePlanFeatures: () => ({ hasConsole: true }),
}));

vi.mock('@tanstack/react-router', () => ({
    Link: ({ href, to, children }: any) => <a href={href ?? to}>{children}</a>,
    useRouter: () => ({}),
    useRouterState: () => ({ location: { pathname: '/' } }),
    useMatchRoute: () => () => false,
}));

vi.mock('@/components/nav-user', () => ({
    NavUser: () => <div data-testid="nav-user" />,
}));

vi.mock('@/components/app-logo', () => ({
    default: () => <div data-testid="app-logo" />,
}));

describe('AppSidebar', () => {
    test('renders main navigation links', () => {
        render(
            <SidebarProvider>
                <AppSidebar />
            </SidebarProvider>,
        );

        expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /services/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /console/i })).toBeInTheDocument();
    });

    test('renders secondary navigation links', () => {
        render(
            <SidebarProvider>
                <AppSidebar />
            </SidebarProvider>,
        );

        expect(screen.getByRole('link', { name: /instances/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /events/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    });
});
