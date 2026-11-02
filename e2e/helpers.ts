import { expect, type Page } from "@playwright/test";

export const API_URL = "http://localhost:4100";
export const DEMO_PASSWORD = "SantosDemo!23";
export const CONSENT_TEXT =
  "I approve this change order and the revised contract amount.";

export const USERS = {
  admin: { email: "owner@santos.test", name: "Marisol Santos" },
  field: { email: "field@santos.test", name: "Danny Ortiz" },
  client: { email: "client@santos.test", name: "Avery Chen" },
  client2: { email: "client2@santos.test", name: "Priya Raman" },
} as const;

export const IDS = {
  tenant: "11111111-1111-4111-8111-111111111111",
  kitchen: "66666666-6666-4666-8666-666666666666",
  bath: "77777777-7777-4777-8777-777777777777",
  addition: "88888888-8888-4888-8888-888888888888",
  electrical: "99999999-9999-4999-8999-999999999999",
  hardware: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  beam: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
} as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function login(
  page: Page,
  user: (typeof USERS)[keyof typeof USERS],
  expectedPath: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(expectedPath)}$`));
}
