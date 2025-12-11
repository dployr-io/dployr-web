// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";

interface KeyValueEditorModalProps {
  title: string;
  description?: string;
  triggerLabel: string;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  isSecret?: boolean;
  disabled?: boolean;
}

export function KeyValueEditorModal({
  title,
  description,
  triggerLabel,
  values,
  onChange,
  isSecret = false,
  disabled = false,
}: KeyValueEditorModalProps) {
  const [open, setOpen] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  // Sync local state when opening
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setLocalValues({ ...values });
        setNewKey("");
        setNewValue("");
        setError("");
        setShowValues({});
      }
      setOpen(isOpen);
    },
    [values]
  );

  const handleAddEntry = useCallback(() => {
    const trimmedKey = newKey.trim();
    if (!trimmedKey) {
      setError("Key is required");
      return;
    }
    if (localValues[trimmedKey] !== undefined) {
      setError("Key already exists");
      return;
    }
    setLocalValues(prev => ({ ...prev, [trimmedKey]: newValue }));
    setNewKey("");
    setNewValue("");
    setError("");
  }, [newKey, newValue, localValues]);

  const handleRemoveEntry = useCallback((key: string) => {
    setLocalValues(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleUpdateValue = useCallback((key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onChange(localValues);
    setOpen(false);
  }, [localValues, onChange]);

  const toggleShowValue = useCallback((key: string) => {
    setShowValues(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const entryCount = Object.keys(values).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} className="w-full justify-between">
          <span>{triggerLabel}</span>
          <span className="text-xs text-muted-foreground">{entryCount} {entryCount === 1 ? "entry" : "entries"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing entries */}
          {Object.keys(localValues).length > 0 && (
            <div className="rounded-md border max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(localValues).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-sm">{key}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            value={value}
                            onChange={e => handleUpdateValue(key, e.target.value)}
                            type={isSecret && !showValues[key] ? "password" : "text"}
                            className="h-8 font-mono text-sm"
                          />
                          {isSecret && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleShowValue(key)}
                            >
                              {showValues[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveEntry(key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add new entry */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Add new entry</Label>
            <div className="flex gap-2">
              <Input
                placeholder="KEY"
                value={newKey}
                onChange={e => {
                  setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""));
                  setError("");
                }}
                className="flex-1 font-mono text-sm"
              />
              <Input
                placeholder="value"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                type={isSecret ? "password" : "text"}
                className="flex-1 font-mono text-sm"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEntry();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddEntry}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
