import {
    parseAsStringLiteral,
    parseAsInteger,
    parseAsBoolean,
    parseAsString,
    useQueryStates,
} from "nuqs";

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
            error: parseAsString.withDefault("")
        });
    };

    return {
        useUsersUrlState,
        useUsersActivityModal,
        useInviteUserDialog,
        useAuthError,
    };
}
