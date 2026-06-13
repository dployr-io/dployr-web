// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const sentMessages: any[] = [];
const subscribers = new Map<string, (msg: any) => void>();

const mockStream = vi.hoisted(() => ({
  isConnected: true,
  error: null as string | null,
  sendJson: vi.fn((msg: any) => sentMessages.push(msg)),
  subscribe: vi.fn((id: string, h: (msg: any) => void) => subscribers.set(id, h)),
  unsubscribe: vi.fn((id: string) => subscribers.delete(id)),
}));

vi.mock("@/hooks/use-instance-stream", () => ({
  useInstanceStream: () => mockStream,
}));

vi.mock("@/lib/log-utils", () => ({
  parseLogEntries: (entries: any[], counterRef: any) =>
    entries.map((e, i) => ({
      id: String((counterRef.current ?? 0) + i),
      message: e.msg ?? e.message ?? String(e),
      level: (e.level ?? "info").toUpperCase(),
      timestamp: new Date(e.t ?? Date.now()),
      source: e.source,
    })),
  filterLogs: (logs: any[]) => logs,
  isNearBottom: () => false,
  sortLogsByTimestamp: (logs: any[]) => [...logs],
  mergeSortedLogs: (prev: any[], next: any[]) => [...prev, ...next],
}));

vi.mock("ulid", () => ({ ulid: () => "test-ulid" }));

import { useLogs } from "@/hooks/use-instance-logs";

function dispatch(message: any) {
  subscribers.get("test-ulid")?.(message);
}

describe("useLogs", () => {
  beforeEach(() => {
    sentMessages.length = 0;
    subscribers.clear();
    vi.clearAllMocks();
    mockStream.isConnected = true;
    mockStream.error = null;
    // Re-attach implementations after clearAllMocks resets them
    mockStream.sendJson.mockImplementation((msg: any) => sentMessages.push(msg));
    mockStream.subscribe.mockImplementation((id: string, h: (msg: any) => void) => subscribers.set(id, h));
    mockStream.unsubscribe.mockImplementation((id: string) => subscribers.delete(id));
  });

  test("startStreaming sends log_subscribe with path and duration", async () => {
    const { result } = renderHook(() =>
      useLogs({ path: "service:my-app", duration: "24h" })
    );

    act(() => result.current.startStreaming());

    const sub = sentMessages.find(m => m.kind === "log_subscribe");
    expect(sub).toBeDefined();
    expect(sub.path).toBe("service:my-app");
    expect(sub.duration).toBe("24h");
  });

  test("startStreaming with logSource=runtime adds source: runtime", () => {
    const { result } = renderHook(() =>
      useLogs({ path: "service:my-app", logSource: "runtime" })
    );

    act(() => result.current.startStreaming());

    const sub = sentMessages.find(m => m.kind === "log_subscribe");
    expect(sub?.source).toBe("runtime");
  });

  test("startStreaming with logSource=deployments adds source: build|deploy", () => {
    const { result } = renderHook(() =>
      useLogs({ path: "dep-123", logSource: "deployments" })
    );

    act(() => result.current.startStreaming());

    const sub = sentMessages.find(m => m.kind === "log_subscribe");
    expect(sub?.source).toBe("build|deploy");
  });

  test("log_subscribed message sets currentStreamId", async () => {
    const { result } = renderHook(() => useLogs({ path: "service:my-app" }));

    act(() => result.current.startStreaming());
    act(() => dispatch({ kind: "log_subscribed", streamId: "srv-stream-1", path: "service:my-app" }));

    await waitFor(() => expect(result.current.currentStreamId).toBe("srv-stream-1"));
  });

  test("log_chunk entries are parsed and added to logs state", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useLogs({ path: "service:my-app" }));

    act(() => result.current.startStreaming());
    act(() => dispatch({
      kind: "log_chunk",
      entries: [
        { t: Date.now(), msg: "hello world", level: "info", source: "runtime" },
        { t: Date.now(), msg: "second line",  level: "warn", source: "runtime" },
      ],
    }));

    // Advance the 100ms debounce timer that buffers log entries before flushing to state
    act(() => vi.runAllTimers());
    vi.useRealTimers();

    await waitFor(() => expect(result.current.logs.length).toBeGreaterThan(0));
    expect(result.current.logs.some(l => l.message === "hello world")).toBe(true);
  });

  test("stopStreaming sends log_unsubscribe and clears currentStreamId", async () => {
    const { result } = renderHook(() => useLogs({ path: "service:my-app" }));

    act(() => result.current.startStreaming());
    act(() => dispatch({ kind: "log_subscribed", streamId: "srv-1", path: "service:my-app" }));
    await waitFor(() => expect(result.current.currentStreamId).toBe("srv-1"));

    act(() => result.current.stopStreaming());

    const unsub = sentMessages.find(m => m.kind === "log_unsubscribe");
    expect(unsub).toBeDefined();
    expect(unsub?.path).toBe("service:my-app");
    await waitFor(() => expect(result.current.currentStreamId).toBeNull());
  });

  test("error message from server sets error state", async () => {
    const { result } = renderHook(() => useLogs({ path: "dep-123" }));

    act(() => result.current.startStreaming());
    act(() => dispatch({ kind: "error", message: "Stream not found" }));

    await waitFor(() => expect(result.current.error).toBe("Stream not found"));
  });

  test("second startStreaming call does not send a duplicate log_subscribe", () => {
    const { result } = renderHook(() => useLogs({ path: "service:my-app" }));

    act(() => result.current.startStreaming());
    act(() => result.current.startStreaming());

    const subs = sentMessages.filter(m => m.kind === "log_subscribe");
    expect(subs.length).toBe(1);
  });
});
