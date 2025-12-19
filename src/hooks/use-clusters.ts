// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import type { Integrations, User, UserRole } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "./use-auth";
import { useUrlState } from "@/hooks/use-url-state";
import { useState } from "react";
import { useClusterId } from "./use-cluster-id";

export function useClusters() {
  const { clusters } = useAuth();
  const queryClient = useQueryClient();
  const { useAppError } = useUrlState();
  const [, setError] = useAppError();
  const [usersToAdd, setUsersToAdd] = useState<string[]>([]);

  const clusterId = useClusterId() || "";

  const userCluster = clusters?.find(cluster => cluster.id === clusterId);
  
  // load invites received
  const { data: invitesReceived, isLoading: isLoadingInvitesReceived } = useQuery<
    {
      clusterId: string;
      clusterName: string;
      ownerName: string;
    }[]
  >({
    queryKey: ["invites-received"],
    queryFn: async (): Promise<
      {
        clusterId: string;
        clusterName: string;
        ownerName: string;
      }[]
    > => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/clusters/users/invites`, {
          withCredentials: true,
        });
        const data = response?.data.data.invites;

        return Array.isArray(data)
          ? (data as {
              clusterId: string;
              clusterName: string;
              ownerName: string;
            }[])
          : [];
      } catch (error) {
        console.error((error as Error).message || "An unknown error occoured while retrieving cluster invites");
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // load invites sent
  const { data: invitesSent, isLoading: isLoadingInvitesSent } = useQuery<User[]>({
    queryKey: ["invites", clusterId],
    queryFn: async (): Promise<User[]> => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/users?showInvites=true`, {
          withCredentials: true,
        });
        const data = response?.data.data.items;

        return Array.isArray(data) ? (data as User[]) : [];
      } catch (error) {
        console.error((error as Error).message || "An unknown error occoured while retrieving cluster invites");
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // accept invite
  async function acceptInvite(id: string) {
    try {
      await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/clusters/${id}/users/invites/accept`, {
        withCredentials: true,
      });
      queryClient.invalidateQueries({ queryKey: ["invites-received"] });
    } catch (error: any) {
      const errorData = error?.response?.data?.error;
      const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || error?.message || "An error occored while adding user.";
      const helpLink = error?.response?.data?.error.helpLink;
      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    }
  }

  // reject invite
  async function declineInvite(id: string) {
    try {
      await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/clusters/${id}/users/invites/reject`, {
        withCredentials: true,
      });
      queryClient.invalidateQueries({ queryKey: ["invites-received"] });
    } catch (error: any) {
      const errorData = error?.response?.data?.error;
      const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || error?.message || "An error occored while adding user.";
      const helpLink = error?.response?.data?.error.helpLink;
      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    }
  }

  // load all users
  const { data: users, isLoading: isLoadingUsers } = useQuery<(User & { role: UserRole })[]>({
    queryKey: ["users", clusterId],
    queryFn: async (): Promise<(User & { role: UserRole })[]> => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/users`, {
          withCredentials: true,
        });
        const data = response?.data.data.items;

        return Array.isArray(data) ? (data as (User & { role: UserRole })[]) : [];
      } catch (error) {
        console.error((error as Error).message || "An unknown error occoured while retrieving deployments");
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // add user
  const addUsers = useMutation({
    mutationFn: async (users: string[]): Promise<void> => {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/users`,
        { users },
        {
          withCredentials: true,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", clusterId] });
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || error?.message || "An error occored while adding user.";

      const helpLink = error?.response?.data?.error.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  // cancel invites
  const removeInvites = useMutation({
    mutationFn: async (users: string[]): Promise<void> => {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/users/remove`,
        { users },
        {
          withCredentials: true,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", clusterId] });
      queryClient.invalidateQueries({ queryKey: ["invites-received"] });
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || error?.message || "An error occored while adding user.";

      const helpLink = error?.response?.data?.error.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  // remove user
  const removeUsers = useMutation({
    mutationFn: async (users: string[]): Promise<void> => {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/users`,
        { users },
        {
          withCredentials: true,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", clusterId] });
    },
    onError: (error: any) => {
      const errorData = error?.response?.data?.error;
      const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || error?.message || "An error occored while adding user.";

      const helpLink = error?.response?.data?.error.helpLink;

      setError({
        appError: {
          message: errorMessage,
          helpLink,
        },
      });
    },
  });

  // transfer ownership

  // integrations
  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery<Integrations>({
    queryKey: ["integrations", clusterId],
    queryFn: async (): Promise<Integrations> => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/v1/clusters/${clusterId}/integrations`, {
          withCredentials: true,
        });
        const data = response?.data.data;

        return data;
      } catch (error: any) {
        const errorData = error?.response?.data?.error;
        const errorMessage = typeof errorData === "string" ? errorData : errorData?.message || error?.message || "An error occored while loading integrations.";
        const helpLink = error?.response?.data?.error.helpLink;

        setError({
          appError: {
            message: errorMessage,
            helpLink,
          },
        });
        return {} as Integrations;
      }
    },
    staleTime: 5 * 60 * 1000, // 5m
  });

  return {
    users,
    clusters,
    integrations,
    usersToAdd,
    isLoadingUsers,
    invitesReceived,
    invitesSent,
    isLoadingIntegrations,
    isLoadingInvitesReceived,
    isLoadingInvitesSent,
    addUsers,
    acceptInvite,
    declineInvite,
    setUsersToAdd,
    removeInvites,
    removeUsers,
    clusterId,
    userCluster,
  };
}
