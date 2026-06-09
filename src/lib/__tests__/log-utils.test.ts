// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";
import { parseLogEntry } from "@/lib/log-utils";

describe("parseLogEntry", () => {
  test("parses a plain structured entry", () => {
    const entry = { msg: "hello world", level: "INFO", time: "2026-06-08T14:00:00Z" };
    const log = parseLogEntry(entry, 0);
    expect(log.message).toBe("hello world");
    expect(log.level).toBe("INFO");
    expect(log.timestamp).toEqual(new Date("2026-06-08T14:00:00Z"));
  });

  test("unwraps a JSON-stringified msg (Loki replay format)", () => {
    const inner = { level: "INFO", msg: "creating workspace", raw: true, time: "2026-06-08T14:20:27Z" };
    const entry = { time: "2026-06-08T14:20:27Z", msg: JSON.stringify(inner) };
    const log = parseLogEntry(entry, 1);
    expect(log.message).toBe("creating workspace");
    expect(log.level).toBe("INFO");
  });

  test("uses outer time when msg is JSON-stringified", () => {
    const inner = { level: "WARN", msg: "disk full", time: "2026-01-01T00:00:00Z" };
    const outerTime = "2026-06-08T10:00:00Z";
    const entry = { time: outerTime, msg: JSON.stringify(inner) };
    const log = parseLogEntry(entry, 2);
    expect(log.timestamp).toEqual(new Date(outerTime));
  });

  test("falls back to raw string when msg is not valid JSON", () => {
    const entry = { msg: "plain text log line", time: "2026-06-08T14:00:00Z" };
    const log = parseLogEntry(entry, 3);
    expect(log.message).toBe("plain text log line");
  });

  test("falls back to raw string when msg starts with { but is invalid JSON", () => {
    const entry = { msg: "{not valid json}", time: "2026-06-08T14:00:00Z" };
    const log = parseLogEntry(entry, 4);
    expect(log.message).toBe("{not valid json}");
  });

  test("defaults level to INFO when missing", () => {
    const entry = { msg: "no level", time: "2026-06-08T14:00:00Z" };
    const log = parseLogEntry(entry, 5);
    expect(log.level).toBe("INFO");
  });

  test("defaults timestamp to now when time is missing", () => {
    const before = Date.now();
    const log = parseLogEntry({ msg: "no time" }, 6);
    expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(before);
  });
});
