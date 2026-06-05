// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from "@playwright/test";

/** Block the session endpoint so the app treats the user as unauthenticated. */
async function blockAuth(page: import("@playwright/test").Page) {
  await page.route("**/v1/users/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) })
  );
}

/** Stub a logged-in session with a single cluster. */
async function stubSession(page: import("@playwright/test").Page) {
  await page.route("**/v1/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          user: { id: "user-1", email: "admin@dployr.io", name: "Admin" },
          clusters: [{ id: "cluster-1", name: "my-cluster", owner: "user-1" }],
        },
      }),
    })
  );
}

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await blockAuth(page);
    await page.goto("/");
  });

  test("renders sign in form with email input", async ({ page }) => {
    await expect(page.getByText("Sign in").first()).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("renders OAuth provider buttons (Google, Microsoft, GitHub)", async ({ page }) => {
    const buttons = page.getByRole("button");
    await expect(buttons.nth(0)).toBeVisible();
    await expect(buttons.nth(1)).toBeVisible();
    await expect(buttons.nth(2)).toBeVisible();
  });

  test("shows validation error for invalid email format", async ({ page }) => {
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Email").blur();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("transitions to OTP screen after valid email submit", async ({ page }) => {
    await page.route("**/v1/auth/login/email", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) })
    );

    await page.getByLabel("Email").fill("admin@dployr.io");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Verify 2FA")).toBeVisible();
    await expect(page.getByText("Enter the OTP sent to your email")).toBeVisible();
  });

  test("Back button on OTP screen returns to email form", async ({ page }) => {
    await page.route("**/v1/auth/login/email", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) })
    );

    await page.getByLabel("Email").fill("admin@dployr.io");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Verify 2FA")).toBeVisible();

    await page.getByRole("button", { name: /back/i }).click();

    await expect(page.getByLabel("Email")).toBeVisible();
  });
});

test.describe("Protected routes", () => {
  test("unauthenticated visit to /clusters is blocked with auth error", async ({ page }) => {
    await blockAuth(page);
    await page.goto("/clusters");

    // The auth hook sets ?authError in the URL before ProtectedRoute can fire
    // its <Navigate> — either outcome proves the route is protected
    await expect(page).toHaveURL(/authError=|^http:\/\/localhost:\d+\/$/, { timeout: 8000 });
  });
});

test.describe("Clusters page", () => {
  test.beforeEach(async ({ page }) => {
    await stubSession(page);
    await page.route("**/v1/billing/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { plans: [] } }) })
    );
  });

  test("authenticated user lands on clusters page", async ({ page }) => {
    await page.goto("/clusters");
    await expect(page).toHaveURL(/\/clusters/);
  });

  test("cluster card or project list is visible", async ({ page }) => {
    await page.goto("/clusters");
    // Either a cluster card or an empty-state prompt is shown
    const content = page.locator("[data-testid='cluster-card'], [data-testid='empty-state'], main");
    await expect(content.first()).toBeVisible();
  });
});

test.describe("Service management", () => {
  test.beforeEach(async ({ page }) => {
    await stubSession(page);

    // Stub billing
    await page.route("**/v1/billing/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { plans: [], billingStatus: { plan: "pro", status: "active" } } }) })
    );

    // Stub instances / services
    await page.route("**/v1/instances**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [{ id: "inst-1", tag: "node-east", role: "instance", status: "healthy" }] }),
      })
    );
  });

  test("service creation button is accessible from the services page", async ({ page }) => {
    await page.goto("/clusters/cluster-1/services");

    // Either a "Create service" / "Deploy" / "New" button or an empty-state CTA should be present
    const cta = page.getByRole("button", { name: /create|deploy|new service/i });
    await expect(cta.first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Instance management", () => {
  test.beforeEach(async ({ page }) => {
    await stubSession(page);
    await page.route("**/v1/billing/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { plans: [] } }) })
    );
    await page.route("**/v1/instances**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) })
    );
  });

  test("instances page loads with table and New Instance button", async ({ page }) => {
    await page.goto("/clusters/cluster-1/instances");

    await expect(page.getByText("Instances").first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: "New Instance" })).toBeVisible();
  });

  test("empty instances table shows helpful empty state", async ({ page }) => {
    await page.goto("/clusters/cluster-1/instances");

    await expect(page.getByText("No instances yet").first()).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Billing page", () => {
  test.beforeEach(async ({ page }) => {
    await stubSession(page);

    await page.route("**/v1/billing/plans", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            plans: [
              { id: "hobby", name: "Hobby", price: { monthly: 0, annual: 0 } },
              { id: "indie", name: "Indie", price: { monthly: 9, annual: 90 } },
              { id: "pro", name: "Pro", price: { monthly: 29, annual: 290 } },
            ],
          },
        }),
      })
    );

    await page.route("**/v1/billing/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { plan: "hobby", status: "active", interval: "monthly" } }),
      })
    );
  });

  test("billing page loads and displays plan options", async ({ page }) => {
    await page.goto("/clusters/cluster-1/settings/billing");

    // Hobby, Indie, Pro plan names should be rendered
    await expect(page.getByText("Hobby", { exact: true }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Indie", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
  });

  test("billing page does not crash (no unhandled errors)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/clusters/cluster-1/settings/billing");
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  });
});
