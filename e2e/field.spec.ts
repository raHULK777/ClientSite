import { expect, test } from "@playwright/test";

import { IDS, login, USERS } from "./helpers";

test("field staff can send a progress update and see it after reload", async ({ page }) => {
  await login(page, USERS.field, "/app");
  await page.goto("/app/field");

  const card = page
    .locator(".shadow-sheet")
    .filter({ has: page.getByRole("heading", { name: "Elm Street Kitchen" }) });

  await card.locator(`#field-phase-${IDS.kitchen}`).fill("Framing complete");
  await card.locator(`#field-progress-${IDS.kitchen}`).fill("65");
  await card.getByRole("button", { name: "Send update" }).click();

  await expect(
    card.getByText("Update sent to the office.", { exact: true }),
  ).toBeVisible();

  await page.reload();

  const reloaded = page
    .locator(".shadow-sheet")
    .filter({ has: page.getByRole("heading", { name: "Elm Street Kitchen" }) });

  await expect(reloaded.locator(`#field-phase-${IDS.kitchen}`)).toHaveValue(
    "Framing complete",
  );
  await expect(reloaded.locator(`#field-progress-${IDS.kitchen}`)).toHaveValue("65");
});
