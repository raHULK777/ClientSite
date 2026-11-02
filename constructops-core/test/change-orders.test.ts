import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "../src/config/database";
import {
  ADDITION_ID,
  app,
  closeWorkspace,
  CO_BEAM_ID,
  CO_ELECTRICAL_ID,
  CO_HARDWARE_ID,
  CONSENT_TEXT,
  HOST,
  KITCHEN_ID,
  login,
  seedWorkspace,
  setTenantFeature,
} from "./support";

async function countAudit(entityId: string, action: string): Promise<number> {
  const rows = await getDatabase().query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM audit_events WHERE entity_id = $1 AND action = $2",
    [entityId, action],
  );
  return rows[0]!.count;
}

describe("change order lifecycle", () => {
  beforeAll(async () => {
    await seedWorkspace();
  });

  beforeEach(async () => {
    await seedWorkspace();
  });

  afterAll(async () => {
    await closeWorkspace();
  });

  it("lists every change order for an admin", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/change-orders").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrders.length).toBe(3);
  });

  it("lists every change order for field staff", async () => {
    const { agent } = await login("field@santos.test");
    const response = await agent.get("/api/v1/protected/change-orders").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrders.length).toBe(3);
  });

  it("lists only the signed-in client's change orders", async () => {
    const { agent } = await login("client@santos.test");
    const response = await agent.get("/api/v1/protected/change-orders").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrders.length).toBe(2);
    expect(
      response.body.data.changeOrders.every((order: { projectId: string }) => order.projectId === KITCHEN_ID),
    ).toBe(true);
  });

  it("gives a second client only their own change order", async () => {
    const { agent } = await login("client2@santos.test");
    const response = await agent.get("/api/v1/protected/change-orders").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrders.length).toBe(1);
    expect(response.body.data.changeOrders[0].id).toBe(CO_BEAM_ID);
  });

  it("edits a pending change order as admin", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ title: "Island electrical upgrade and vent", costImpact: 2650 });
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrder.title).toBe("Island electrical upgrade and vent");
    expect(response.body.data.changeOrder.costImpact).toBe(2650);
    expect(response.body.data.changeOrder.status).toBe("pending");
  });

  it("clears the description when it is set to null", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ description: null });
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrder.description).toBeNull();
  });

  it("refuses to edit an approved change order", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_HARDWARE_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ costImpact: 999 });
    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Only pending change orders can be edited.");
  });

  it("refuses to edit a rejected change order", async () => {
    const { agent, csrf } = await login("client@santos.test");
    await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/reject`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ reason: "Out of budget" });

    const admin = await login("owner@santos.test");
    const response = await admin.agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", admin.csrf)
      .send({ costImpact: 999 });
    expect(response.status).toBe(409);
  });

  it("does not let field staff edit a change order", async () => {
    const { agent, csrf } = await login("field@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ costImpact: 999 });
    expect(response.status).toBe(403);
  });

  it("does not let a client edit a change order", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ costImpact: 999 });
    expect(response.status).toBe(403);
  });

  it("rejects an empty edit payload", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({});
    expect(response.status).toBe(400);
  });

  it("rejects a change order id that is not a uuid", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/change-orders/not-a-uuid")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ costImpact: 10 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid resource identifier.");
  });

  it("approves a pending change order for the owning client", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .set("User-Agent", "ConstructOpsTest/1.0")
      .send({ signerName: "Avery Chen", consent: true });
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrder.status).toBe("approved");
    expect(response.body.data.changeOrder.signerName).toBe("Avery Chen");
    expect(response.body.data.changeOrder.signedAt).toBeTruthy();
    expect(response.body.data.changeOrder.ipAddress).toBeTruthy();
  });

  it("persists the signed evidence", async () => {
    const { agent, csrf } = await login("client@santos.test");
    await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .set("User-Agent", "ConstructOpsTest/1.0")
      .send({ signerName: "Avery Chen", consent: true });

    const rows = await getDatabase().query<{
      signer_name: string;
      consent_text: string;
      signature_hash: string;
      ip_address: string | null;
      user_agent: string | null;
      signed_at: string;
    }>(
      `SELECT signer_name, consent_text, signature_hash, ip_address, user_agent, signed_at
       FROM change_order_signatures WHERE change_order_id = $1`,
      [CO_ELECTRICAL_ID],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.signer_name).toBe("Avery Chen");
    expect(rows[0]!.consent_text).toBe(CONSENT_TEXT);
    expect(rows[0]!.signature_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rows[0]!.ip_address).toBeTruthy();
    expect(rows[0]!.user_agent).toBe("ConstructOpsTest/1.0");
    expect(rows[0]!.signed_at).toBeTruthy();
  });

  it("writes an audit event for the approval", async () => {
    const before = await countAudit(CO_ELECTRICAL_ID, "change_order.approved");
    const { agent, csrf } = await login("client@santos.test");
    await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen", consent: true });

    const after = await countAudit(CO_ELECTRICAL_ID, "change_order.approved");
    expect(after - before).toBe(1);
  });

  it("refuses a second approval of the same change order", async () => {
    const { agent, csrf } = await login("client@santos.test");
    await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen", consent: true });
    const second = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen", consent: true });
    expect(second.status).toBe(409);
    expect(second.body.error).toBe("This change order is no longer awaiting approval.");

    const signatures = await getDatabase().query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM change_order_signatures WHERE change_order_id = $1",
      [CO_ELECTRICAL_ID],
    );
    expect(signatures[0]!.count).toBe(1);
  });

  it("refuses to approve an already approved change order", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_HARDWARE_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen", consent: true });
    expect(response.status).toBe(409);
  });

  it("hides another client's change order behind a 404 on approval", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_BEAM_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen", consent: true });
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("not_found");
  });

  it("does not let an admin sign a change order", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Marisol Santos", consent: true });
    expect(response.status).toBe(403);
  });

  it("does not let field staff sign a change order", async () => {
    const { agent, csrf } = await login("field@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Danny Ortiz", consent: true });
    expect(response.status).toBe(403);
  });

  it("requires the consent flag to be exactly true", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen", consent: false });
    expect(response.status).toBe(400);
  });

  it("requires a consent flag at all", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen" });
    expect(response.status).toBe(400);
  });

  it("requires a signer name of at least two characters", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "A", consent: true });
    expect(response.status).toBe(400);
  });

  it("trims the signer name", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "  Avery Chen  ", consent: true });
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrder.signerName).toBe("Avery Chen");
  });

  it("refuses approval when the change order feature is disabled", async () => {
    await setTenantFeature("changeOrders", false);
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ signerName: "Avery Chen", consent: true });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("This feature is not enabled for this workspace.");
  });

  it("rejects a pending change order for the owning client", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/reject`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ reason: "That is more than we agreed." });
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrder.status).toBe("rejected");
  });

  it("rejects a pending change order without a reason", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/reject`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({});
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrder.status).toBe("rejected");
  });

  it("writes an audit event for the rejection", async () => {
    const before = await countAudit(CO_ELECTRICAL_ID, "change_order.rejected");
    const { agent, csrf } = await login("client@santos.test");
    await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/reject`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ reason: "Out of budget" });
    const after = await countAudit(CO_ELECTRICAL_ID, "change_order.rejected");
    expect(after - before).toBe(1);
  });

  it("refuses a second rejection", async () => {
    const { agent, csrf } = await login("client@santos.test");
    await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/reject`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({});
    const second = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/reject`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({});
    expect(second.status).toBe(409);
  });

  it("hides another client's change order behind a 404 on rejection", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_BEAM_ID}/reject`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({});
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("not_found");
  });

  it("does not let an admin reject a change order", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/reject`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({});
    expect(response.status).toBe(403);
  });

  it("rejects a non text rejection reason", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/reject`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ reason: 42 });
    expect(response.status).toBe(400);
  });

  it("refuses rejection when the change order feature is disabled", async () => {
    await setTenantFeature("changeOrders", false);
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/reject`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({});
    expect(response.status).toBe(403);
  });

  it("never signs a change order without a session", async () => {
    const response = await request(app)
      .patch(`/api/v1/protected/change-orders/${CO_ELECTRICAL_ID}/approve`)
      .set("Host", HOST)
      .send({ signerName: "Avery Chen", consent: true });
    expect(response.status).toBe(401);
  });

  it("keeps the signed seed record immutable", async () => {
    const rows = await getDatabase().query<{ signature_hash: string; signer_name: string }>(
      "SELECT signature_hash, signer_name FROM change_order_signatures WHERE change_order_id = $1",
      [CO_HARDWARE_ID],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.signature_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rows[0]!.signer_name).toBe("Avery Chen");
  });

  it("exposes the sealed record on the change order after approval", async () => {
    const { agent } = await login("client@santos.test");
    const response = await agent.get("/api/v1/protected/change-orders").set("Host", HOST);
    const approved = response.body.data.changeOrders.find(
      (order: { id: string }) => order.id === CO_HARDWARE_ID,
    );
    expect(approved.status).toBe("approved");
    expect(approved.signerName).toBe("Avery Chen");
    expect(approved.signedAt).toBeTruthy();
    expect(approved.ipAddress).toBe("203.0.113.10");
  });

  it("scopes the change order list to the tenant", async () => {
    const { agent } = await login("client2@santos.test");
    const response = await agent.get("/api/v1/protected/change-orders").set("Host", HOST);
    expect(
      response.body.data.changeOrders.every((order: { projectId: string }) => order.projectId === ADDITION_ID),
    ).toBe(true);
  });
});
