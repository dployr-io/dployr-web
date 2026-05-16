// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";
import { parseEnvFile } from "@/components/key-value-editor-modal";

describe("parseEnvFile", () => {
  test("parses basic KEY=value pairs", () => {
    expect(parseEnvFile("FOO=bar\nBAZ=qux")).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  test("skips comment lines", () => {
    expect(parseEnvFile("# this is a comment\nFOO=bar")).toEqual({ FOO: "bar" });
  });

  test("skips empty lines", () => {
    expect(parseEnvFile("\n\nFOO=bar\n\n")).toEqual({ FOO: "bar" });
  });

  test("skips lines without an equals sign", () => {
    expect(parseEnvFile("NOEQUALS\nFOO=bar")).toEqual({ FOO: "bar" });
  });

  test("strips double-quoted values", () => {
    expect(parseEnvFile('FOO="hello world"')).toEqual({ FOO: "hello world" });
  });

  test("strips single-quoted values", () => {
    expect(parseEnvFile("FOO='hello world'")).toEqual({ FOO: "hello world" });
  });

  test("does not strip mismatched quotes", () => {
    expect(parseEnvFile("FOO=\"hello'")).toEqual({ FOO: "\"hello'" });
  });

  test("trims whitespace around key and value", () => {
    expect(parseEnvFile("  FOO  =  bar  ")).toEqual({ FOO: "bar" });
  });

  test("allows empty value", () => {
    expect(parseEnvFile("FOO=")).toEqual({ FOO: "" });
  });

  test("value may contain equals signs", () => {
    expect(parseEnvFile("FOO=a=b=c")).toEqual({ FOO: "a=b=c" });
  });

  test("last duplicate key wins", () => {
    expect(parseEnvFile("FOO=first\nFOO=second")).toEqual({ FOO: "second" });
  });

  test("handles CRLF line endings", () => {
    expect(parseEnvFile("FOO=bar\r\nBAZ=qux\r\n")).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  test("returns empty object for blank input", () => {
    expect(parseEnvFile("")).toEqual({});
  });

  test("returns empty object for all-comments input", () => {
    expect(parseEnvFile("# comment\n# another")).toEqual({});
  });

  test("merges over existing values when called with spread", () => {
    const existing = { FOO: "old", KEEP: "me" };
    const imported = parseEnvFile("FOO=new\nBAR=baz");
    const merged = { ...existing, ...imported };
    expect(merged).toEqual({ FOO: "new", KEEP: "me", BAR: "baz" });
  });
});

describe("key validation rules", () => {
  const normalizeKey = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9_]/g, "");

  test("uppercases input", () => {
    expect(normalizeKey("mykey")).toBe("MYKEY");
  });

  test("strips characters that are not letters, digits, or underscores", () => {
    expect(normalizeKey("MY-KEY.NAME")).toBe("MYKEYNAME");
  });

  test("allows underscores", () => {
    expect(normalizeKey("MY_KEY")).toBe("MY_KEY");
  });

  test("allows digits", () => {
    expect(normalizeKey("KEY_123")).toBe("KEY_123");
  });

  test("empty input stays empty", () => {
    expect(normalizeKey("")).toBe("");
  });
});
