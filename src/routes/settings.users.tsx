import { createFileRoute } from "@tanstack/react-router";
import "../css/app.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import type { BreadcrumbItem, Role } from "@/types";
import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toWordUpperCase } from "@/lib/utils";

export const Route = createFileRoute("/settings/users")({
    component: Profile,
});

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Configuration",
        href: "/settings/users",
    },
];

function Profile() {
    const { config }: Record<string, string> = {};
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [role, setRoleValue] = useState<Role>('user');

    const handleEdit = (key: string) => {
        setEditingKey(key);
        setEditValue("");
    };

    const handleSave = (key: string) => { };

    const handleCancel = () => {
        setEditingKey(null);
        setEditValue("");
    };

    const handleKeyPress = (e: React.KeyboardEvent, key: string) => {
        if (e.key === "Enter") {
            handleSave(key);
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <SettingsLayout>
                <div className="space-y-4">
                    <Table className="overflow-hidden rounded-t-lg">
                        <TableHeader className="gap-2 rounded-t-xl bg-neutral-50 p-2 dark:bg-neutral-900">
                            <TableRow>
                                <TableHead className="ml w-[200px]">
                                    User
                                </TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Last Used</TableHead>
                                <TableHead className="w-[100px] text-right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(config || {}).map(
                                ([key, value]) => {
                                    // const isSet = value !== null && value !== undefined && value !== '' && value !== false && value !== 0;
                                    const isSet = true;
                                    let lastUpdated: string | null = null;
                                    if (isSet) {
                                        if (
                                            typeof value === "object" &&
                                            value !== null &&
                                            Object.prototype.hasOwnProperty.call(
                                                value,
                                                "updated_at",
                                            ) &&
                                            typeof (
                                                value as {
                                                    updated_at?: unknown;
                                                }
                                            ).updated_at === "string"
                                        ) {
                                            lastUpdated = (
                                                value as { updated_at: string }
                                            ).updated_at;
                                        } else {
                                            lastUpdated = "Recently";
                                        }
                                    } else {
                                        lastUpdated = null;
                                    }

                                    return (
                                        <TableRow key={key}>
                                            <TableCell className="font-medium">
                                                {toWordUpperCase(key)}
                                            </TableCell>
                                            <TableCell>
                                                {editingKey === key ? (
                                                    <Input
                                                        value={editValue}
                                                        onChange={(e) =>
                                                            setEditValue(
                                                                e.target.value,
                                                            )
                                                        }
                                                        onKeyDown={(e) =>
                                                            handleKeyPress(
                                                                e,
                                                                key,
                                                            )
                                                        }
                                                        placeholder="Enter new value"
                                                        className="h-8 w-full"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="text-sm text-neutral-600">
                                                        {isSet
                                                            ? lastUpdated
                                                            : "Unset"}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingKey === key ? (
                                                    <Select
                                                        value={role}
                                                        onValueChange={(value) =>
                                                            setRoleValue(value as Role)
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8 w-full">
                                                            <SelectValue placeholder="Select role" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="admin">Admin</SelectItem>
                                                            <SelectItem value="user">User</SelectItem>
                                                            <SelectItem value="viewer">Viewer</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <span className="text-sm text-neutral-600">
                                                        {toWordUpperCase(role)}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {editingKey === key ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                handleSave(key)
                                                            }
                                                            className="h-8 px-3"
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={
                                                                handleCancel
                                                            }
                                                            className="h-8 px-3"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            handleEdit(key)
                                                        }
                                                        className="h-8 px-3"
                                                    >
                                                        {isSet ? "Edit" : "Set"}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                },
                            )}
                        </TableBody>
                    </Table>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
