import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy } from "lucide-react";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem, User, UserRole, UsersUrlState } from "@/types";
import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ProtectedRoute } from "@/components/protected-route";
import { useInitials } from "@/hooks/use-initials";
import { use2FA } from "@/hooks/use-2fa";
import {
    Crown,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    UserPlus2,
    Activity,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TwoFactorDialog } from "@/components/two-factor-dialog";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tooltip } from "@radix-ui/react-tooltip";
import { ActivityModal } from "@/components/activity-modal";
import { useClusters } from "@/hooks/use-clusters";
import {
    useUsersUrlState,
    useUsersActivityModal,
    copyCurrentUrl,
} from "@/lib/url-state";

export const Route = createFileRoute("/settings/users")({
    component: Profile,
});

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Configuration",
        href: "/settings/users",
    },
];


// Dummy invite data
interface Invite {
    id: string;
    clusterName: string;
    ownerEmail: string;
}

const DUMMY_INVITES: Invite[] = [
    {
        id: "invite-001",
        clusterName: "Production Cluster",
        ownerEmail: "alice.johnson@example.com",
    },
    {
        id: "invite-002",
        clusterName: "Development Cluster",
        ownerEmail: "bob.smith@example.com",
    },
    {
        id: "invite-003",
        clusterName: "Staging Cluster",
        ownerEmail: "carol.white@example.com",
    },
];

// Role priority: higher number = higher privilege
const getRolePriority = (role: UserRole): number => {
    switch (role) {
        case "owner":
            return 4;
        case "admin":
            return 3;
        case "developer":
            return 2;
        case "viewer":
            return 1;
        default:
            return 0;
    }
};

function Profile() {
    const getInitials = useInitials();
    const twoFactor = use2FA({ enabled: true });
    const { users } = useClusters();

    // URL state management using nuqs
    const [{ tab, page }, setTabAndPage] = useUsersUrlState();
    const [{ open: activityOpen, userId: activityUserId, search, category, sortBy, sortOrder }, setActivityModal] = useUsersActivityModal();
    
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
    const [invites, setInvites] = useState<Invite[]>(DUMMY_INVITES);

    // Sort users by role priority (highest first)
    const sortedUsers = [...(users || [])].sort(
        (a, b) => getRolePriority(b.role) - getRolePriority(a.role),
    );

    const urlState: UsersUrlState = {
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
        const calculatedPage = Math.max(1, Math.min(newPage, Math.ceil(sortedUsers.length / itemsPerPage)));
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
            setInvites(invites.filter((invite) => invite.id !== inviteId));
            alert(`Accepted invite ${inviteId}!`);
        });
    };

    const handleDeclineInvite = (inviteId: string) => {
        setInvites(invites.filter((invite) => invite.id !== inviteId));
        alert(`Declined invite ${inviteId}!`);
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

    const activityUser = activityOpen && activityUserId ?
        sortedUsers.find(u => u.id === activityUserId) :
        null;

    if (activityOpen && activityUserId && !userToViewActivity && activityUser) {
        setUserToViewActivity(activityUser);
    }

    return (
        <ProtectedRoute>
            <AppLayout breadcrumbs={breadcrumbs}>
                <SettingsLayout>
                    <div className="space-y-4">
                        <Tabs
                            value={tab}
                            onValueChange={(value) => setTabAndPage({ tab: value as "users" | "invites" })}
                            className="w-full"
                        >
                            <div className="flex w-full justify-between align-middle">
                                <TabsList>
                                    <TabsTrigger value="users">
                                        Users
                                    </TabsTrigger>
                                    <TabsTrigger value="invites">
                                        Invites
                                    </TabsTrigger>
                                </TabsList>
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => {}}>
                                        <UserPlus2 />
                                        <p>Invite users</p>
                                    </Button>
                                </div>
                            </div>

                            <TabsContent value="users" className="space-y-4">
                                <Table className="overflow-hidden rounded-t-lg">
                                    <TableHeader className="gap-2 rounded-t-xl bg-neutral-50 p-2 dark:bg-neutral-900">
                                        <TableRow>
                                            <TableHead className="w-20">
                                                Picture
                                            </TableHead>
                                            <TableHead className="w-[200px]">
                                                Name
                                            </TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="w-[100px]">
                                                Role
                                            </TableHead>
                                            <TableHead className="w-[200px] text-right">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedUsers.map((user) => {
                                            const displayName =
                                                user.name || "-";

                                            return (
                                                <TableRow key={user.id}>
                                                    <TableCell>
                                                        <div className="flex h-8 w-8 items-center justify-around rounded-full bg-muted-foreground">
                                                            <Avatar className="h-6 w-6 overflow-hidden rounded-full">
                                                                <AvatarImage
                                                                    src={
                                                                        user.picture
                                                                    }
                                                                    alt={
                                                                        displayName
                                                                    }
                                                                />
                                                                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                                                    {getInitials(
                                                                        displayName,
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {displayName}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">
                                                            {user.email}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold backdrop-blur-md border shadow-sm ${(() => {
                                                                switch (
                                                                    user.role
                                                                ) {
                                                                    case "owner":
                                                                        return "bg-blue-950/30 text-blue-950 border-blue-800/50 dark:bg-blue-900/35 dark:text-blue-100 dark:border-blue-700/60 shadow-blue-950/20";
                                                                    case "admin":
                                                                        return "bg-blue-700/25 text-blue-800 border-blue-600/40 dark:bg-blue-700/30 dark:text-blue-200 dark:border-blue-500/50 shadow-blue-700/15";
                                                                    case "developer":
                                                                        return "bg-blue-500/25 text-blue-600 border-blue-400/40 dark:bg-blue-500/30 dark:text-blue-200 dark:border-blue-400/50 shadow-blue-500/15";
                                                                    case "viewer":
                                                                        return "bg-blue-300/25 text-blue-500 border-blue-300/40 dark:bg-blue-400/30 dark:text-blue-200 dark:border-blue-300/50 shadow-blue-300/15";
                                                                    default:
                                                                        return "bg-blue-300/25 text-blue-500 border-blue-300/40 dark:bg-blue-400/30 dark:text-blue-200 dark:border-blue-300/50 shadow-blue-300/15";
                                                                }
                                                            })()}`}
                                                        >
                                                            {user.role[0].toUpperCase() +
                                                                user.role.slice(
                                                                    1,
                                                                )}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Button
                                                                        size="icon"
                                                                        variant="outline"
                                                                        onClick={() =>
                                                                            handleViewActivityClick(
                                                                                user,
                                                                            )
                                                                        }
                                                                        className="h-8 w-8 cursor-pointer"
                                                                        aria-label="View Activity"
                                                                    >
                                                                        <Activity className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    View Activity
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            {user.role !==
                                                                "owner" && (
                                                                <>
                                                                    <Tooltip>
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                size="icon"
                                                                                variant="outline"
                                                                                onClick={() =>
                                                                                    handlePromoteClick(
                                                                                        user,
                                                                                    )
                                                                                }
                                                                                className="h-8 w-8 cursor-pointer"
                                                                                aria-label="Promote User"
                                                                            >
                                                                                <Crown className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            Promote
                                                                            User
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                    <Tooltip>
                                                                        <TooltipTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                size="icon"
                                                                                variant="destructive"
                                                                                onClick={() =>
                                                                                    handleRemoveClick(
                                                                                        user,
                                                                                    )
                                                                                }
                                                                                className="h-8 w-8 hover:bg-red-500 cursor-pointer"
                                                                                aria-label="Remove User"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            Remove
                                                                            User
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>

                                <div className="flex items-center justify-between px-2 py-4">
                                    <div className="text-sm text-muted-foreground">
                                        {sortedUsers.length === 0
                                            ? "No users found"
                                            : sortedUsers.length === 1
                                              ? "Showing 1 of 1 user"
                                              : `Showing ${startIndex + 1} to ${Math.min(endIndex, sortedUsers.length)} of ${sortedUsers.length} users`}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={goToPreviousPage}
                                            disabled={page === 1}
                                            className="flex items-center gap-1"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>

                                        <div className="flex items-center space-x-1">
                                            {Array.from(
                                                { length: totalPages },
                                                (_, i) => i + 1,
                                            ).map((pageNum) => (
                                                <Button
                                                    key={pageNum}
                                                    variant={
                                                        page === pageNum
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    size="sm"
                                                    onClick={() =>
                                                        goToPage(pageNum)
                                                    }
                                                    className="h-8 w-8 p-0"
                                                >
                                                    {pageNum}
                                                </Button>
                                            ))}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={goToNextPage}
                                            disabled={
                                                page === totalPages
                                            }
                                            className="flex items-center gap-1"
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="invites" className="space-y-4">
                                <Table className="overflow-hidden rounded-t-lg">
                                    <TableHeader className="gap-2 rounded-t-xl bg-neutral-50 p-2 dark:bg-neutral-900">
                                        <TableRow>
                                            <TableHead className="w-[200px]">
                                                Cluster
                                            </TableHead>
                                            <TableHead>Owner</TableHead>
                                            <TableHead className="w-[200px] text-right">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invites.map((invite) => (
                                            <TableRow key={invite.id}>
                                                <TableCell className="font-medium">
                                                    {invite.clusterName}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-neutral-600">
                                                        {invite.ownerEmail}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleAcceptInvite(
                                                                    invite.id,
                                                                )
                                                            }
                                                            className="h-8 px-3 cursor-pointer"
                                                            aria-label="Accept invite"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                            Accept
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() =>
                                                                handleDeclineInvite(
                                                                    invite.id,
                                                                )
                                                            }
                                                            className="h-8 px-3 hover:bg-red-500 cursor-pointer"
                                                            aria-label="Decline invite"
                                                        >
                                                            <X className="h-4 w-4" />
                                                            Decline
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* 2FA Dialog */}
                    <TwoFactorDialog
                        open={twoFactor.isOpen}
                        onOpenChange={twoFactor.setIsOpen}
                        onVerify={twoFactor.verify}
                        isSubmitting={twoFactor.isVerifying}
                    />

                    {/* Activity Modal */}
                    <ActivityModal
                        open={urlState.activityModal.open}
                        onOpenChange={handleActivityModalClose}
                        user={userToViewActivity}
                    />

                    {/* Remove User Confirmation Dialog */}
                    <AlertDialog
                        open={userToRemove !== null}
                        onOpenChange={(open) => !open && setUserToRemove(null)}
                    >
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will remove user{" "}
                                    <strong>
                                        {userToRemove?.name ||
                                            userToRemove?.email}
                                    </strong>{" "}
                                    (ID: {userToRemove?.id}). This action cannot
                                    be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleRemoveConfirm}
                                >
                                    Remove
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Promote User Dialog */}
                    <AlertDialog
                        open={userToPromote !== null}
                        onOpenChange={(open) => !open && setUserToPromote(null)}
                    >
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Promote User
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    Select a new role for{" "}
                                    <strong>
                                        {userToPromote?.name ||
                                            userToPromote?.email}
                                    </strong>
                                    .
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                                <Select
                                    value={newRole}
                                    onValueChange={(value) =>
                                        setNewRole(value as UserRole)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="owner">
                                            Owner
                                        </SelectItem>
                                        <SelectItem value="admin">
                                            Admin
                                        </SelectItem>
                                        <SelectItem value="developer">
                                            Developer
                                        </SelectItem>
                                        <SelectItem value="viewer">
                                            Viewer
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handlePromoteConfirm}
                                >
                                    Promote
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </SettingsLayout>
            </AppLayout>
        </ProtectedRoute>
    );
}
