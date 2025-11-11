import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import type { Cluster, SessionData, User } from "@/types";
import axios from "axios";

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
    updateProfile: (data: { name: string, picture: string }) => Promise<User | Error>;
    logout: () => void;
    refetch: () => void;
    verifyOTP: boolean;
    setVerifyOtp: (value: boolean) => void;
    otpValue: string;
    setOtpValue: (value: string) => void;
    isSubmitting: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [verifyOTP, setVerifyOtp] = useState(false);
    const [otpValue, setOtpValue] = useState("");
    const [email, setEmail] = useState("");

    const { data: sessionData, isLoading, refetch } = useQuery({
        queryKey: ['session'],
        queryFn: async () => {
            const res = await axios.get<SessionData>(
                `${import.meta.env.VITE_BASE_URL}/v1/auth/me`,
                {
                    withCredentials: true,
                }
            );

            return res.data;
        },
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const user = sessionData?.user ?? null;
    const cluster = sessionData?.cluster ?? null;

    const loginMutation = useMutation({
        mutationFn: async (credentials: { email: string }) => {
            const res = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/v1/auth/login/email`,
                { email: credentials.email },
                {
                    withCredentials: true,
                }
            );
            return res.data;
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
            const res = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/v1/auth/login/email/verify`,
                {
                    email: data.email,
                    code: data.code,
                },
                {
                    withCredentials: true,
                }
            );
            return res.data;
        },
        onSuccess: () => {
            setVerifyOtp(false);
            setOtpValue("");
            setEmail("");
            refetch();
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

    const updateProfileMutation = useMutation({
        mutationFn: async (data: { name: string, picture: string }) => {
            const res = await axios.patch(
                `${import.meta.env.VITE_BASE_URL}/v1/auth/me`,
                {
                    name: data.name,
                    picture: data.picture,
                },
                {
                    withCredentials: true,
                }
            );

            return res.data as User;
        },
        onSuccess: () => {
            refetch();
            toast.success("Profile updated successfully");
        },
        onError: (error: any) => {
            const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                "Failed to update profile";
            toast.error(errorMessage);
        },
    });

    const handleGoogleSignIn = async () => {
        window.location.href = `${import.meta.env.VITE_BASE_URL}/v1/auth/login/google`;
    };

    const handleMicrosoftSignIn = async () => {
        window.location.href = `${import.meta.env.VITE_BASE_URL}/v1/auth/login/microsoft`;
    };

    const handleGitHubSignIn = async () => {
        window.location.href = `${import.meta.env.VITE_BASE_URL}/v1/auth/login/github`;
    };

    const logout = async () => {
        try {
            await axios.get(
                `${import.meta.env.VITE_BASE_URL}/v1/auth/logout`,
                {
                    withCredentials: true,
                }
            );
        } catch (error) {
            console.error("Logout error:", error);
        }

        // Clear the session cookie
        document.cookie =
            "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

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
        updateProfile: updateProfileMutation.mutateAsync,
        logout,
        refetch,
        verifyOTP,
        setVerifyOtp,
        otpValue,
        setOtpValue,
        isSubmitting: loginMutation.isPending || otpMutation.isPending,
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
