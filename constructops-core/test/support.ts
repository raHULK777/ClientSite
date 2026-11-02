import request, { type Response } from "supertest";

import { createApp } from "../src/app";
import { closeDatabase, getDatabase } from "../src/config/database";
import type { TenantCache } from "../src/modules/tenant/tenant.cache";
import { DEMO_PASSWORD, seed } from "../src/scripts/seed";

export const HOST = "santos.localhost";
export const CUSTOM_DOMAIN_HOST = "santos.constructops.test";
export const OTHER_HOST = "other.localhost";
export const UNKNOWN_HOST = "northwind.localhost";

export const TENANT_ID = "11111111-1111-4111-8111-111111111111";
export const ADMIN_ID = "22222222-2222-4222-8222-222222222222";
export const FIELD_ID = "33333333-3333-4333-8333-333333333333";
export const CLIENT_ID = "44444444-4444-4444-8444-444444444444";
export const CLIENT_TWO_ID = "55555555-5555-4555-8555-555555555555";
export const KITCHEN_ID = "66666666-6666-4666-8666-666666666666";
export const BATH_ID = "77777777-7777-4777-8777-777777777777";
export const ADDITION_ID = "88888888-8888-4888-8888-888888888888";
export const CO_ELECTRICAL_ID = "99999999-9999-4999-8999-999999999999";
export const CO_HARDWARE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const CO_BEAM_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const OTHER_TENANT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const OTHER_PROJECT_ID = "12121212-1212-4212-8212-121212121212";

export const CONSENT_TEXT = "I approve this change order and the revised contract amount.";

export const app = createApp();

export type Session = {
  agent: ReturnType<typeof request.agent>;
  csrf: string;
  user: { id: string; tenantId: string; email: string; role: string; firstName: string | null; lastName: string | null };
  response: Response;
};

export async function login(email: string, password = DEMO_PASSWORD): Promise<Session> {
  const agent = request.agent(app);
  const response = await agent.post("/api/v1/auth/login").set("Host", HOST).send({ email, password });
  return {
    agent,
    csrf: response.body?.data?.csrfToken as string,
    user: response.body?.data?.user,
    response,
  };
}

export async function seedWorkspace(): Promise<void> {
  await seed();
  await clearTenantCache();
}

export async function insertOtherTenantProject(): Promise<void> {
  await insertOtherTenant();
  await getDatabase().query(
    `INSERT INTO projects (id, tenant_id, project_name, status, current_phase, progress_percentage, estimated_cost)
     VALUES ($1, $2, 'Other tenant job', 'active', 'Framing', 10, 5000)
     ON CONFLICT (id) DO NOTHING`,
    [OTHER_PROJECT_ID, OTHER_TENANT_ID],
  );
}

export async function clearTenantCache(): Promise<void> {
  const cache = app.locals.tenantCache as TenantCache;
  await Promise.all(
    ["santos.localhost", "santos", "santos.constructops.test", "other.localhost", "other"].map((key) =>
      cache.clear(key),
    ),
  );
}

export async function insertOtherTenant(): Promise<void> {
  await getDatabase().query(
    `INSERT INTO tenants (id, company_name, subdomain, custom_domain, primary_color, secondary_color,
                          enable_estimator, enable_client_portal, enable_change_orders, estimator_pricing_matrix)
     VALUES ($1, 'Other Builders', 'other', 'other.constructops.test', '#101010', '#202020', true, true, true, '{}'::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [OTHER_TENANT_ID],
  );
}

export async function setTenantFeature(flag: "estimator" | "clientPortal" | "changeOrders", enabled: boolean): Promise<void> {
  const column = {
    estimator: "enable_estimator",
    clientPortal: "enable_client_portal",
    changeOrders: "enable_change_orders",
  }[flag];
  await getDatabase().query(`UPDATE tenants SET ${column} = $1 WHERE id = $2`, [enabled, TENANT_ID]);
  await clearTenantCache();
}

export async function setPricingMatrix(value: unknown): Promise<void> {
  await getDatabase().query("UPDATE tenants SET estimator_pricing_matrix = $2::jsonb WHERE id = $1", [
    TENANT_ID,
    JSON.stringify(value),
  ]);
  await clearTenantCache();
}

export async function closeWorkspace(): Promise<void> {
  await (app.locals.tenantCache as TenantCache).close();
  await closeDatabase();
}

export function cookieValue(response: Response, name: string): string | undefined {
  const raw = response.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    const [key, ...rest] = pair!.split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

export function setCookieHeader(response: Response, name: string): string | undefined {
  const raw = response.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    const [key, ...rest] = pair!.split("=");
    if (key === name) return `${name}=${rest.join("=")}`;
  }
  return undefined;
}
