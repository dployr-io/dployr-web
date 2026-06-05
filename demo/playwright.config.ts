// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0
//
// Demo recording config — produces a video suitable for documentation.
// Usage (from repo root):
//   npx playwright test happy-path --config=demo/playwright.config.ts
//
// Or just run the helper script:
//   .\demo\record.ps1

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
const demoTheme = process.env.DEMO_THEME;
const storageState =
  demoTheme === "light" || demoTheme === "dark"
    ? {
        cookies: [],
        origins: [
          {
            origin: new URL(baseURL).origin,
            localStorage: [{ name: "appearance", value: demoTheme }],
          },
        ],
      }
    : undefined;

export default defineConfig({
  testDir: "../e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    headless: false,
    launchOptions: { slowMo: 700 },
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    video: {
      mode: "on",
      size: { width: 1280, height: 720 },
    },
    actionTimeout: 30_000,
    colorScheme: demoTheme === "light" || demoTheme === "dark" ? demoTheme : undefined,
    storageState,
  },
  projects: [
    {
      name: "msedge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge",
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: "pnpm --prefix .. run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
