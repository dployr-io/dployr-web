// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import {
    ResizableModal,
    ResizableModalContent,
    ResizableModalDescription,
    ResizableModalHeader,
    ResizableModalTitle,
} from "@/components/ui/resizable-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useInitials } from "@/hooks/use-initials";
import {
    Calendar,
    Clock,
    User,
    Settings,
    Shield,
    Database,
    Key,
    Search,
    Filter,
    ArrowUpDown,
} from "lucide-react";
import type { User as UserType, UserRole } from "@/types";
import { useState, useMemo, useEffect } from "react";
import { useUrlState } from "@/hooks/use-url-state";

interface ActivityItem {
    id: string;
    timestamp: Date;
    action: string;
    description: string;
    category: "auth" | "permission" | "data" | "settings" | "security";
    metadata?: Record<string, any>;
}

interface UserWithRole extends UserType {
    role: UserRole;
}

interface ActivityModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserWithRole | null;
}

// Dummy activity data generator
const generateActivityData = (user: UserWithRole | null): ActivityItem[] => {
    if (!user) return [];

    const activities: ActivityItem[] = [
        {
            id: "1",
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            action: "User Login",
            description: `User logged in from IP address 192.168.1.100`,
            category: "auth",
            metadata: { ip: "192.168.1.100", device: "Chrome on Windows" },
        },
        {
            id: "2",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            action: "Profile Updated",
            description: `Updated profile information including display name and email preferences`,
            category: "settings",
            metadata: { fields: ["displayName", "emailPreferences"] },
        },
        {
            id: "3",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
            action: "Resource Access",
            description: `Accessed production cluster dashboard`,
            category: "data",
            metadata: { resource: "production-cluster", permission: "read" },
        },
        {
            id: "4",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            action: "Role Modified",
            description: `User role changed to ${user.role}`,
            category: "permission",
            metadata: { previousRole: "viewer", newRole: user.role },
        },
        {
            id: "5",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
            action: "API Key Usage",
            description: `Generated new API key for automation`,
            category: "security",
            metadata: { keyType: "automation", expiresIn: "90 days" },
        },
        {
            id: "6",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
            action: "Settings Modified",
            description: `Changed notification preferences`,
            category: "settings",
            metadata: { settings: ["email", "push", "slack"] },
        },
        {
            id: "7",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
            action: "Account Created",
            description: `User account was created and initial setup completed`,
            category: "auth",
            metadata: { invitedBy: "admin@dployr.dev" },
        },
    ];

    return activities;
};

const getCategoryIcon = (category: ActivityItem["category"]) => {
    switch (category) {
        case "auth":
            return User;
        case "permission":
            return Shield;
        case "data":
            return Database;
        case "settings":
            return Settings;
        case "security":
            return Key;
        default:
            return User;
    }
};

const getCategoryColor = (category: ActivityItem["category"]) => {
    switch (category) {
        case "auth":
            return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300";
        case "permission":
            return "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-300";
        case "data":
            return "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-300";
        case "settings":
            return "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-300";
        case "security":
            return "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300";
        default:
            return "bg-gray-500/10 text-gray-700 border-gray-500/20 dark:text-gray-300";
    }
};

export function ActivityModal({
    open,
    onOpenChange,
    user,
}: ActivityModalProps) {
    const getInitials = useInitials();
    const activities = generateActivityData(user);

    const { useUsersActivityModal } = useUrlState();
    const [{ search, category, sortBy, sortOrder }, setActivityModalState] =
        useUsersActivityModal();


    const [searchQuery, setSearchQuery] = useState(search);
    const [selectedCategory, setSelectedCategory] = useState(category);
    const [localSortBy, setLocalSortBy] = useState<
        "timestamp" | "action" | "category"
    >(sortBy);
    const [localSortOrder, setLocalSortOrder] = useState<"asc" | "desc">(
        sortOrder,
    );

    // Update URL
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery !== search) {
                setActivityModalState({ search: searchQuery });
            }
        }, 100); // Debounce search updates

        return () => clearTimeout(timeoutId);
    }, [searchQuery, search, setActivityModalState]);

    useEffect(() => {
        if (selectedCategory !== category) {
            setActivityModalState({ category: selectedCategory });
        }
    }, [selectedCategory, category, setActivityModalState]);

    useEffect(() => {
        if (localSortBy !== sortBy) {
            setActivityModalState({ sortBy: localSortBy });
        }
    }, [localSortBy, sortBy, setActivityModalState]);

    useEffect(() => {
        if (localSortOrder !== sortOrder) {
            setActivityModalState({ sortOrder: localSortOrder });
        }
    }, [localSortOrder, sortOrder, setActivityModalState]);

    // Sync local state with URL state when modal opens
    useEffect(() => {
        if (open) {
            setSearchQuery(search);
            setSelectedCategory(category);
            setLocalSortBy(sortBy);
            setLocalSortOrder(sortOrder);
        }
    }, [open, search, category, sortBy, sortOrder]);

    const formatTimestamp = (timestamp: Date) => {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else {
            return `${days}d ago`;
        }
    };

    // Filter and sort activities
    const filteredAndSortedActivities = useMemo(() => {
        let filtered = activities;

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(
                (activity) =>
                    activity.action
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    activity.description
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
            );
        }

        // Apply category filter
        if (selectedCategory !== "all") {
            filtered = filtered.filter(
                (activity) => activity.category === selectedCategory,
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (localSortBy) {
                case "timestamp":
                    comparison = a.timestamp.getTime() - b.timestamp.getTime();
                    break;
                case "action":
                    comparison = a.action.localeCompare(b.action);
                    break;
                case "category":
                    comparison = a.category.localeCompare(b.category);
                    break;
            }

            return localSortOrder === "asc" ? comparison : -comparison;
        });

        return filtered;
    }, [
        activities,
        searchQuery,
        selectedCategory,
        localSortBy,
        localSortOrder,
    ]);

    const clearFilters = () => {
        setSearchQuery("");
        setSelectedCategory("all");
        setLocalSortBy("timestamp");
        setLocalSortOrder("desc");
        setActivityModalState({
            search: "",
            category: "all",
            sortBy: "timestamp",
            sortOrder: "desc",
        });
    };

    const displayName = user?.name || user?.email || "Unknown User";

    return (
        <ResizableModal open={open} onOpenChange={onOpenChange}>
            <ResizableModalContent className="flex flex-col p-0 max-h-[85vh]">
                <ResizableModalHeader className="px-6 pt-6 pb-2 shrink-0">
                    <div className="flex items-center justify-between pr-20">
                        <ResizableModalTitle className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage
                                    src={user?.picture}
                                    alt={displayName}
                                />
                                <AvatarFallback>
                                    {getInitials(displayName)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="text-lg font-semibold">
                                    {displayName}
                                </div>
                                <div className="text-sm text-muted-foreground font-normal">
                                    {user?.email}
                                </div>
                            </div>
                        </ResizableModalTitle>
                    </div>
                    <ResizableModalDescription>
                        Recent activity and audit trail for this user
                    </ResizableModalDescription>
                </ResizableModalHeader>

                {/* Filter and Sort Controls */}
                <div className="shrink-0 space-y-3 px-6 pb-4 border-b">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search activities..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                }}
                                className="pl-9"
                            />
                        </div>

                        {/* Category Filter */}
                        <Select
                            value={selectedCategory}
                            onValueChange={(value) => {
                                setSelectedCategory(value);
                            }}
                        >
                            <SelectTrigger className="w-40">
                                <Filter className="h-4 w-4 mr-2 shrink-0" />
                                <SelectValue
                                    placeholder="Category"
                                    className="whitespace-nowrap overflow-hidden"
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    value="all"
                                    className="whitespace-nowrap"
                                >
                                    All Categories
                                </SelectItem>
                                <SelectItem
                                    value="auth"
                                    className="whitespace-nowrap"
                                >
                                    Auth
                                </SelectItem>
                                <SelectItem
                                    value="permission"
                                    className="whitespace-nowrap"
                                >
                                    Permission
                                </SelectItem>
                                <SelectItem
                                    value="data"
                                    className="whitespace-nowrap"
                                >
                                    Data
                                </SelectItem>
                                <SelectItem
                                    value="settings"
                                    className="whitespace-nowrap"
                                >
                                    Settings
                                </SelectItem>
                                <SelectItem
                                    value="security"
                                    className="whitespace-nowrap"
                                >
                                    Security
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Sort Controls */}
                        <Select
                            value={localSortBy}
                            onValueChange={(value) => {
                                setLocalSortBy(
                                    value as
                                        | "timestamp"
                                        | "action"
                                        | "category",
                                );
                            }}
                        >
                            <SelectTrigger className="w-[120px]">
                                <ArrowUpDown className="h-4 w-4 mr-2 shrink-0" />
                                <SelectValue className="whitespace-nowrap overflow-hidden" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    value="timestamp"
                                    className="whitespace-nowrap"
                                >
                                    Time
                                </SelectItem>
                                <SelectItem
                                    value="action"
                                    className="whitespace-nowrap"
                                >
                                    Action
                                </SelectItem>
                                <SelectItem
                                    value="category"
                                    className="whitespace-nowrap"
                                >
                                    Category
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sort Order Toggle and Clear Filters */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const newOrder =
                                        localSortOrder === "asc"
                                            ? "desc"
                                            : "asc";
                                    setLocalSortOrder(newOrder);
                                }}
                                className="h-8 whitespace-nowrap"
                            >
                                <ArrowUpDown className="h-3 w-3 mr-1" />
                                {localSortOrder === "asc"
                                    ? "↑ Oldest"
                                    : "↓ Newest"}
                            </Button>
                            {(searchQuery ||
                                selectedCategory !== "all" ||
                                localSortBy !== "timestamp" ||
                                localSortOrder !== "desc") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-8 text-muted-foreground whitespace-nowrap"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                                {filteredAndSortedActivities.length} of{" "}
                                {activities.length} activities
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="px-6 py-4">
                        <div className="space-y-4">
                            {filteredAndSortedActivities.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {activities.length === 0 ? (
                                        <div>
                                            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>
                                                No activity found for this user
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>
                                                No activities match your current
                                                filters
                                            </p>
                                            <p className="text-sm mt-1">
                                                Try adjusting your search or
                                                filter criteria
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                filteredAndSortedActivities.map((activity) => {
                                    const CategoryIcon = getCategoryIcon(
                                        activity.category,
                                    );
                                    return (
                                        <div
                                            key={activity.id}
                                            className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="shrink-0">
                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                    <CategoryIcon className="h-4 w-4" />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-sm font-medium truncate">
                                                        {activity.action}
                                                    </h4>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs ${getCategoryColor(activity.category)}`}
                                                    >
                                                        {activity.category}
                                                    </Badge>
                                                </div>

                                                <p className="text-sm text-muted-foreground mb-2">
                                                    {activity.description}
                                                </p>

                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTimestamp(
                                                            activity.timestamp,
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {activity.timestamp.toLocaleString()}
                                                    </div>
                                                </div>

                                                {activity.metadata &&
                                                    Object.keys(
                                                        activity.metadata,
                                                    ).length > 0 && (
                                                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                                            <div className="font-medium mb-1">
                                                                Additional
                                                                Details:
                                                            </div>
                                                            <div className="space-y-1">
                                                                {Object.entries(
                                                                    activity.metadata,
                                                                ).map(
                                                                    ([
                                                                        key,
                                                                        value,
                                                                    ]) => (
                                                                        <div
                                                                            key={
                                                                                key
                                                                            }
                                                                            className="flex gap-2"
                                                                        >
                                                                            <span className="font-medium capitalize">
                                                                                {key
                                                                                    .replace(
                                                                                        /([A-Z])/g,
                                                                                        " $1",
                                                                                    )
                                                                                    .trim()}
                                                                                :
                                                                            </span>
                                                                            <span>
                                                                                {String(
                                                                                    value,
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </ResizableModalContent>
        </ResizableModal>
    );
}
