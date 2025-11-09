import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import type { Cluster, SessionData, User } from "@/types";

interface AuthContextType {
    user: User | null;
    clusters: Cluster[];
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (data: { email: string }) => Promise<void>;
    verifyOtp: (data: { email: string; code: string }) => Promise<User>;
    handleGoogleSignIn: () => Promise<void>;
    handleMicrosoftSignIn: () => Promise<void>;
    handleGitHubSignIn: () => Promise<void>;
    logout: () => void;
    refetch: () => void;
    verifyOTP: boolean;
    setVerifyOtp: (value: boolean) => void;
    otpValue: string;
    setOtpValue: (value: string) => void;
    isSubmitting: boolean;
    email: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [verifyOTP, setVerifyOtp] = useState(false);
    const [otpValue, setOtpValue] = useState("");
    const [email, setEmail] = useState("");
    const [user, setUser] = useState<User | null>(null);
    const [cluster, setClusters] = useState<Cluster | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/auth/me`,
                    {
                        credentials: "include",
                    },
                );

                if (res.ok) {
                    const data: SessionData = await res.json();
                    setUser(data.user);
                    setClusters(data.cluster);
                } else {
                    const error = await res.text();
                    toast.error(error);
                    setUser(null);
                }
            } catch (error) {
                toast.error((error as Error).message);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    const loginMutation = useMutation({
        mutationFn: async (credentials: { email: string }) => {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/api/auth/login/email`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: credentials.email }),
                    credentials: "include",
                },
            );

            if (!res.ok) throw new Error("Invalid login");
            return res.json();
        },
        onSuccess: (_, variables) => {
            setEmail(variables.email);
            setVerifyOtp(true);
        },
        onError: (error: any) => {
            const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                "Login failed. Please try again.";
            toast.error(errorMessage);
        },
    });

    const otpMutation = useMutation({
        mutationFn: async (data: { email: string; code: string }) => {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/api/auth/login/email/verify`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: data.email,
                        code: data.code,
                    }),
                    credentials: "include",
                },
            );

            if (!res.ok) throw new Error("Invalid OTP");
            return res.json();
        },
        onSuccess: () => {
            setVerifyOtp(false);
            setOtpValue("");
            setEmail("");
        },
        onError: (error: any) => {
            const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                "OTP verification failed. Please try again.";
            toast.error(errorMessage);
            setOtpValue("");
        },
    });

    const handleGoogleSignIn = async () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/login/google`;
    };

    const handleMicrosoftSignIn = async () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/login/microsoft`;
    };

    const handleGitHubSignIn = async () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/login/github`;
    };

    const logout = async () => {
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
        } catch (error) {
            console.error("Logout error:", error);
        }

        document.cookie =
            "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.dployr.dev;";

        setUser(null);
        window.location.href = "/";
    };

    const value: AuthContextType = {
        user,
        clusters: cluster ? [cluster] : [],
        isLoading:
            isLoading || loginMutation.isPending || otpMutation.isPending,
        isAuthenticated: !!user,
        login: loginMutation.mutateAsync,
        verifyOtp: otpMutation.mutateAsync,
        handleGoogleSignIn,
        handleMicrosoftSignIn,
        handleGitHubSignIn,
        logout,
        refetch: async () => {
            setIsLoading(true);
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/auth/me`,
                    {
                        credentials: "include",
                    },
                );
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                }
            } catch (error) {
                console.error("Refetch failed:", error);
            } finally {
                setIsLoading(false);
            }
        },
        verifyOTP,
        setVerifyOtp,
        otpValue,
        setOtpValue,
        isSubmitting: loginMutation.isPending || otpMutation.isPending,
        email,
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
