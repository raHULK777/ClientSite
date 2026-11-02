import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { closeDatabase, getDatabase } from "../src/config/database";
import type { TenantCache } from "../src/modules/tenant/tenant.cache";
import { DEMO_PASSWORD, seed } from "../src/scripts/seed";

const HOST = "santos.localhost";
const UNKNOWN_HOST = "northwind.localhost";
const app = createApp();

async function login(email: string) {
  const agent = request.agent(app);
  const response = await agent
    .post("/api/v1/auth/login")
    .set("Host", HOST)
    .send({ email, password: DEMO_PASSWORD });

  expect(response.status).toBe(200);
  return { agent, csrf: response.body.data.csrfToken as string, user: response.body.data.user };
}

describe("ConstructOps API", () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await (app.locals.tenantCache as TenantCache).close();
    await closeDatabase();
  });

  it("resolves the tenant publicly without leaking pricing rates", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", HOST);

    expect(response.status).toBe(200);
    expect(response.body.data.tenant.companyName).toBe("Santos Construction");
    expect(response.body.data.tenant.palette.primary).toBe("#0B1220");
    expect(response.body.data.estimator.enabled).toBe(true);
    expect(JSON.stringify(response.body.data.estimator.options)).not.toContain("rate_per_sf");
  });

  it("returns 404 for an unknown workspace", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", UNKNOWN_HOST);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Workspace not found.");
  });

  it("prices a public estimate", async () => {
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .send({
        projectType: "kitchen",
        squareFeet: 120,
        materialTier: "premium",
        complexity: "standard",
        addons: ["electrical"],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.totalCents).toBeGreaterThan(0);
    expect(response.body.data.range.highCents).toBeGreaterThan(response.body.data.range.lowCents);
  });

  it("authenticates, enforces CSRF, and lists the tenant projects", async () => {
    const { agent, csrf } = await login("owner@santos.test");

    const me = await agent.get("/api/v1/auth/me").set("Host", HOST);
    expect(me.status).toBe(200);
    expect(me.body.data.user.role).toBe("admin");

    const rejected = await agent.post("/api/v1/protected/projects").set("Host", HOST).send({ projectName: "No token" });
    expect(rejected.status).toBe(403);

    const created = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Alder Deck", estimatedCost: 18000, status: "planning" });
    expect(created.status).toBe(201);
    expect(created.body.data.project.projectName).toBe("Alder Deck");

    const list = await agent.get("/api/v1/protected/projects").set("Host", HOST);
    expect(list.status).toBe(200);
    expect(list.body.data.projects.length).toBe(4);
  });

  it("rejects cross-tenant sessions and invalid identifiers", async () => {
    await getDatabase().query(
      `INSERT INTO tenants (id, company_name, subdomain, estimator_pricing_matrix)
       VALUES ($1, 'Other Builders', 'other', '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      ["cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
    );

    const { agent } = await login("owner@santos.test");
    const crossTenant = await agent.get("/api/v1/protected/projects").set("Host", "other.localhost");
    expect(crossTenant.status).toBe(403);

    const invalidId = await agent.get("/api/v1/protected/projects/not-a-uuid").set("Host", HOST);
    expect(invalidId.status).toBe(400);
  });

  it("limits field staff to phase and progress updates", async () => {
    const admin = await login("owner@santos.test");
    const projects = await admin.agent.get("/api/v1/protected/projects").set("Host", HOST);
    const kitchen = projects.body.data.projects.find((project: { projectName: string }) => project.projectName === "Elm Street Kitchen");

    const field = await login("field@santos.test");
    const forbidden = await field.agent
      .patch(`/api/v1/protected/projects/${kitchen.id}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", field.csrf)
      .send({ estimatedCost: 1 });
    expect(forbidden.status).toBe(400);

    const updated = await field.agent
      .patch(`/api/v1/protected/projects/${kitchen.id}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", field.csrf)
      .send({ progressPercentage: 71 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.project.progressPercentage).toBe(71);

    const create = await field.agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", field.csrf)
      .send({ projectName: "Field project" });
    expect(create.status).toBe(403);
  });

  it("shows clients only their projects and records a signed approval", async () => {
    const { agent, csrf, user } = await login("client@santos.test");

    const list = await agent.get("/api/v1/protected/projects").set("Host", HOST);
    expect(list.status).toBe(200);
    expect(list.body.data.projects).toHaveLength(2);
    expect(list.body.data.projects.every((project: { clientId: string }) => project.clientId === user.id)).toBe(true);

    const addition = await agent
      .get("/api/v1/protected/projects/88888888-8888-4888-8888-888888888888")
      .set("Host", HOST);
    expect(addition.status).toBe(404);

    const orders = await agent.get("/api/v1/protected/change-orders").set("Host", HOST);
    const pending = orders.body.data.changeOrders.find(
      (order: { title: string; status: string }) => order.title === "Island electrical upgrade" && order.status === "pending",
    );
    expect(pending).toBeTruthy();

    const approved = await agent
      .patch(`/api/v1/protected/change-orders/${pending.id}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen", consent: true });
    expect(approved.status).toBe(200);
    expect(approved.body.data.changeOrder.status).toBe("approved");
    expect(approved.body.data.changeOrder.signerName).toBe("Avery Chen");

    const duplicate = await agent
      .patch(`/api/v1/protected/change-orders/${pending.id}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen", consent: true });
    expect(duplicate.status).toBe(409);

    const signature = await getDatabase().query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM change_order_signatures WHERE change_order_id = $1",
      [pending.id],
    );
    expect(signature[0]?.count).toBe(1);

    const audit = await getDatabase().query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM audit_events WHERE entity_id = $1 AND action = 'change_order.approved'",
      [pending.id],
    );
    expect(audit[0]?.count).toBe(1);
  });

  it("does not let admins sign change orders", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/change-orders/99999999-9999-4999-8999-999999999999/approve")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Marisol Santos", consent: true });
    expect(response.status).toBe(403);
  });

  it("keeps signed evidence immutable", async () => {
    const db = getDatabase();
    const signature = await db.query<{ signature_hash: string; signer_name: string }>(
      "SELECT signature_hash, signer_name FROM change_order_signatures LIMIT 1",
    );
    expect(signature[0]?.signature_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(signature[0]?.signer_name).toBeTruthy();
  });

  it("updates branding, feature gates, and pricing without stale tenant cache", async () => {
    const { agent, csrf } = await login("owner@santos.test");

    const branding = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ companyName: "Santos Construction Co.", palette: { primary: "#112233" } });
    expect(branding.status).toBe(200);
    expect(branding.body.data.tenant.companyName).toBe("Santos Construction Co.");
    expect(branding.body.data.tenant.palette.primary).toBe("#112233");

    const publicTenant = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    expect(publicTenant.body.data.tenant.companyName).toBe("Santos Construction Co.");
    expect(publicTenant.body.data.tenant.palette.primary).toBe("#112233");
    expect(publicTenant.body.data.tenant.pricingMatrix).toBeUndefined();

    const invalid = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ palette: { primary: "navy" } });
    expect(invalid.status).toBe(400);

    const disabled = await agent
      .patch("/api/v1/protected/tenant/features")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ estimator: false });
    expect(disabled.status).toBe(200);

    const gated = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .send({
        projectType: "kitchen",
        squareFeet: 120,
        materialTier: "premium",
        complexity: "standard",
        addons: [],
      });
    expect(gated.status).toBe(503);

    await agent
      .patch("/api/v1/protected/tenant/features")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ estimator: true });

    const settings = await agent.get("/api/v1/protected/tenant").set("Host", HOST);
    const matrix = settings.body.data.tenant.pricingMatrix;
    expect(matrix.project_types.kitchen).toBeTruthy();

    const priced = await agent
      .put("/api/v1/protected/tenant/pricing")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ ...matrix, minimum_charge: 100_000 });
    expect(priced.status).toBe(200);

    const estimate = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .send({
        projectType: "kitchen",
        squareFeet: 120,
        materialTier: "premium",
        complexity: "standard",
        addons: [],
      });
    expect(estimate.body.data.totalCents).toBe(10_800_000);

    await agent
      .put("/api/v1/protected/tenant/pricing")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send(matrix);
    await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ companyName: "Santos Construction", palette: { primary: "#0B1220" } });

    const audit = await agent.get("/api/v1/protected/audit?limit=10").set("Host", HOST);
    expect(audit.status).toBe(200);
    expect(audit.body.data.events.length).toBeGreaterThan(0);
    expect(audit.body.data.pagination.total).toBeGreaterThan(0);

    const client = await login("client@santos.test");
    const denied = await client.agent.get("/api/v1/protected/audit").set("Host", HOST);
    expect(denied.status).toBe(403);
  });
});
