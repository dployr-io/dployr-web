import type { DeploymentStatus, ServiceStatus } from "@/types";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type StatusChipProps = { status: DeploymentStatus | ServiceStatus };

export function StatusChip({ status }: StatusChipProps) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${(() => {
                switch (status) {
                    case "completed":
                    case "running":
                        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
                    case "pending":
                        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
                    case "stopped":
                    case "failed":
                        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                    case "unknown":
                    case "in_progress":
                        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
                    default:
                        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
                }
            })()}`}
        >
            {(() => {
                switch (status) {
                    case "running":
                    case "completed":
                        return (
                            <CheckCircle2
                                width={12}
                                height={12}
                                className="mr-1"
                            />
                        );
                    case "pending":
                        return (
                            <Loader2
                                width={12}
                                height={12}
                                className="mr-1 animate-spin"
                            />
                        );
                    case "stopped":
                    case "failed":
                        return (
                            <XCircle width={12} height={12} className="mr-1" />
                        );
                    case "unknown":
                    case "in_progress":
                        return (
                            <Loader2
                                width={12}
                                height={12}
                                className="mr-1 animate-spin"
                            />
                        );
                    default:
                        return (
                            <Loader2
                                width={12}
                                height={12}
                                className="mr-1 animate-spin"
                            />
                        );
                }
            })()}
            {status?.charAt(0).toUpperCase() + status?.slice(1)}
        </span>
    );
}
