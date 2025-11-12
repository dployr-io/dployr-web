import type { User, UserRole } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "./use-auth";
import { toast } from "@/lib/toast";

const LOCALSTORAGE_KEY = "dployr-cluster-id";


export function useClusters() {
    const { refetch, cluster } = useAuth();
    const queryClient = useQueryClient();

    // Get cluster ID from localStorage first, then fallback to session data
    const clusterId = (() => {
        const storedId = localStorage.getItem(LOCALSTORAGE_KEY);
        if (storedId) {
            return storedId;
        }
        return cluster?.id || "";
    })();

    function setCurrentCluster(clusterId: string) {
        if (clusterId) {
            localStorage.setItem(LOCALSTORAGE_KEY, clusterId);
            refetch();
        } else {
            localStorage.removeItem(LOCALSTORAGE_KEY);
        }
    }

    // load invites received
    const { data: invitesReceived, isLoading: isLoadingInvitesReceived } = useQuery<{ clusterId: string; clusterName: string; ownerName: string }[]>({
        queryKey: ["invites"],
        queryFn: async (): Promise<{ clusterId: string; clusterName: string; ownerName: string }[]> => {
            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_BASE_URL}/v1/clusters/users/invites`,
                    {
                        withCredentials: true,
                    },
                );
                const data = response?.data.data.items;

                return Array.isArray(data) ? data as { clusterId: string; clusterName: string; ownerName: string }[] : [];
            } catch (error) {
                console.error(
                    (error as Error).message ||
                        "An unknown error occoured while retrieving cluster invites",
                );
                return [];
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    // load invites sent
    const { data: invitesSent, isLoading: isLoadingInvitesSent } = useQuery<{ clusterId: string; clusterName: string; ownerName: string }[]>({
        queryKey: ["invites"],
        queryFn: async (): Promise<{ clusterId: string; clusterName: string; ownerName: string }[]> => {
            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_BASE_URL}/v1/clusters/users/invites?sent=true`,
                    {
                        withCredentials: true,
                    },
                );
                const data = response?.data.data.items;

                return Array.isArray(data) ? data as { clusterId: string; clusterName: string; ownerName: string }[] : [];
            } catch (error) {
                console.error(
                    (error as Error).message ||
                        "An unknown error occoured while retrieving cluster invites",
                );
                return [];
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    // accept invite

    // reject invite

    // load all users
    const { data: users, isLoading: isLoadingUsers } = useQuery<(User & { role: UserRole })[]>({
        queryKey: ["users", clusterId],
        queryFn: async (): Promise<(User & { role: UserRole })[]> => {
            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/users`,
                    {
                        withCredentials: true,
                    },
                );
                const data = response?.data.data.items;

                return Array.isArray(data) ? data as (User & { role: UserRole })[] : [];
            } catch (error) {
                console.error(
                    (error as Error).message ||
                        "An unknown error occoured while retrieving deployments",
                );
                return [];
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    // add user
    const { mutate: addUsers, isPending: isAddingUser } = useMutation({
        mutationFn: async (variables: { users: string[] }): Promise<void> => {
            await axios.post(
                `${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/users`,
                { email: variables.users },
                {
                    withCredentials: true,
                }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users", clusterId] });
        },
        onError: (error: any) => {
            const errorMessage =
                error?.response?.data?.message ||
                error?.message ||
                "An error occored while adding user.";
            toast.error(errorMessage);
        },
    });

    // remove user

    // transfer ownership

    return {
        users,
        isLoadingUsers,
        invitesReceived,
        invitesSent,
        isLoadingInvitesReceived,
        isLoadingInvitesSent,
        addUsers,
        isAddingUser,
        setCurrentCluster,
        clusterId,
    };
}
