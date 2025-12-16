// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Remote } from "@/types";
import { ChevronDown, Loader2, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { FaGithub } from "react-icons/fa";

interface RemoteSelectorProps {
  value: Remote | null;
  remotes: Remote[];
  isLoading: boolean;
  error?: string;
  disabled?: boolean;
  onChange: (remote: Remote) => void;
}

export function RemoteSelector({ value, remotes, isLoading, error, disabled, onChange }: RemoteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value?.url || "");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const externalUrl = value?.url || "";
    if (externalUrl !== inputValue) {
      setInputValue(externalUrl);
    }
  }, [value?.url]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredRemotes = useMemo(() => {
    if (!inputValue) return remotes;
    const query = inputValue.toLowerCase();
    return remotes.filter(r => r.url.toLowerCase().includes(query));
  }, [remotes, inputValue]);

  const handleSelectRemote = (remote: Remote) => {
    setInputValue(remote.url);
    onChange(remote);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setInputValue(url);
    setIsOpen(true);

    const matchedRemote = remotes.find(r => r.url === url);
    if (matchedRemote) {
      onChange(matchedRemote);
    } else if (url) {
      onChange({
        url,
        branch: "main",
        commit_hash: "",
        avatar_url: "",
      });
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" && filteredRemotes.length > 0) {
      handleSelectRemote(filteredRemotes[0]);
    }
  };

  const isCustomUrl = inputValue && !remotes.some(r => r.url === inputValue);

  return (
    <div className="grid gap-3">
      <Label htmlFor="remote">
        Remote Repository <span className="text-destructive">*</span>
      </Label>
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="remote"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "Loading remotes..." : "Select or enter repository URL"}
            disabled={disabled || isLoading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
            className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground"
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            )}
          </button>
        </div>

        {isOpen && (filteredRemotes.length > 0 || isCustomUrl) && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
            {filteredRemotes.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  Connected Repositories
                </div>
                {filteredRemotes.map(remote => (
                  <button
                    key={remote.url}
                    type="button"
                    onClick={() => handleSelectRemote(remote)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2",
                      value?.url === remote.url && "bg-accent"
                    )}
                  >
                    {remote.avatar_url ? (
                      <img src={remote.avatar_url} alt="" className="h-4 w-4 rounded-full" />
                    ) : (
                      <FaGithub className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate flex-1">{remote.url}</span>
                    {remote.branch && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {remote.branch}
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}

            {isCustomUrl && (
              <>
                {filteredRemotes.length > 0 && <div className="border-t" />}
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  Custom Repository
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      url: inputValue,
                      branch: "main",
                      commit_hash: "",
                      avatar_url: "",
                    });
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                >
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">Use "{inputValue}"</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
}
