// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { SidebarProvider } from '@/components/ui/sidebar';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    // const isOpen: SharedData = {
    //     sidebarOpen: true
    // };

    if (variant === 'header') {
        return <div className="flex min-h-screen w-full flex-col">{children}</div>;
    }

    return <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>;
}
