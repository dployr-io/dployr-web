import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toWordUpperCase } from "@/lib/utils";

interface Props {
    config: Record<string, string>;
    editingKey: string | null;
    editValue: string;
    setEditValue: (value: React.SetStateAction<string>) => void;
    handleEdit: (key: string) => void;
    handleSave: (key: string) => void;
    handleKeyboardPress: (e: React.KeyboardEvent<Element>, key: string) => void;
    handleCancel: () => void;
}

export function ConfigTable({ config, editingKey, editValue, setEditValue, handleEdit, handleSave, handleKeyboardPress, handleCancel }: Props) {
    return (
        <Table className="overflow-hidden rounded-t-lg">
            <TableHeader className="gap-2 rounded-t-xl bg-neutral-50 p-2 dark:bg-neutral-900">
                <TableRow>
                    <TableHead className="ml w-[200px]">Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-[100px] text-right"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.entries(config || {}).map(([key, value]) => {
                    const isSet = value !== null && value !== undefined && value !== '';

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
                                            setEditValue(e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                            handleKeyboardPress(e, key)
                                        }
                                        placeholder="Enter new value"
                                        className="h-8 w-full"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-sm text-neutral-600">
                                        {isSet ? value : "Unset"}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                {editingKey === key ? (
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => handleSave(key)}
                                            className="h-8 px-3"
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancel}
                                            className="h-8 px-3"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(key)}
                                        className="h-8 px-3"
                                    >
                                        {isSet ? "Edit" : "Set"}
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
