import { parseAsStringLiteral, parseAsInteger, parseAsBoolean, parseAsString, useQueryStates } from 'nuqs';

/**
 * URL state management for the users settings page
 */
export function useUsersUrlState() {
  return useQueryStates({
    tab: parseAsStringLiteral(['users', 'invites-received', 'invites-sent']).withDefault('users'),
    page: parseAsInteger.withDefault(1),
  });
}

/**
 * URL state management for users activity modal
 */
export function useUsersActivityModal() {
  return useQueryStates({
    open: parseAsBoolean.withDefault(false),
    userId: parseAsString.withDefault(''),
    search: parseAsString.withDefault(''),
    category: parseAsString.withDefault('all'),
    sortBy: parseAsStringLiteral(['timestamp', 'action', 'category']).withDefault('timestamp'),
    sortOrder: parseAsStringLiteral(['asc', 'desc']).withDefault('desc'),
  });
}

export function useInviteUserDialog() {
  return useQueryStates({
    inviteOpen: parseAsBoolean.withDefault(false),
  });
}