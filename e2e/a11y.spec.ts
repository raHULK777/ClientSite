import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { login, USERS } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );

  expect(
    blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.flatMap((node) => node.target),
    })),
  ).toEqual([]);
}

test("public landing has no critical or serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await expectNoSeriousViolations(page);
});

test("login has no critical or serious accessibility violations", async ({ page }) => {
  await page.goto("/login");
  await expectNoSeriousViolations(page);
});

test("admin workspace has no critical or serious accessibility violations", async ({
  page,
}) => {
  await login(page, USERS.admin, "/app");
  await expectNoSeriousViolations(page);
});

test("change orders have no critical or serious accessibility violations", async ({
  page,
}) => {
  await login(page, USERS.admin, "/app");
  await page.goto("/app/change-orders");
  await expectNoSeriousViolations(page);
});

test("field board has no critical or serious accessibility violations", async ({
  page,
}) => {
  await login(page, USERS.field, "/app");
  await page.goto("/app/field");
  await expectNoSeriousViolations(page);
});

test("client portal has no critical or serious accessibility violations", async ({
  page,
}) => {
  await login(page, USERS.client, "/portal");
  await expectNoSeriousViolations(page);
});
