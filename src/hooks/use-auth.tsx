import { createContext, useContext, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import type { ApiSuccessResponse, User } from "@/types";
import axios from "axios";
import { useUrlState } from "@/hooks/use-url-state";

interface AuthContextType {
  user: User | null;
  clusters: { id: string; name: string; owner: string }[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: { email: string }) => Promise<void>;
  verifyOtp: (data: { email: string; code: string }) => Promise<User>;
  handleGoogleSignIn: () => Promise<void>;
  handleMicrosoftSignIn: () => Promise<void>;
  handleGitHubSignIn: (redirectUrl: string) => void;
  updateProfile: (data: { name: string; picture: string }) => Promise<User | Error>;
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
  const { useAuthError, useAppNotification } = useUrlState();
  const [{ authError }, setError] = useAuthError();
  const [, setAppNotification] = useAppNotification();

  const {
    data: sessionData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        const res = await axios.get<ApiSuccessResponse>(`${import.meta.env.VITE_BASE_URL}/v1/users/me`, {
          withCredentials: true,
        });

        return res.data.data;
      } catch (error: any) {
        const errorMessage = error?.response?.data?.error || "Authentication failed";

        // don't set session errors in auth page
        if (window.location.pathname !== "/") {
          setError({
            authError: errorMessage,
          });
        }

        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // session data
  const user = (sessionData as any)?.user ?? null;
  const clusters: { id: string; name: string; owner: string }[] = (sessionData as any)?.clusters ?? null;

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
      throw error;
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
      setOtpValue("");
      throw error;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; picture: string }) => {
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
      throw error;
    },
  });

  const handleGoogleSignIn = async () => {
    window.location.href = `${import.meta.env.VITE_BASE_URL}/v1/auth/login/google`;
  };

  const handleMicrosoftSignIn = async () => {
    window.location.href = `${import.meta.env.VITE_BASE_URL}/v1/auth/login/microsoft`;
  };

  const handleGitHubSignIn = (redirectUrl: string) => {
    const encoded = encodeURIComponent(redirectUrl);

    window.location.href = `${import.meta.env.VITE_BASE_URL}/v1/auth/login/github?redirect_to=${encoded}`;
  };

  const logout = async () => {
    try {
      await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/auth/logout`, {
        withCredentials: true,
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || "Error occored while trying to sign out";

      console.error("Logout error:", errorMessage);
    }

    // Clear the session cookie
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    window.location.href = "/";
  };

  const value: AuthContextType = {
    user,
    clusters: clusters,
    isLoading: isLoading || loginMutation.isPending || otpMutation.isPending,
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
