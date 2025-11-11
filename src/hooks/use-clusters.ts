import type { User, UserRole } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "./use-auth";
import z from "zod";
import { toast } from "@/lib/toast";

const LOCALSTORAGE_KEY = "dployr-cluster-id";

const addUsersSchema = z.object({
  users: z.array(z.email())
});


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

    // load invites

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
    const { mutate: addUser, isPending: isAddingUser } = useMutation({
        mutationFn: async (variables: { email: string }): Promise<void> => {
            await axios.post(
                `${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/users`,
                { email: variables.email },
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
        isLoading: isLoadingUsers,
        addUser,
        isAddingUser,
        setCurrentCluster,
        clusterId,
    };
}
