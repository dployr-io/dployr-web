import { createApiInstance, getAuthToken } from "@/lib/auth";
import type { Deployment } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function useDeployments() {
    const { data: deployments, isLoading } = useQuery<Deployment[]>({
        queryKey: ["deployments"],
        queryFn: async () => {
            const token = getAuthToken();
            const api = createApiInstance(token);

            try {
                const response = await api?.get("/deployments");
                const data = response?.data;
                return Array.isArray(data) ? data : [];
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

    const pathSegments = window.location.pathname.split("/");
    const id = pathSegments[pathSegments.indexOf("deployments") + 1];

    const selectedDeployment = id
        ? deployments?.find((deployment) => deployment.id === id) || null
        : null;

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil((deployments?.length ?? 0) / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedDeployments = Array.isArray(deployments)
        ? deployments.slice(startIndex, endIndex)
        : [];

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const goToPreviousPage = () => {
        setCurrentPage((prev) => Math.max(1, prev - 1));
    };

    const goToNextPage = () => {
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    };

    return {
        selectedDeployment,
        deployments,
        paginatedDeployments,
        currentPage,
        totalPages,
        startIndex,
        endIndex,
        isLoading,

        goToPage,
        goToNextPage,
        goToPreviousPage,
    };
}
