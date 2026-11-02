import { expect, test } from "@playwright/test";

import { API_URL, CONSENT_TEXT, IDS, login, USERS } from "./helpers";

test("a client signs a pending change order and can reopen the record", async ({
  page,
}) => {
  await login(page, USERS.client, "/portal");

  await page.goto("/app");
  await expect(page).toHaveURL(/\/portal$/);

  const card = page.locator(`#change-${IDS.electrical}`);
  await card.getByRole("button", { name: "Review and approve" }).click();

  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Review change order" }),
  ).toBeVisible();

  await dialog.getByLabel("Type your full name").fill("Avery Chen");
  await dialog.getByRole("checkbox").click();
  await expect(dialog.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  await expect(dialog.getByText(CONSENT_TEXT, { exact: true })).toBeVisible();

  await dialog.getByRole("button", { name: "Sign and approve" }).click();

  await expect(
    dialog.getByRole("heading", { name: "Change order record" }),
  ).toBeVisible();
  await expect(dialog.getByText(/Signed by Avery Chen on/)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await expect(card.getByRole("button", { name: "View signed record" })).toBeVisible();
  await card.getByRole("button", { name: "View signed record" }).click();
  await expect(
    page.getByRole("dialog").getByText(/Signed by Avery Chen on/),
  ).toBeVisible();
});

test("workspace and project scope reject an unknown host and another client's job", async ({
  page,
  request,
}) => {
  const unknown = await request.get(`${API_URL}/api/v1/public/tenant`, {
    headers: { "x-tenant-host": "nope.test" },
  });
  expect(unknown.status()).toBe(404);
  expect(await unknown.json()).toMatchObject({
    success: false,
    error: "Workspace not found.",
  });

  await login(page, USERS.client2, "/portal");

  const foreign = await page.request.get(
    `${API_URL}/api/v1/protected/projects/${IDS.kitchen}`,
    { headers: { "x-tenant-host": "santos.localhost" } },
  );
  expect(foreign.status()).toBe(404);
  expect(await foreign.json()).toMatchObject({
    success: false,
    error: "Project not found.",
  });
});
