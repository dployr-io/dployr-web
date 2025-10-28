
import type { AuthRequest, AuthResponse, OtpVerifyRequest, User } from "@/types";
import axios from "axios";
import { toast } from "./toast";

function getInstanceUrl(): string | null {
    return localStorage.getItem("instance_url");
}

export function setInstanceUrl(url: string): void {
    localStorage.setItem("instance_url", url);
}

function createApiInstance() {
    const instanceUrl = getInstanceUrl();
    if (!instanceUrl) {
        toast.error("Please sign in first.");
        return;
    }

    return axios.create({
        baseURL: instanceUrl,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

export async function requestAuth(data: AuthRequest): Promise<void> {
    setInstanceUrl(data.instance);

    const api = createApiInstance();
    await api?.post("/auth/request", {
        email: data.email,
        expiry: data.expiry,
    });
}

export async function verifyOtp(data: OtpVerifyRequest): Promise<AuthResponse> {
    const api = createApiInstance();
    const response = await api?.post("/auth/verify", data);
    return response?.data;
}

export async function verifyAuth(): Promise<User> {
    const api = createApiInstance();
    const response = await api?.get("/auth/verify");
    const userData = response?.data;
    return {
        id: userData.user, 
        name: userData.user.split("@")[0], 
        role: 'admin',
        email: userData.user,
    };
}

export function getAuthToken(): string | null {
    return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string): void {
    localStorage.setItem("auth_token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export function removeAuthToken(): void {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("instance_url");
    delete axios.defaults.headers.common["Authorization"];
}

export function initializeAuth(): void {
    const token = getAuthToken();
    if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
}
