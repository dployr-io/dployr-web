// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import {
    parseAsStringLiteral,
    parseAsInteger,
    parseAsBoolean,
    parseAsString,
    useQueryStates,
} from "nuqs";

export function useUrlState() {
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

    function useEventsUrlState() {
        return useQueryStates({
            type: parseAsString.withDefault("ALL"),
            search: parseAsString.withDefault(""),
            sort: parseAsStringLiteral(["newest", "oldest"]).withDefault("newest"),
            window: parseAsStringLiteral(["all", "24h", "7d", "30d"]).withDefault("all"),
            page: parseAsInteger.withDefault(1),
        });
    }

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
            sortOrder: parseAsStringLiteral(["asc", "desc"]).withDefault("desc"),
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
                "live", "5m", "15m", "30m", "1h", "3h", "6h", "12h", "24h",
            ]).withDefault("live"),
            logLevel: parseAsStringLiteral([
                "ALL", "DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY",
            ]).withDefault("ALL"),
            duration: parseAsStringLiteral([
                "live", "5m", "15m", "30m", "1h", "3h", "6h", "12h", "24h",
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

    function useDeploymentsUrlState() {
        return useQueryStates({
            instance: parseAsString.withDefault("all"),
            new: parseAsBoolean.withDefault(false),
            page: parseAsInteger.withDefault(1),
        });
    }

    function useServicesUrlState() {
        return useQueryStates({
            page: parseAsInteger.withDefault(1),
            deploy: parseAsBoolean.withDefault(false),
        });
    }

    function useDeploymentTabsState() {
        return useQueryStates({
            tab: parseAsStringLiteral(["logs", "blueprint"]).withDefault("logs"),
            logRange: parseAsStringLiteral([
                "live", "5m", "15m", "30m", "1h", "3h", "6h", "12h", "24h",
            ]).withDefault("live"),
            logLevel: parseAsStringLiteral([
                "ALL", "DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY",
            ]).withDefault("ALL"),
            duration: parseAsStringLiteral([
                "live", "5m", "15m", "30m", "1h", "3h", "6h", "12h", "24h",
            ]).withDefault("live"),
        });
    }

    function useServiceTabsState() {
        return useQueryStates({
            tab: parseAsStringLiteral(["overview", "env"]).withDefault("overview"),
            logRange: parseAsStringLiteral([
                "live", "5m", "15m", "30m", "1h", "3h", "6h", "12h", "24h",
            ]).withDefault("live"),
            logLevel: parseAsStringLiteral([
                "ALL", "DEBUG", "INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL", "ALERT", "EMERGENCY",
            ]).withDefault("ALL"),
        });
    }

    function useConsoleUrlState() {
        return useQueryStates({
            fullscreen: parseAsBoolean.withDefault(false),
        });
    }

    function useAuthError() {
        return useQueryStates({
            authError: parseAsString.withDefault(""),
        });
    }

    function useBillingUrlState() {
        return useQueryStates({
            compare: parseAsBoolean.withDefault(false),
        });
    }

    return {
        useUsersUrlState,
        useUsersActivityModal,
        useInviteUserDialog,
        useInstancesDialog,
        useInstanceTabsState,
        useDeploymentsTabsState,
        useDeploymentsUrlState,
        useDeploymentTabsState,
        useServiceTabsState,
        useServicesUrlState,
        useConsoleUrlState,
        useAuthError,
        useEventsUrlState,
        useBillingUrlState,
    };
}
