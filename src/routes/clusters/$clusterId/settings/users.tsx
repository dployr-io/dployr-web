// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem, UserRole, User } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProtectedRoute } from "@/components/protected-route";
import { useInitials } from "@/hooks/use-initials";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Trash2, ChevronLeft, ChevronRight, Check, X, UserPlus2, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tooltip } from "@radix-ui/react-tooltip";
import { ActivityModal } from "@/components/activity-modal";
import InviteUsersDialog from "@/components/invite-users-dialog";
import { useClusterUsers } from "@/hooks/use-cluster-users";
import { useClustersForm } from "@/hooks/use-clusters-form";
import { useUrlState } from "@/hooks/use-url-state";
import { useConfirmation } from "@/hooks/use-confirmation";

export const Route = createFileRoute("/clusters/$clusterId/settings/users")({
  component: Profile,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Configuration",
    href: "/settings/users",
  },
];

function Profile() {
  const getInitials = useInitials();

  const { useAppError, useAppNotification } = useUrlState();
  const [{ appError }, setError] = useAppError();
  const [, setAppNotification] = useAppNotification();
  const confirmation = useConfirmation();
  const { setPendingAction } = confirmation;

  const {
    twoFactor,
    tab,
    page,
    setTabAndPage,
    userToPromote,
    setUserToPromote,
    userToViewActivity,
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
    totalPages,
    startIndex,
    endIndex,
    paginatedUsers,
    handleAcceptInvite,
    handleDeclineInvite,
    handleRemoveConfirm,
    handlePromoteClick,
    handlePromoteConfirm,
    handleActivityModalClose,
    handleInviteUsersDialogClose,
    isLoadingUsers,
  } = useClusterUsers(setPendingAction);

  const { form } = useClustersForm(twoFactor);

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <SettingsLayout twoFactor={twoFactor} confirmation={confirmation}>
          <div className="space-y-4">
            <Tabs
              value={tab}
              onValueChange={value =>
                setTabAndPage({
                  tab: value as "users" | "invites-received" | "invites-sent",
                })
              }
              className="w-full"
            >
              <div className="flex w-full justify-between align-middle">
                <TabsList className="grid grid-cols-3 w-[400px]">
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="invites-received">Invites Received</TabsTrigger>
                  <TabsTrigger value="invites-sent">Invites Sent</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() =>
                      setInviteDialogOpen({
                        inviteOpen: true,
                      })
                    }
                  >
                    <UserPlus2 />
                    <p>Invite users</p>
                  </Button>
                </div>
              </div>

              <TabsContent value="users" className="space-y-4">
                <Table className="overflow-hidden rounded-t-lg">
                  <TableHeader className="gap-2 rounded-t-xl bg-neutral-50 p-2 dark:bg-neutral-900">
                    <TableRow>
                      <TableHead className="w-20">Picture</TableHead>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[100px]">Role</TableHead>
                      <TableHead className="w-[200px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingUsers
                      ? Array.from({ length: 3 }).map((_, idx) => (
                          <TableRow key={`skeleton-${idx}`} className="h-16">
                            <TableCell className="h-16 max-w-20 overflow-hidden align-middle font-medium">
                              <Skeleton className="h-8 w-8 rounded-full" />
                            </TableCell>
                            <TableCell className="h-16 max-w-[200px] overflow-hidden align-middle font-medium">
                              <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell className="h-16 align-middle">
                              <Skeleton className="h-4 w-40" />
                            </TableCell>
                            <TableCell className="h-16 max-w-[100px] align-middle">
                              <Skeleton className="h-6 w-16 rounded-full" />
                            </TableCell>
                            <TableCell className="h-16 w-[200px] overflow-hidden text-right align-middle">
                              <div className="flex justify-end gap-2">
                                <Skeleton className="h-8 w-8 rounded" />
                                <Skeleton className="h-8 w-8 rounded" />
                                <Skeleton className="h-8 w-8 rounded" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      : paginatedUsers.map(user => {
                          const displayName = user.name || "-";

                          return (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex h-8 w-8 items-center justify-around rounded-full bg-muted-foreground">
                                  <Avatar className="h-6 w-6 overflow-hidden rounded-full">
                                    <AvatarImage src={user.picture} alt={displayName} />
                                    <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">{getInitials(displayName)}</AvatarFallback>
                                  </Avatar>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{displayName}</TableCell>
                              <TableCell>
                                <span className="text-sm">{user.email}</span>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold backdrop-blur-md border shadow-sm ${(() => {
                                    switch (user.role) {
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
                                  {user.role[0].toUpperCase() + user.role.slice(1)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {user.role !== "owner" && (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="outline" onClick={() => handlePromoteClick(user)} className="h-8 w-8 cursor-pointer" aria-label="Promote User">
                                            <Crown className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Promote User</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="icon"
                                            variant="destructive"
                                            onClick={() => handleRemoveConfirm(user)}
                                            className="h-8 w-8 hover:bg-red-500 cursor-pointer"
                                            aria-label="Remove User"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Remove User</TooltipContent>
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
                    <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={page === 1} className="flex items-center gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" onClick={() => goToPage(pageNum)} className="h-8 w-8 p-0">
                          {pageNum}
                        </Button>
                      ))}
                    </div>

                    <Button variant="outline" size="sm" onClick={goToNextPage} disabled={page === totalPages} className="flex items-center gap-1">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="invites-received" className="space-y-4">
                <Table className="overflow-hidden rounded-t-lg">
                  <TableHeader className="gap-2 rounded-t-xl bg-neutral-50 p-2 dark:bg-neutral-900">
                    <TableRow>
                      <TableHead className="w-[200px]">Cluster</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead className="w-[200px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingInvitesReceived ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <TableRow key={`skeleton-${idx}`} className="h-16">
                          <TableCell className="h-16 max-w-[200px] overflow-hidden align-middle font-medium">
                            <Skeleton className="h-4 w-48" />
                          </TableCell>
                          <TableCell className="h-16 align-middle">
                            <Skeleton className="h-4 w-40" />
                          </TableCell>
                          <TableCell className="h-16 w-[200px] overflow-hidden text-right align-middle">
                            <div className="flex justify-end gap-2">
                              <Skeleton className="h-8 w-16 rounded" />
                              <Skeleton className="h-8 w-16 rounded" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : invitesReceived && invitesReceived.length > 0 ? (
                      invitesReceived.map(invitations => (
                        <TableRow key={invitations.clusterId}>
                          <TableCell className="font-medium">{invitations.clusterName}</TableCell>
                          <TableCell>
                            <span className="text-sm">{invitations.ownerName}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleAcceptInvite(invitations.clusterId)} className="h-8 px-3 cursor-pointer" aria-label="Accept invite">
                                <Check className="h-4 w-4" />
                                Accept
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeclineInvite(invitations.clusterId)}
                                className="h-8 px-3 hover:bg-red-500 cursor-pointer"
                                aria-label="Decline invite"
                              >
                                <X className="h-4 w-4" />
                                Decline
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Your received invites will show up here
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="invites-sent" className="space-y-4">
                <Table className="overflow-hidden rounded-t-lg">
                  <TableHeader className="gap-2 rounded-t-xl bg-neutral-50 p-2 dark:bg-neutral-900">
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead className="w-[150px]">Invited On</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[200px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingInvitesSent ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <TableRow key={`skeleton-${idx}`} className="h-16">
                          <TableCell className="h-16 max-w-[200px] overflow-hidden align-middle font-medium">
                            <Skeleton className="h-4 w-48" />
                          </TableCell>
                          <TableCell className="h-16 align-middle">
                            <Skeleton className="h-4 w-40" />
                          </TableCell>
                          <TableCell className="h-16 max-w-[150px] align-middle">
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell className="h-16 max-w-[120px] align-middle">
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </TableCell>
                          <TableCell className="h-16 w-[200px] overflow-hidden text-right align-middle">
                            <div className="flex justify-end gap-2">
                              <Skeleton className="h-8 w-16 rounded" />
                              <Skeleton className="h-8 w-16 rounded" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : invitesSent && invitesSent.length > 0 ? (
                      invitesSent.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <span className="text-sm">{user.email}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Recently"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold backdrop-blur-md border shadow-sm bg-yellow-950/30 text-yellow-950 border-yellow-800/50 dark:bg-yellow-900/35 dark:text-yellow-100 dark:border-yellow-700/60 shadow-yellow-950/20">
                              Pending
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAppNotification({
                                    appNotification: {
                                      message: `Reminder sent to ${user.email}!`,
                                      link: "",
                                    },
                                  });
                                }}
                                className="h-8 px-3 cursor-pointer"
                                aria-label="Send reminder"
                              >
                                <Activity className="h-4 w-4" />
                                Remind
                              </Button>

                              <Button size="sm" variant="destructive" onClick={() => handleRemoveConfirm(user)} className="h-8 px-3 hover:bg-red-500 cursor-pointer" aria-label="Cancel invite">
                                <X className="h-4 w-4" />
                                Withdraw
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Your sent invites will show up here
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>

          {/* Invite User Dialog */}
          <InviteUsersDialog open={inviteDialogOpen} onOpenChange={handleInviteUsersDialogClose} form={form} error={appError} />

          {/* Activity Modal */}
          <ActivityModal open={usersUrlState.activityModal.open} onOpenChange={handleActivityModalClose} user={userToViewActivity} />

          {/* Promote User Dialog */}
          <AlertDialog open={userToPromote !== null} onOpenChange={open => !open && setUserToPromote(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Promote User</AlertDialogTitle>
                <AlertDialogDescription>
                  Select a new role for <strong className="font-medium text-foreground">{userToPromote?.name || userToPromote?.email}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Select value={newRole} onValueChange={value => setNewRole(value as UserRole)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handlePromoteConfirm}>Promote</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SettingsLayout>
      </AppLayout>
    </ProtectedRoute>
  );
}
