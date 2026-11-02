import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type Browser } from "@playwright/test";

import { login, USERS } from "./helpers";

const OUTPUT_DIR = path.join(process.cwd(), ".impeccable", "review");

const ROUTES = [
  { name: "landing", path: "/", user: null },
  { name: "login", path: "/login", user: null },
  { name: "app-index", path: "/app", user: USERS.admin },
  { name: "change-orders", path: "/app/change-orders", user: USERS.admin },
  { name: "field", path: "/app/field", user: USERS.field },
  { name: "portal", path: "/portal", user: USERS.client },
] as const;

async function capture(
  browser: Browser,
  route: (typeof ROUTES)[number],
  viewport: { width: number; height: number },
) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport.width <= 390 ? 2 : 1,
  });
  const page = await context.newPage();

  if (route.user) {
    const landing = route.user === USERS.client ? "/portal" : "/app";
    await login(page, route.user, landing);
    if (route.path !== landing) await page.goto(route.path);
  } else {
    await page.goto(route.path);
  }

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${route.name} at ${viewport.width}px should not scroll horizontally`).toBeLessThanOrEqual(1);

  const suffix = viewport.width <= 390 ? "mobile" : "desktop";
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${route.name}-${suffix}.png`),
    fullPage: false,
  });

  await context.close();
}

test("capture review screenshots", async ({ browser }) => {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  test.setTimeout(240_000);

  for (const route of ROUTES) {
    await capture(browser, route, { width: 1440, height: 900 });
    await capture(browser, route, { width: 390, height: 844 });
  }
});
