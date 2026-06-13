// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";
import { parseLogEntry, stripMessageTimestamp } from "@/lib/log-utils";

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

describe("stripMessageTimestamp", () => {
  // PHP built-in server / Apache ErrorLog
  test("strips PHP bracket timestamp with two-digit day", () => {
    expect(stripMessageTimestamp("[Sat Jun 13 09:14:57 2026] 172.17.0.1:46058 GET /")).toBe("172.17.0.1:46058 GET /");
  });

  test("strips PHP bracket timestamp with single-digit day (space-padded)", () => {
    expect(stripMessageTimestamp("[Sat Jun  3 09:14:57 2026] 172.17.0.1:46058 Accepted")).toBe("172.17.0.1:46058 Accepted");
  });

  test("strips PHP bracket timestamp when it is the entire message", () => {
    expect(stripMessageTimestamp("[Sat Jun 13 09:14:57 2026]")).toBe("");
  });

  // ISO 8601
  test("strips ISO 8601 timestamp with Z suffix", () => {
    expect(stripMessageTimestamp("2026-06-13T09:14:57Z GET /api/users 200")).toBe("GET /api/users 200");
  });

  test("strips ISO 8601 timestamp with milliseconds and Z suffix", () => {
    expect(stripMessageTimestamp("2026-06-13T09:14:57.123Z user login succeeded")).toBe("user login succeeded");
  });

  test("strips ISO 8601 timestamp with numeric timezone offset", () => {
    expect(stripMessageTimestamp("2026-06-13T09:14:57+00:00 connection established")).toBe("connection established");
  });

  test("strips ISO 8601 timestamp with no timezone indicator", () => {
    expect(stripMessageTimestamp("2026-06-13T09:14:57 starting worker")).toBe("starting worker");
  });

  // Date with space separator
  test("strips date-space-time timestamp", () => {
    expect(stripMessageTimestamp("2026-06-13 09:14:57 [error] upstream timeout")).toBe("[error] upstream timeout");
  });

  test("strips date-space-time timestamp with milliseconds", () => {
    expect(stripMessageTimestamp("2026-06-13 09:14:57.456 queue flushed")).toBe("queue flushed");
  });

  // nginx / Go stdlib
  test("strips nginx-style slash-separated timestamp", () => {
    expect(stripMessageTimestamp("2026/06/13 09:14:57 [error] connect() failed")).toBe("[error] connect() failed");
  });

  // No timestamp — must be returned unchanged
  test("returns message unchanged when no leading timestamp present", () => {
    expect(stripMessageTimestamp("user logged in successfully")).toBe("user logged in successfully");
  });

  test("does not strip Apache combined log timestamp that follows an IP address", () => {
    const apacheCombined = '172.17.0.1 - - [13/Jun/2026:09:14:57 +0000] "GET / HTTP/1.1" 200 -';
    expect(stripMessageTimestamp(apacheCombined)).toBe(apacheCombined);
  });

  test("does not strip a date-only string with no time component", () => {
    expect(stripMessageTimestamp("2026-06-13 scheduled maintenance window")).toBe("2026-06-13 scheduled maintenance window");
  });

  test("does not strip a partial timestamp lookalike", () => {
    expect(stripMessageTimestamp("2026-06-13T09 partial")).toBe("2026-06-13T09 partial");
  });

  // Edge cases
  test("returns empty string unchanged", () => {
    expect(stripMessageTimestamp("")).toBe("");
  });

  test("returns whitespace-only string unchanged", () => {
    expect(stripMessageTimestamp("   ")).toBe("   ");
  });

  test("strips timestamp and trailing whitespace leaving a clean message", () => {
    const result = stripMessageTimestamp("2026/06/13 09:14:57   spaced message");
    expect(result).toBe("spaced message");
  });
});
