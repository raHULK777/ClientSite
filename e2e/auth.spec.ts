import { expect, test } from "@playwright/test";

import { login, USERS } from "./helpers";

test("rejects invalid credentials without signing in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(USERS.admin.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByText("Email or password is incorrect.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("admin lands in the workspace with the full navigation", async ({ page }) => {
  await login(page, USERS.admin, "/app");

  const nav = page.getByRole("navigation", { name: "Workspace" });
  await expect(nav.getByRole("link", { name: "Project index" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Field" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Change orders" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Clients" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
});

test("field staff get the field copy first and no settings link", async ({ page }) => {
  await login(page, USERS.field, "/app");

  const nav = page.getByRole("navigation", { name: "Workspace" });
  await expect(nav.getByRole("link").first()).toContainText("Field");
  await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);

  await nav.getByRole("link", { name: "Field" }).click();
  await expect(page).toHaveURL(/\/app\/field$/);
  await expect(
    page.getByRole("heading", { name: /Today.s site work/ }),
  ).toBeVisible();
});
