// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react';
import { Navigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import AppLogoIcon from '@/components/app-logo-icon';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <AppLogoIcon
                    className="size-16 fill-current text-muted-foreground"
                    style={{
                        animation: 'shimmerSpinZoom 4s cubic-bezier(0.6, 0, 0.2, 1) infinite'
                    }}
                />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Preserve error query param 
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const redirectPath = error ? `/?error=${encodeURIComponent(error)}` : '/';
        return <Navigate to={redirectPath} />;
    }

    return <>{children}</>;
}