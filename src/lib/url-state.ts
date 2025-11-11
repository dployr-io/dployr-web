import {
  useQueryState,
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsBoolean,
  parseAsArrayOf,
  parseAsStringLiteral,
  parseAsTimestamp,
  type inferParserType,
} from 'nuqs'



export function useUsersUrlState() {
  return useQueryStates({
    tab: parseAsStringLiteral(['users', 'invites']).withDefault('users'),
    page: parseAsInteger.withDefault(1),
  });
}

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

export async function copyCurrentUrl(): Promise<void> {
  const currentUrl = window.location.href;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(currentUrl);
    } else {
      throw "clipboard is unavailable in this browser";
    }
  } catch (err) {
    console.error("Failed to copy URL: ", err);
  }
}

export { useQueryState, useQueryStates } from 'nuqs';

// Export types for backward compatibility
export type { inferParserType };