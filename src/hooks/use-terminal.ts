// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import { useInstanceStream } from "./use-instance-stream";

export type TerminalConnectionState = "idle" | "opening" | "open" | "closed" | "error";

interface TerminalMessage {
  kind: "terminal";
  requestId?: string;
  instanceId: string;
  action: "input" | "output" | "resize" | "close" | "error";
  data?: string;
  cols?: number;
  rows?: number;
  error?: string;
}

interface TerminalOpenMessage {
  kind: "terminal_open";
  requestId: string;
  instanceId: string;
  cols: number;
  rows: number;
}

interface TerminalOpenResponse {
  kind: "terminal_open_response";
  requestId: string;
  success: boolean;
  data?: {
    sessionId: string;
    message?: string;
  };
  error?: string;
}

interface UseTerminalOptions {
  instanceId: string;
  getTerminal: () => Terminal | null;
  enabled?: boolean;
}

const generateRequestId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export function useTerminal(options: UseTerminalOptions) {
  const { instanceId, getTerminal, enabled = true } = options;
  const { isConnected: streamConnected, sendJson, subscribe, unsubscribe } = useInstanceStream();

  const [state, setState] = useState<TerminalConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const subscriberIdRef = useRef<string>(`terminal-${instanceId}`);
  const openRequestIdRef = useRef<string | null>(null);

  const handleMessage = useCallback(
    (message: any) => {
      if (message.kind === "terminal_open_response") {
        const response = message as TerminalOpenResponse;
        
        if (response.requestId === openRequestIdRef.current) {
          if (response.success && response.data?.sessionId) {
            setState("open");
            setError(null);
            console.log("Terminal session opened:", response.data.sessionId);
          } else {
            setState("error");
            setError(response.error || "Failed to open terminal session");
            console.error("Terminal open failed:", response.error);
          }
          openRequestIdRef.current = null;
        }
      } else if (message.kind === "terminal" && message.instanceId === instanceId) {
        const terminalMsg = message as TerminalMessage;
        const terminal = getTerminal();
        
        if (!terminal) return;

        switch (terminalMsg.action) {
          case "output":
            if (terminalMsg.data) {
              terminal.write(terminalMsg.data);
              if (state === "opening") {
                setState("open");
                setError(null);
              }
            }
            break;
          case "error":
            if (terminalMsg.error) {
              terminal.writeln(`\r\n\x1b[31mError: ${terminalMsg.error}\x1b[0m\r\n`);
            }
            break;
          case "close":
            terminal.writeln("\r\n\x1b[33mTerminal session closed\x1b[0m\r\n");
            setState("closed");
            break;
        }
      }
    },
    [instanceId, getTerminal]
  );

  useEffect(() => {
    if (!enabled || !instanceId) return;

    const subscriberId = subscriberIdRef.current;
    subscribe(subscriberId, handleMessage);

    return () => {
      unsubscribe(subscriberId);
    };
  }, [enabled, instanceId, subscribe, unsubscribe, handleMessage]);

  const openTerminal = useCallback(() => {
    const terminal = getTerminal();

    if (!streamConnected || !terminal || !instanceId) {
      console.warn("Cannot open terminal: stream not connected or terminal not initialized");
      return false;
    }

    if (state === "opening" || state === "open") {
      console.warn("Terminal already opening or open");
      return false;
    }

    const requestId = generateRequestId();
    openRequestIdRef.current = requestId;

    const message: TerminalOpenMessage = {
      kind: "terminal_open",
      requestId,
      instanceId,
      cols: terminal.cols,
      rows: terminal.rows,
    };

    setState("opening");
    const sent = sendJson(message);
    
    if (!sent) {
      setState("error");
      setError("Failed to send terminal open request");
      openRequestIdRef.current = null;
      return false;
    }

    return true;
  }, [streamConnected, getTerminal, instanceId, state, sendJson]);

  const sendInput = useCallback(
    (data: string) => {
      if (state !== "open") return false;

      const message: TerminalMessage = {
        kind: "terminal",
        requestId: generateRequestId(),
        instanceId,
        action: "input",
        data,
      };

      return sendJson(message);
    },
    [state, instanceId, sendJson]
  );

  const sendResize = useCallback(
    (cols: number, rows: number) => {
      if (state !== "open") return false;

      const message: TerminalMessage = {
        kind: "terminal",
        requestId: generateRequestId(),
        instanceId,
        action: "resize",
        cols,
        rows,
      };

      return sendJson(message);
    },
    [state, instanceId, sendJson]
  );

  const closeTerminal = useCallback(() => {
    if (state !== "open") return false;

    const message: TerminalMessage = {
      kind: "terminal",
      requestId: generateRequestId(),
      instanceId,
      action: "close",
    };

    const sent = sendJson(message);
    
    if (sent) {
      setState("closed");
    }

    return sent;
  }, [instanceId, sendJson]);

  return {
    isOpen: state === "open",
    state,
    error,
    streamConnected,
    openTerminal,
    sendInput,
    sendResize,
    closeTerminal,
  };
}
