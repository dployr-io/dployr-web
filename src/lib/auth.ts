
import type { AuthRequest, AuthResponse, OtpVerifyRequest, User } from "@/types";
import axios from "axios";
import { toast } from "./toast";

function getInstanceUrl(): string | null {
    return localStorage.getItem("instance_url");
}

export function setInstanceUrl(url: string): void {
    localStorage.setItem("instance_url", url);
}

function createApiInstance(token?: string | unknown) {
    const instanceUrl = getInstanceUrl();
    if (!instanceUrl) {
        toast.error("Please sign in first.");
        return;
    }
    let headers: Record<string, string> = {
        "Content-Type": "application/json",
    }

    if (token != null) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return axios.create({
        baseURL: instanceUrl,
        headers: headers,
    });
}

export async function requestAuth(data: AuthRequest): Promise<AuthResponse> {
    setInstanceUrl(data.instance);

    const api = createApiInstance();
    const response = await api?.post("/auth/request", {
        email: data.email,
        expiry: data.expiry,
    });
    return response?.data;
}

export async function verifyOtp(data: OtpVerifyRequest): Promise<AuthResponse> {
    const api = createApiInstance();
    const response = await api?.post("/auth/verify", data);
    return response?.data;
}

export async function verifyAuth(): Promise<User> {
    const token = getAuthToken();
    const api = createApiInstance(token);
    const response = await api?.get("/auth/verify");
    const userData = response?.data;
    const userEmail = typeof userData.user === 'string' ? userData.user : '';
    const userName = userEmail ? userEmail.split("@")[0] : 'User';

    return {
        id: userEmail,
        name: userName,
        role: 'admin',
        email: userEmail,
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
