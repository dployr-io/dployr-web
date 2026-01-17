// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from "@tanstack/react-router";
import "@/css/app.css";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem } from "@/types";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import DOMPurify from "dompurify";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { useTerminal } from "@/hooks/use-terminal";
import { useInstances } from "@/hooks/use-instances";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { useUrlState } from "@/hooks/use-url-state";

export const Route = createFileRoute("/clusters/$clusterId/console")({
  component: Console,
});

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Console",
    href: "/console",
  },
];

function Console() {
  const { instances } = useInstances();
  const { useConsoleUrlState } = useUrlState();
  const [{ fullscreen }, setConsoleState] = useConsoleUrlState();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!selectedInstanceId && instances.length > 0) {
      setSelectedInstanceId(instances[0].tag);
    }
  }, [instances, selectedInstanceId]);

  const { isOpen, state, streamConnected, openTerminal, sendInput, sendResize, closeTerminal } = useTerminal({
    instanceId: selectedInstanceId,
    getTerminal: () => terminalInstanceRef.current,
    enabled: !!selectedInstanceId,
  });

  const terminalRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      return;
    }

    if (terminalInstanceRef.current) {
      return;
    }

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#0a0a0a",
        foreground: "#ffffff",
        cursor: "#ffffff",
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(node);
    term.focus();

    fitAddonRef.current = fit;
    terminalInstanceRef.current = term;

    setTimeout(() => {
      fit.fit();
    }, 0);

    const resizeObserver = new ResizeObserver(() => {
      fit.fit();
    });

    resizeObserver.observe(node);
    resizeObserverRef.current = resizeObserver;
  }, []);

  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
      }
      fitAddonRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [fullscreen]);

  useEffect(() => {
    const terminal = terminalInstanceRef.current;
    if (!terminal) return;

    const handleData = (data: string) => {
      if (isOpen) {
        sendInput(data);
      }
    };

    const disposable = terminal.onData(handleData);

    return () => {
      disposable.dispose();
    };
  }, [isOpen, sendInput]);

  useEffect(() => {
    const terminal = terminalInstanceRef.current;
    if (!terminal || !isOpen) return;

    sendResize(terminal.cols, terminal.rows);
  }, [isOpen, sendResize]);

  const terminalScrollbarHTML = `
    .terminal-scrollbar::-webkit-scrollbar {
        width: 8px;
    }
    .terminal-scrollbar::-webkit-scrollbar-track {
        background: #262626;
        border-radius: 4px;
    }
    .terminal-scrollbar::-webkit-scrollbar-thumb {
        background: #525252;
        border-radius: 4px;
    }
    .terminal-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #737373;
    }
    .terminal-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #525252 #262626;
    }
  `;

  const sanitizedData = () => ({
    __html: DOMPurify.sanitize(terminalScrollbarHTML),
  });

  return (
    <ProtectedRoute>
      <AppLayout breadcrumbs={breadcrumbs}>
        <style dangerouslySetInnerHTML={sanitizedData()} />
        <div className={fullscreen 
          ? "fixed inset-0 z-50 flex flex-col bg-background p-4" 
          : "flex h-full min-h-0 flex-col gap-4 overflow-y-hidden rounded-xl p-4"
        }>
          <div className={fullscreen 
            ? "flex min-h-0 flex-1 flex-col" 
            : "flex min-h-0 flex-1 auto-rows-min gap-4 px-9 py-2"
          }>
            <div className="flex min-h-0 w-full flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-sidebar-border">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex h-10 items-center justify-between gap-2 border-b border-sidebar-border bg-neutral-50 px-2 dark:bg-neutral-900">
                    <div className="flex items-center gap-2">
                      <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                        <SelectTrigger className="h-7 w-[160px] text-xs">
                          <SelectValue placeholder="Select instance" />
                        </SelectTrigger>
                        <SelectContent>
                          {instances.map(instance => (
                            <SelectItem key={instance.tag} value={instance.tag}>
                              {instance.tag}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant={isOpen ? "default" : "secondary"} className="text-xs">
                        {state === "opening" ? "Connecting..." : isOpen ? "Connected" : "Closed"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {streamConnected && !isOpen && state !== "opening" && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={openTerminal}
                          className="h-7 text-xs"
                        >
                          Open Terminal
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setConsoleState({ fullscreen: !fullscreen })}
                      >
                        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div ref={terminalRef} className="terminal-scrollbar min-h-0 flex-1 bg-neutral-950 px-2" onClick={() => terminalInstanceRef.current?.focus()} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
