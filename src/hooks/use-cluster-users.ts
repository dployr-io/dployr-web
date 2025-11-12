import { useUsersUrlState, useUsersActivityModal } from "@/lib/url-state";
import type { User, UserRole, UsersUrlState } from "@/types";
import { useState } from "react";
import { useClusters } from "@/hooks/use-clusters";
import { useClustersForm } from "@/hooks/use-clusters-form";
import { getRolePriority } from "@/lib/utils";
import { useUrlState } from "@/hooks/use-url-state";
import { use2FA } from "@/hooks/use-2fa";

export function useClusterUsers() {
    const { addUsersForm } = useClustersForm();
    const twoFactor = use2FA({ enabled: true });
    const { users, isLoadingUsers } = useClusters();
    const [{ tab, page }, setTabAndPage] = useUsersUrlState();
    const [
        {
            open: activityOpen,
            userId: activityUserId,
            search,
            category,
            sortBy,
            sortOrder,
        },
        setActivityModal,
    ] = useUsersActivityModal();

    const { useInviteUserDialog } = useUrlState();

    // Local state for non-URL state
    const [userToRemove, setUserToRemove] = useState<
        (User & { role: UserRole }) | null
    >(null);
    const [userToPromote, setUserToPromote] = useState<
        (User & { role: UserRole }) | null
    >(null);
    const [userToViewActivity, setUserToViewActivity] = useState<
        (User & { role: UserRole }) | null
    >(null);
    const [newRole, setNewRole] = useState<UserRole>("viewer");
    const { invitesReceived, invitesSent, isLoadingInvitesReceived, isLoadingInvitesSent } = useClusters();
    const [{ inviteOpen: inviteDialogOpen }, setInviteDialogOpen] =
        useInviteUserDialog();

    // Sort users by role priority (highest first)
    const sortedUsers = [...(users || [])].sort(
        (a, b) => getRolePriority(b.role) - getRolePriority(a.role),
    );

    const usersUrlState: UsersUrlState = {
        tab,
        page,
        activityModal: {
            open: activityOpen,
            userId: activityUserId || null,
            search,
            category,
            sortBy,
            sortOrder,
        },
    };

    const goToPage = (newPage: number) => {
        const calculatedPage = Math.max(
            1,
            Math.min(newPage, Math.ceil(sortedUsers.length / itemsPerPage)),
        );
        setTabAndPage({ page: calculatedPage });
    };

    const goToPreviousPage = () => {
        goToPage(page - 1);
    };

    const goToNextPage = () => {
        goToPage(page + 1);
    };

    // Pagination logic
    const itemsPerPage = 8;
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

    const handleAcceptInvite = (inviteId: string) => {
        twoFactor.requireAuth(() => {

        });
    };

    const handleDeclineInvite = (inviteId: string) => {

    };

    const handleRemoveClick = (user: User & { role: UserRole }) => {
        setUserToRemove(user);
    };

    const handleRemoveConfirm = () => {
        if (userToRemove) {
            const user = userToRemove;
            setUserToRemove(null);

            twoFactor.requireAuth(() => {
                alert(`Removed user ${user.id}!`);
            });
        }
    };

    const handlePromoteClick = (user: User & { role: UserRole }) => {
        setUserToPromote(user);
        setNewRole(user.role);
    };

    const handlePromoteConfirm = () => {
        if (userToPromote) {
            const user = userToPromote;
            const role = newRole;
            setUserToPromote(null);

            twoFactor.requireAuth(() => {
                alert(`Promoted user ${user.id} to ${role}!`);
            });
        }
    };

    const handleViewActivityClick = (user: User & { role: UserRole }) => {
        setUserToViewActivity(user);
        setActivityModal({
            open: true,
            userId: user.id,
        });
    };

    const handleActivityModalClose = (open: boolean) => {
        setActivityModal({ open });
        if (!open) {
            setUserToViewActivity(null);
        }
    };

    const handleInviteUsersDialogClose = (inviteOpen: boolean) => {
        setInviteDialogOpen({ inviteOpen });
    };

    const activityUser =
        activityOpen && activityUserId
            ? sortedUsers.find((u) => u.id === activityUserId)
            : null;

    if (activityOpen && activityUserId && !userToViewActivity && activityUser) {
        setUserToViewActivity(activityUser);
    }

    return {
        addUsersForm,
        twoFactor,
        users,
        isLoadingUsers,
        tab,
        page,
        activityOpen,
        activityUserId,
        search,
        category,
        sortBy,
        sortOrder,
        setTabAndPage,
        setActivityModal,
        userToRemove,
        setUserToRemove,
        userToPromote,
        setUserToPromote,
        userToViewActivity,
        setUserToViewActivity,
        newRole,
        setNewRole,
        invitesReceived,
        invitesSent,
        isLoadingInvitesReceived,
        isLoadingInvitesSent,
        inviteDialogOpen,
        setInviteDialogOpen,
        sortedUsers,
        usersUrlState,
        goToPage,
        goToPreviousPage,
        goToNextPage,
        itemsPerPage,
        totalPages,
        startIndex,
        endIndex,
        paginatedUsers,
        handleAcceptInvite,
        handleDeclineInvite,
        handleRemoveClick,
        handleRemoveConfirm,
        handlePromoteClick,
        handlePromoteConfirm,
        handleViewActivityClick,
        handleActivityModalClose,
        handleInviteUsersDialogClose,
        activityUser,
    };
}