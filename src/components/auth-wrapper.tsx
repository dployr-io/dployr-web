import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
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
        return fallback || null;
    }

    return <>{children}</>;
}