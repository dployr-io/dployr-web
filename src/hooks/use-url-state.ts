// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import {
    parseAsStringLiteral,
    parseAsInteger,
    parseAsBoolean,
    parseAsString,
    useQueryStates,
    parseAsJson,
} from "nuqs";
import { useEffect } from "react";
import z from "zod";

const appErrorSchema = z.object({
    message: z.string(),
    helpLink: z.url().optional().or(z.literal("")),
});

const appNotificationSchema = z.object({
    message: z.string(),
    link: z.url().optional().or(z.literal("")),
});

// Helper function to safely parse JSON from URL
function tryParseJson(jsonString: string): any {
    try {
        return JSON.parse(jsonString);
    } catch {
        return null;
    }
}

/**
 * Hook to auto-initialize app error/notification from URL parameters
 * This ensures that backend redirects with ?appError or ?appNotification
 * are properly handled even when the state isn't initialized in the current component
 */
function useAutoInitializeAppState(
    setError: (values: { appError: any }) => void,
    setAppNotification: (values: { appNotification: any }) => void
) {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const urlParams = new URLSearchParams(window.location.search);
        const appErrorParam = urlParams.get("appError");
        const appNotificationParam = urlParams.get("appNotification");
        let urlUpdated = false;

        if (appErrorParam) {
            try {
                const parsedError = tryParseJson(appErrorParam);
                if (parsedError && parsedError.message) {
                    const validError = appErrorSchema.parse(parsedError);
                    setError({ appError: validError });
                    urlParams.delete("appError");
                    urlUpdated = true;
                }
            } catch (error) {
                console.warn("Invalid appError parameter:", error);
            }
        }

        if (appNotificationParam) {
            try {
                const parsedNotification = tryParseJson(appNotificationParam);
                if (parsedNotification && parsedNotification.message) {
                    const validNotification = appNotificationSchema.parse(parsedNotification);
                    setAppNotification({ appNotification: validNotification });
                    urlParams.delete("appNotification");
                    urlUpdated = true;
                }
            } catch (error) {
                console.warn("Invalid appNotification parameter:", error);
            }
        }

        if (urlUpdated) {
            const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
            window.history.replaceState({}, "", newUrl);
        }
    }, [setError, setAppNotification]);
}

export function useUrlState() {
    /**
     * URL state management for the users settings page
     */
    function useUsersUrlState() {
        return useQueryStates({
            tab: parseAsStringLiteral([
                "users",
                "invites-received",
                "invites-sent",
            ]).withDefault("users"),
            page: parseAsInteger.withDefault(1),
        });
    }

    /**
     * URL state management for cluster events page
     */
    function useEventsUrlState() {
        return useQueryStates({
            type: parseAsString.withDefault("ALL"),
            search: parseAsString.withDefault(""),
            sort: parseAsStringLiteral(["newest", "oldest"]).withDefault("newest"),
            window: parseAsStringLiteral(["all", "24h", "7d", "30d"]).withDefault("all"),
            page: parseAsInteger.withDefault(1),
        });
    }

    /**
     * URL state management for users activity modal
     */
    function useUsersActivityModal() {
        return useQueryStates({
            open: parseAsBoolean.withDefault(false),
            userId: parseAsString.withDefault(""),
            search: parseAsString.withDefault(""),
            category: parseAsString.withDefault("all"),
            sortBy: parseAsStringLiteral([
                "timestamp",
                "action",
                "category",
            ]).withDefault("timestamp"),
            sortOrder: parseAsStringLiteral(["asc", "desc"]).withDefault(
                "desc",
            ),
        });
    }
    function useInviteUserDialog() {
        return useQueryStates({
            inviteOpen: parseAsBoolean.withDefault(false),
        });
    }

    function useInstancesDialog() {
        return useQueryStates({
            new: parseAsBoolean.withDefault(false),
        });
    }

    function useInstanceTabsState() {
        return useQueryStates({
            tab: parseAsStringLiteral([
                "overview",
                "system",
                "files",
                "config",
                "logs",
                "advanced",
            ]).withDefault("overview"),
            logRange: parseAsStringLiteral([
                "live",
                "5m",
                "15m",
                "30m",
                "1h",
                "3h",
                "6h",
                "12h",
                "24h",
            ]).withDefault("live"),
            logLevel: parseAsStringLiteral([
                "ALL",
                "DEBUG",
                "INFO",
                "NOTICE",
                "WARNING",
                "ERROR",
                "CRITICAL",
                "ALERT",
                "EMERGENCY",
            ]).withDefault("ALL"),
            duration: parseAsStringLiteral([
                "live",
                "5m",
                "15m",
                "30m",
                "1h",
                "3h",
                "6h",
                "12h",
                "24h",
            ]).withDefault("live"),
        });
    }

    function useDeploymentsTabsState() {
        return useQueryStates({
            tab: parseAsStringLiteral([
                "quick",
                "blueprint-editor",
                "remote-blueprint",
            ]).withDefault("quick"),
        });
    }

    function useDeploymentTabsState() {
        return useQueryStates({
            tab: parseAsStringLiteral([
                "logs",
                "blueprint",
            ]).withDefault("logs"),
            logRange: parseAsStringLiteral([
                "live",
                "5m",
                "15m",
                "30m",
                "1h",
                "3h",
                "6h",
                "12h",
                "24h",
            ]).withDefault("live"),
            logLevel: parseAsStringLiteral([
                "ALL",
                "DEBUG",
                "INFO",
                "NOTICE",
                "WARNING",
                "ERROR",
                "CRITICAL",
                "ALERT",
                "EMERGENCY",
            ]).withDefault("ALL"),
            duration: parseAsStringLiteral([
                "live",
                "5m",
                "15m",
                "30m",
                "1h",
                "3h",
                "6h",
                "12h",
                "24h",
            ]).withDefault("live"),
        });
    }

    function useServiceTabsState() {
        return useQueryStates({
            tab: parseAsStringLiteral([
                "overview",
                "env",
            ]).withDefault("overview"),
            logRange: parseAsStringLiteral([
                "live",
                "5m",
                "15m",
                "30m",
                "1h",
                "3h",
                "6h",
                "12h",
                "24h",
            ]).withDefault("live"),
            logLevel: parseAsStringLiteral([
                "ALL",
                "DEBUG",
                "INFO",
                "NOTICE",
                "WARNING",
                "ERROR",
                "CRITICAL",
                "ALERT",
                "EMERGENCY",
            ]).withDefault("ALL"),
        });
    }

    /**
     * URL state management for auth errors
     * Error captured during oAuth redirects
     * are tracked in this state
     */
    function useAuthError() {
        return useQueryStates({
            authError: parseAsString.withDefault(""),
        });
    }

    function useAppError() {
        const queryStates = useQueryStates({
            appError: parseAsJson(appErrorSchema.parse).withDefault({
                message: "",
                helpLink: "",
            }),
        });

        // Auto-initialize from URL parameters if they exist
        const [{ appError }] = queryStates;
        const [, setError] = queryStates;

        useEffect(() => {
            if (typeof window === "undefined" || appError.message) return;

            const urlParams = new URLSearchParams(window.location.search);
            const appErrorParam = urlParams.get("appError");

            if (!appErrorParam) return;

            const parsedError = tryParseJson(appErrorParam);
            if (!parsedError || !parsedError.message) return;

            try {
                const validError = appErrorSchema.parse(parsedError);
                setError({ appError: validError });
                urlParams.delete("appError");
                const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
                window.history.replaceState({}, "", newUrl);
            } catch (error) {
                console.warn("Invalid appError parameter:", error);
            }
        }, []);

        return queryStates;
    }

    function useAppNotification() {
        const queryStates = useQueryStates({
            appNotification: parseAsJson(appNotificationSchema.parse).withDefault({
                message: "",
                link: "",
            }),
        });

        // Auto-initialize from URL parameters if they exist
        const [{ appNotification }] = queryStates;
        const [, setAppNotification] = queryStates;

        useEffect(() => {
            if (typeof window === "undefined" || appNotification.message) return;

            const urlParams = new URLSearchParams(window.location.search);
            const appNotificationParam = urlParams.get("appNotification");

            if (!appNotificationParam) return;

            const parsedNotification = tryParseJson(appNotificationParam);
            if (!parsedNotification || !parsedNotification.message) return;

            try {
                const validNotification = appNotificationSchema.parse(parsedNotification);
                setAppNotification({ appNotification: validNotification });
                urlParams.delete("appNotification");
                const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
                window.history.replaceState({}, "", newUrl);
            } catch (error) {
                console.warn("Invalid appNotification parameter:", error);
            }
        }, []); 

        return queryStates;
    }

    return {
        useUsersUrlState,
        useUsersActivityModal,
        useInviteUserDialog,
        useInstancesDialog,
        useInstanceTabsState,
        useDeploymentsTabsState,
        useDeploymentTabsState,
        useServiceTabsState,
        useAuthError,
        useAppError,
        useAppNotification,
        useAutoInitializeAppState,
        useEventsUrlState,
    };
}
