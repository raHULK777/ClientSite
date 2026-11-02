import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "../src/config/database";
import { app, closeWorkspace, CO_ELECTRICAL_ID, HOST, insertOtherTenant, KITCHEN_ID, login, seedWorkspace, TENANT_ID } from "./support";

describe("audit trail", () => {
  beforeAll(async () => {
    await seedWorkspace();
  });

  beforeEach(async () => {
    await seedWorkspace();
  });

  afterAll(async () => {
    await closeWorkspace();
  });

  it("returns the audit events for an admin", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/audit").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.events)).toBe(true);
    expect(response.body.data.pagination.total).toBeGreaterThan(0);
  });

  it("orders the events newest first", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/audit?limit=50").set("Host", HOST);
    const timestamps = response.body.data.events.map((event: { createdAt: string }) => new Date(event.createdAt).getTime());
    for (let index = 1; index < timestamps.length; index += 1) {
      expect(timestamps[index - 1]).toBeGreaterThanOrEqual(timestamps[index]!);
    }
  });

  it("records the sign in event", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/audit?limit=100").set("Host", HOST);
    expect(response.body.data.events.some((event: { action: string }) => event.action === "auth.login")).toBe(true);
  });

  it("records the sign out event", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    await agent.post("/api/v1/auth/logout").set("Host", HOST).set("X-CSRF-Token", csrf);
    const admin = await login("owner@santos.test");
    const response = await admin.agent.get("/api/v1/protected/audit?limit=100").set("Host", HOST);
    expect(response.body.data.events.some((event: { action: string }) => event.action === "auth.logout")).toBe(true);
  });

  it("records the project creation event with the project name", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const created = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Audited Build" });
    const projectId = created.body.data.project.id;

    const response = await agent.get("/api/v1/protected/audit?limit=100").set("Host", HOST);
    const event = response.body.data.events.find(
      (item: { action: string; entityId: string }) =>
        item.action === "project.created" && item.entityId === projectId,
    );
    expect(event).toBeTruthy();
    expect(event.metadata.projectName).toBe("Audited Build");
  });

  it("records the project update event with the changed fields", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    await agent
      .patch(`/api/v1/protected/projects/${KITCHEN_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ progressPercentage: 70, currentPhase: "Tile" });
    const response = await agent.get("/api/v1/protected/audit?limit=100").set("Host", HOST);
    const event = response.body.data.events.find(
      (item: { action: string; entityId: string }) =>
        item.action === "project.updated" && item.entityId === KITCHEN_ID,
    );
    expect(event).toBeTruthy();
    expect(event.metadata.fields.sort()).toEqual(["currentPhase", "progressPercentage"]);
  });

  it("records the change order creation event", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const created = await agent
      .post(`/api/v1/protected/projects/${KITCHEN_ID}/change-orders`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ title: "Audited change", costImpact: 300 });
    const orderId = created.body.data.changeOrder.id;

    const response = await agent.get("/api/v1/protected/audit?limit=100").set("Host", HOST);
    const event = response.body.data.events.find(
      (item: { action: string; entityId: string }) =>
        item.action === "change_order.created" && item.entityId === orderId,
    );
    expect(event).toBeTruthy();
    expect(event.metadata.costImpact).toBe(300);
  });

  it("records the approval with the signer name and the signature hash", async () => {
    const { agent, csrf } = await login("client@santos.test");
    await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen", consent: true });

    const admin = await login("owner@santos.test");
    const response = await admin.agent.get("/api/v1/protected/audit?limit=100").set("Host", HOST);
    const event = response.body.data.events.find(
      (item: { action: string; entityId: string }) =>
        item.action === "change_order.approved" && item.entityId === CO_ELECTRICAL_ID,
    );
    expect(event).toBeTruthy();
    expect(event.metadata.signerName).toBe("Avery Chen");
    expect(event.metadata.signatureHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("paginates the audit list", async () => {
    const { agent } = await login("owner@santos.test");
    const first = await agent.get("/api/v1/protected/audit?limit=2&offset=0").set("Host", HOST);
    const second = await agent.get("/api/v1/protected/audit?limit=2&offset=2").set("Host", HOST);
    expect(first.body.data.events.length).toBeLessThanOrEqual(2);
    expect(first.body.data.pagination.limit).toBe(2);
    expect(first.body.data.pagination.offset).toBe(0);
    expect(second.body.data.pagination.offset).toBe(2);
    expect(first.body.data.events[0].id).not.toBe(second.body.data.events[0]?.id);
  });

  it("rejects a limit above one hundred", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/audit?limit=500").set("Host", HOST);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Check the query parameters.");
  });

  it("rejects a limit below one", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/audit?limit=0").set("Host", HOST);
    expect(response.status).toBe(400);
  });

  it("rejects a negative offset", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/audit?offset=-1").set("Host", HOST);
    expect(response.status).toBe(400);
  });

  it("does not let field staff read the audit trail", async () => {
    const { agent } = await login("field@santos.test");
    const response = await agent.get("/api/v1/protected/audit").set("Host", HOST);
    expect(response.status).toBe(403);
  });

  it("does not let a client read the audit trail", async () => {
    const { agent } = await login("client@santos.test");
    const response = await agent.get("/api/v1/protected/audit").set("Host", HOST);
    expect(response.status).toBe(403);
  });

  it("requires a session for the audit trail", async () => {
    const response = await request(app).get("/api/v1/protected/audit").set("Host", HOST);
    expect(response.status).toBe(401);
  });

  it("never returns audit events from another tenant", async () => {
    await insertOtherTenant();
    await getDatabase().query(
      `INSERT INTO audit_events (id, tenant_id, actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', NULL, 'other.tenant.secret', 'tenant', NULL, '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      ["abababab-abab-4bab-8bab-abababababab"],
    );
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/audit?limit=100").set("Host", HOST);
    expect(response.body.data.events.every((event: { action: string }) => event.action !== "other.tenant.secret")).toBe(
      true,
    );
    expect(response.body.data.events.every((event: { id: string }) => event.id !== "abababab-abab-4bab-8bab-abababababab")).toBe(
      true,
    );
  });

  it("returns the tenant id on the event rows it belongs to", async () => {
    const rows = await getDatabase().query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM audit_events WHERE tenant_id = $1",
      [TENANT_ID],
    );
    expect(rows[0]!.count).toBeGreaterThan(0);
  });
});
