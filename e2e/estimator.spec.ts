import { expect, test } from "@playwright/test";

test("prices a kitchen from the public takeoff and validates the area", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Kitchen remodel", exact: true }).click();
  await page.getByLabel("Finish level").selectOption("standard");
  await page.getByLabel("Project area").fill("120");

  await expect(page.locator("p.text-3xl")).toHaveText("$36,396");
  await expect(
    page.getByText("Range $33,848 to $38,944", { exact: true }),
  ).toBeVisible();

  await page.getByLabel("Project area").fill("10");

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Kitchen remodel is priced between 40 and 600 square feet." }),
  ).toBeVisible();
});
