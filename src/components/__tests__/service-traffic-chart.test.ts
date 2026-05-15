// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { formatPeakWindow } from "@/components/service-traffic-chart";

// Pin a stable bucket: 2025-01-01 20:00:00 UTC
const BASE_MS = Date.UTC(2025, 0, 1, 20, 0, 0);

// toLocaleTimeString is locale/TZ-dependent in jsdom — derive the expected labels
// from the same function so the test stays portable across environments.
function label(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

describe("formatPeakWindow", () => {
  it("appends one hour to the bucket timestamp for the end label", () => {
    const start = label(BASE_MS);
    const end = label(BASE_MS + 60 * 60 * 1000);
    expect(formatPeakWindow(BASE_MS, start)).toBe(`${start} – ${end}`);
  });

  it("uses the provided startLabel verbatim", () => {
    const result = formatPeakWindow(BASE_MS, "08:00 PM");
    expect(result.startsWith("08:00 PM")).toBe(true);
  });

  it("separates start and end with an en-dash", () => {
    const result = formatPeakWindow(BASE_MS, label(BASE_MS));
    expect(result).toContain(" – ");
  });

  it("handles midnight rollover (23:00 → 00:00)", () => {
    const midnight = Date.UTC(2025, 0, 1, 23, 0, 0);
    const start = label(midnight);
    const end = label(midnight + 60 * 60 * 1000); // wraps to 00:00 next day
    expect(formatPeakWindow(midnight, start)).toBe(`${start} – ${end}`);
  });
});
