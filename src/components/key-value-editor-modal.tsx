// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Eye, EyeOff, Upload, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

interface KeyValueEditorModalProps {
  title: string;
  description?: string;
  triggerLabel: string;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  isSecret?: boolean;
  disabled?: boolean;
}

export function KeyValueEditorModal({ title, description, triggerLabel, values, onChange, isSecret = false, disabled = false }: KeyValueEditorModalProps) {
  const [open, setOpen] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newKeyRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setLocalValues({ ...values });
        setNewKey("");
        setNewValue("");
        setError("");
        setShowValues({});
        setIsDragOver(false);
        setSearch("");
      }
      setOpen(isOpen);
    },
    [values]
  );

  const handleEnvFileContent = useCallback((content: string) => {
    const parsed = parseEnvFile(content);
    setLocalValues(prev => ({ ...prev, ...parsed }));
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) { setIsDragOver(false); return; }
      const reader = new FileReader();
      reader.onload = event => {
        const content = event.target?.result as string;
        if (content) handleEnvFileContent(content);
      };
      reader.readAsText(file);
    },
    [handleEnvFileContent]
  );

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = event => {
        const content = event.target?.result as string;
        if (content) handleEnvFileContent(content);
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [handleEnvFileContent]
  );

  const handleAddEntry = useCallback(() => {
    const trimmedKey = newKey.trim();
    if (!trimmedKey) { setError("Key is required"); return; }
    if (localValues[trimmedKey] !== undefined) { setError("Key already exists"); return; }
    setLocalValues(prev => ({ ...prev, [trimmedKey]: newValue }));
    setNewKey("");
    setNewValue("");
    setError("");
    setTimeout(() => newKeyRef.current?.focus(), 0);
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
  const entries = Object.entries(localValues);
  const filteredEntries = search.trim()
    ? entries.filter(([k, v]) => k.toLowerCase().includes(search.toLowerCase()) || v.toLowerCase().includes(search.toLowerCase()))
    : entries;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} className="w-full justify-between">
          <span>{triggerLabel}</span>
          <span className="text-xs text-muted-foreground">
            {entryCount} {entryCount === 1 ? "entry" : "entries"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Compact .env import strip */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-2 cursor-pointer select-none transition-colors text-sm text-muted-foreground",
            isDragOver ? "border-primary bg-primary/5 text-primary" : "hover:border-muted-foreground/50 hover:bg-muted/20"
          )}
        >
          <input ref={fileInputRef} type="file" accept=".env,text/plain" className="hidden" onChange={handleFileSelect} />
          <Upload className="h-4 w-4 shrink-0" />
          <span>
            Drag your <span className="font-mono text-xs">.env</span> here, or{" "}
            <span className="text-primary underline underline-offset-2">choose a file</span>
          </span>
        </div>

        {/* Entry grid */}
        <div className="rounded-md border overflow-hidden">
          {/* Column headers + search */}
          <div className="grid grid-cols-[2fr_3fr_auto] border-b bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground font-medium">
            <span>Key</span>
            {entries.length > 5 ? (
              <div className="flex items-center gap-1.5">
                <Search className="h-3 w-3 shrink-0" />
                <input
                  placeholder="Find a key…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent outline-none placeholder:text-muted-foreground/40 w-full text-foreground"
                />
              </div>
            ) : (
              <span>Value</span>
            )}
            <span className="w-8" />
          </div>

          {/* Existing rows */}
          <div className="divide-y max-h-52 overflow-y-auto">
            {filteredEntries.map(([key, value]) => (
              <div key={key} className="grid grid-cols-[2fr_3fr_auto] items-center gap-2 px-3 py-1.5 hover:bg-muted/10">
                <span className="font-mono text-xs truncate text-foreground/80">{key}</span>
                <div className="flex items-center gap-1 min-w-0">
                  <input
                    value={value}
                    onChange={e => handleUpdateValue(key, e.target.value)}
                    type={isSecret && !showValues[key] ? "password" : "text"}
                    className="w-full font-mono text-xs bg-transparent outline-none focus:bg-muted/30 rounded px-1.5 py-1 -mx-1.5 transition-colors"
                  />
                  {isSecret && (
                    <button type="button" className="text-muted-foreground hover:text-foreground shrink-0 p-0.5" onClick={() => toggleShowValue(key)}>
                      {showValues[key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                <button type="button" className="text-muted-foreground/40 hover:text-destructive w-8 flex justify-center shrink-0 transition-colors" onClick={() => handleRemoveEntry(key)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* New entry row */}
          <div className={cn("grid grid-cols-[2fr_3fr_auto] items-center gap-2 px-3 py-1.5 bg-muted/10", filteredEntries.length > 0 && "border-t")}>
            <input
              ref={newKeyRef}
              placeholder="NEW_KEY"
              value={newKey}
              onChange={e => { setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "")); setError(""); }}
              className="font-mono text-xs bg-transparent outline-none placeholder:text-muted-foreground/40 focus:bg-muted/30 rounded px-1.5 py-1 -mx-1.5 transition-colors"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddEntry(); } }}
            />
            <input
              placeholder="value"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              type={isSecret ? "password" : "text"}
              className="font-mono text-xs bg-transparent outline-none placeholder:text-muted-foreground/40 focus:bg-muted/30 rounded px-1.5 py-1 -mx-1.5 transition-colors"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddEntry(); } }}
            />
            <button type="button" onClick={handleAddEntry} title="Add entry" className="text-muted-foreground hover:text-primary w-8 flex justify-center shrink-0 transition-colors">
              <span className="text-base font-semibold leading-none">+</span>
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-destructive -mt-2">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
