import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyAuth, removeAuthToken, requestAuth, setAuthToken } from "@/lib/auth";
import { toast } from "@/lib/toast";
import type { AuthRequest, AuthResponse, User } from "@/types";

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (data: AuthRequest) => Promise<AuthResponse>;
    logout: () => void;
    refetch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

    const {
        data: user,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ["auth", "verify"],
        queryFn: verifyAuth,
        enabled:
            !!localStorage.getItem("dployr_auth_token") &&
            !!localStorage.getItem("dployr_instance_url"),
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: requestAuth,
        onSuccess: (response: AuthResponse) => {
            setAuthToken(response.token);
            refetch();
            toast.success("Successfully logged in!");
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.message || error?.message || "Login failed. Please try again.";
            toast.error(errorMessage);
        },
    });

    const logout = () => {
        removeAuthToken();
        localStorage.removeItem("dployr_instance_url");
        queryClient.removeQueries({ queryKey: ["auth"] });
        window.location.href = "/";
    };

    const value: AuthContextType = {
        user: user || null,
        isLoading: isLoading,
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
