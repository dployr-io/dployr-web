import {
    parseAsStringLiteral,
    parseAsInteger,
    parseAsBoolean,
    parseAsString,
    useQueryStates,
    parseAsJson,
} from "nuqs";
import z from "zod";

const appErrorSchema = z.object({
    message: z.string(),
    helpLink: z.url(),
});

const appNotificationSchema = z.object({
    message: z.string(),
    link: z.url(),
});

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
        return useQueryStates({
            appError: parseAsJson(appErrorSchema.parse).withDefault({
                message: "",
                helpLink: "",
            }),
        });
    }

     function useAppNotification() {
        return useQueryStates({
            appNotification: parseAsJson(appNotificationSchema.parse).withDefault({
                message: "",
                link: "",
            }),
        });
    }

    return {
        useUsersUrlState,
        useUsersActivityModal,
        useInviteUserDialog,
        useAuthError,
        useAppError,
        useAppNotification,
    };
}
