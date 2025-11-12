import type { ReactNode } from 'react';
import { Navigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p>Loading...</p>
                </div>
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