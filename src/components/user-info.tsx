// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({ user, showEmail = false }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();
    const displayName = user.name || user.email || 'Unknown User';

    return (
        <>
            <div className="flex h-8 w-8 items-center justify-around rounded-full bg-muted-foreground">
                <Avatar className="h-6 w-6 overflow-hidden rounded-full">
                    <AvatarImage src={user.picture} alt={displayName} />
                    <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                        {getInitials(displayName)}
                    </AvatarFallback>
                </Avatar>
            </div>

            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                {showEmail && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
            </div>
        </>
    );
}
