import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    verifyAuth,
    removeAuthToken,
    initializeAuth,
    requestAuth,
} from "@/lib/auth";
import type { AuthRequest, User } from "@/types";

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (data: AuthRequest) => Promise<void>;
    logout: () => void;
    refetch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const queryClient = useQueryClient();

    // Initialize auth on mount
    useEffect(() => {
        initializeAuth();
        setIsInitialized(true);
    }, []);

    const {
        data: user,
        isLoading,
        refetch,
        error,
    } = useQuery({
        queryKey: ["auth", "verify"],
        queryFn: verifyAuth,
        enabled:
            isInitialized &&
            !!localStorage.getItem("auth_token") &&
            !!localStorage.getItem("instance_url"),
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: requestAuth,
        onSuccess: () => refetch(),
    });

    const logout = () => {
        removeAuthToken();
        localStorage.removeItem("instance_url"); 
        queryClient.removeQueries({ queryKey: ["auth"] });
        window.location.href = "/";
    };

    const value: AuthContextType = {
        user: user || null,
        isLoading: isLoading || !isInitialized,
        isAuthenticated: !!user,
        login: loginMutation.mutateAsync,
        logout,
        refetch,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
