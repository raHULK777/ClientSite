import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  ADDITION_ID,
  ADMIN_ID,
  app,
  BATH_ID,
  closeWorkspace,
  CLIENT_ID,
  HOST,
  insertOtherTenantProject,
  KITCHEN_ID,
  login,
  OTHER_PROJECT_ID,
  seedWorkspace,
  setTenantFeature,
} from "./support";

describe("projects, roles and client scoping", () => {
  beforeAll(async () => {
    await seedWorkspace();
  });

  beforeEach(async () => {
    await seedWorkspace();
  });

  afterAll(async () => {
    await closeWorkspace();
  });

  it("lists every project for an admin", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/projects").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.projects.length).toBe(3);
    expect(response.body.data.projects.map((project: { id: string }) => project.id)).toContain(KITCHEN_ID);
  });

  it("lists every project for field staff", async () => {
    const { agent } = await login("field@santos.test");
    const response = await agent.get("/api/v1/protected/projects").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.projects.length).toBe(3);
  });

  it("lists only the signed-in client's projects", async () => {
    const { agent, user } = await login("client@santos.test");
    const response = await agent.get("/api/v1/protected/projects").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.projects.length).toBe(2);
    expect(
      response.body.data.projects.every((project: { clientId: string }) => project.clientId === user.id),
    ).toBe(true);
  });

  it("gives a second client a disjoint project set", async () => {
    const { agent } = await login("client2@santos.test");
    const response = await agent.get("/api/v1/protected/projects").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.projects.length).toBe(1);
    expect(response.body.data.projects[0].id).toBe(ADDITION_ID);
  });

  it("filters the project list by status", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/projects?status=active").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.projects.length).toBe(2);
    expect(
      response.body.data.projects.every((project: { status: string }) => project.status === "active"),
    ).toBe(true);
  });

  it("rejects an unknown status filter", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/projects?status=sideways").set("Host", HOST);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Unknown project status.");
  });

  it("creates a project with admin rights and applies the defaults", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Alder Deck" });
    expect(response.status).toBe(201);
    expect(response.body.data.project.projectName).toBe("Alder Deck");
    expect(response.body.data.project.status).toBe("planning");
    expect(response.body.data.project.currentPhase).toBe("Permitting");
    expect(response.body.data.project.progressPercentage).toBe(0);
    expect(response.body.data.project.estimatedCost).toBe(0);
    expect(response.body.data.project.clientId).toBeNull();
  });

  it("creates a project linked to a client and returns the client name", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({
        projectName: "Cedar Garage",
        clientId: CLIENT_ID,
        status: "active",
        currentPhase: "Framing",
        progressPercentage: 20,
        estimatedCost: 42000,
      });
    expect(response.status).toBe(201);
    expect(response.body.data.project.clientId).toBe(CLIENT_ID);
    expect(response.body.data.project.clientName).toBe("Avery Chen");
    expect(response.body.data.project.clientEmail).toBe("client@santos.test");
    expect(response.body.data.project.estimatedCost).toBe(42000);
  });

  it("rejects a client id that is not a client in this workspace", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Bad client", clientId: ADMIN_ID });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Choose a client from this workspace.");
  });

  it("rejects a client id that is not a uuid", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Bad client", clientId: "not-a-uuid" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("bad_request");
  });

  it("rejects a project name that is too short", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "x" });
    expect(response.status).toBe(400);
  });

  it("rejects a negative contract value", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Negative", estimatedCost: -1 });
    expect(response.status).toBe(400);
  });

  it("rejects a progress value above one hundred", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Overrun", progressPercentage: 101 });
    expect(response.status).toBe(400);
  });

  it("rejects an unknown project status", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Weird status", status: "on-hold" });
    expect(response.status).toBe(400);
  });

  it("does not let field staff create a project", async () => {
    const { agent, csrf } = await login("field@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Field project" });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("forbidden");
  });

  it("does not let a client create a project", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Client project" });
    expect(response.status).toBe(403);
  });

  it("returns the project detail with its change orders and summary", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get(`/api/v1/protected/projects/${KITCHEN_ID}`).set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.project.projectName).toBe("Elm Street Kitchen");
    expect(response.body.data.project.clientName).toBe("Avery Chen");
    expect(response.body.data.changeOrders.length).toBe(2);
    expect(response.body.data.changeOrderSummary.pending).toBe(1);
    expect(response.body.data.changeOrderSummary.approved).toBe(1);
    expect(response.body.data.changeOrderSummary.pendingValue).toBe(2450);
  });

  it("returns 404 for a project that does not exist", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent
      .get("/api/v1/protected/projects/99999999-9999-4999-8999-999999999998")
      .set("Host", HOST);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Project not found.");
  });

  it("returns 400 for a malformed project identifier", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/projects/not-a-uuid").set("Host", HOST);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid resource identifier.");
  });

  it("hides another client's project behind a 404", async () => {
    const { agent } = await login("client@santos.test");
    const response = await agent.get(`/api/v1/protected/projects/${ADDITION_ID}`).set("Host", HOST);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Project not found.");
  });

  it("lets a client read their own project", async () => {
    const { agent } = await login("client@santos.test");
    const response = await agent.get(`/api/v1/protected/projects/${KITCHEN_ID}`).set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.project.id).toBe(KITCHEN_ID);
  });

  it("lets an admin update every project field", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/projects/${BATH_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({
        projectName: "Harbor Bath Renovation",
        status: "active",
        currentPhase: "Demolition",
        progressPercentage: 15,
        estimatedCost: 27500,
      });
    expect(response.status).toBe(200);
    expect(response.body.data.project.projectName).toBe("Harbor Bath Renovation");
    expect(response.body.data.project.status).toBe("active");
    expect(response.body.data.project.currentPhase).toBe("Demolition");
    expect(response.body.data.project.progressPercentage).toBe(15);
    expect(response.body.data.project.estimatedCost).toBe(27500);
  });

  it("lets field staff update the phase and the progress", async () => {
    const { agent, csrf } = await login("field@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/projects/${KITCHEN_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ currentPhase: "Framing complete", progressPercentage: 65 });
    expect(response.status).toBe(200);
    expect(response.body.data.project.currentPhase).toBe("Framing complete");
    expect(response.body.data.project.progressPercentage).toBe(65);
  });

  it("refuses field staff updates to any other field", async () => {
    const { agent, csrf } = await login("field@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/projects/${KITCHEN_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ estimatedCost: 1 });
    expect(response.status).toBe(400);
    expect(response.body.details[0].message).toBe("Field staff may only update phase and progress.");
  });

  it("refuses field staff updates to the project name", async () => {
    const { agent, csrf } = await login("field@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/projects/${KITCHEN_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "Renamed by field" });
    expect(response.status).toBe(400);
  });

  it("locks completed projects against field staff", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    await agent
      .patch(`/api/v1/protected/projects/${BATH_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ status: "completed" });

    const field = await login("field@santos.test");
    const response = await field.agent
      .patch(`/api/v1/protected/projects/${BATH_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", field.csrf)
      .send({ progressPercentage: 100 });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Completed projects are read-only.");
  });

  it("does not let a client update a project", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/projects/${KITCHEN_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ progressPercentage: 99 });
    expect(response.status).toBe(403);
  });

  it("rejects an empty update payload", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch(`/api/v1/protected/projects/${KITCHEN_ID}`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.details[0].message).toBe("Provide at least one field to update.");
  });

  it("lists the change orders of a project", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get(`/api/v1/protected/projects/${KITCHEN_ID}/change-orders`).set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.changeOrders.length).toBe(2);
  });

  it("does not let a client read another client's change orders", async () => {
    const { agent } = await login("client@santos.test");
    const response = await agent.get(`/api/v1/protected/projects/${ADDITION_ID}/change-orders`).set("Host", HOST);
    expect(response.status).toBe(404);
  });

  it("creates a pending change order as admin", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post(`/api/v1/protected/projects/${KITCHEN_ID}/change-orders`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ title: "Tile the backsplash", description: "Full height porcelain.", costImpact: 1750 });
    expect(response.status).toBe(201);
    expect(response.body.data.changeOrder.title).toBe("Tile the backsplash");
    expect(response.body.data.changeOrder.status).toBe("pending");
    expect(response.body.data.changeOrder.costImpact).toBe(1750);
    expect(response.body.data.changeOrder.projectId).toBe(KITCHEN_ID);
  });

  it("accepts a negative cost impact as a credit", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post(`/api/v1/protected/projects/${KITCHEN_ID}/change-orders`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ title: "Remove the second sink", costImpact: -450 });
    expect(response.status).toBe(201);
    expect(response.body.data.changeOrder.costImpact).toBe(-450);
  });

  it("rejects a change order with a blank title", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post(`/api/v1/protected/projects/${KITCHEN_ID}/change-orders`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ title: " ", costImpact: 100 });
    expect(response.status).toBe(400);
  });

  it("rejects a change order against a project that does not exist", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects/99999999-9999-4999-8999-999999999998/change-orders")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ title: "Ghost work", costImpact: 100 });
    expect(response.status).toBe(404);
  });

  it("does not let field staff create a change order", async () => {
    const { agent, csrf } = await login("field@santos.test");
    const response = await agent
      .post(`/api/v1/protected/projects/${KITCHEN_ID}/change-orders`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ title: "Field change", costImpact: 100 });
    expect(response.status).toBe(403);
  });

  it("refuses change orders when the feature is disabled", async () => {
    await setTenantFeature("changeOrders", false);
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post(`/api/v1/protected/projects/${KITCHEN_ID}/change-orders`)
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ title: "Blocked change", costImpact: 100 });
    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Change orders are not enabled for this workspace.");
  });

  it("keeps project rows tenant scoped in the database", async () => {
    await insertOtherTenantProject();
    const { agent } = await login("owner@santos.test");
    const response = await agent.get(`/api/v1/protected/projects/${OTHER_PROJECT_ID}`).set("Host", HOST);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Project not found.");

    const list = await agent.get("/api/v1/protected/projects").set("Host", HOST);
    expect(list.body.data.projects.map((project: { id: string }) => project.id)).not.toContain(OTHER_PROJECT_ID);
  });

  it("returns the same project for a direct read and a listed read", async () => {
    const { agent } = await login("owner@santos.test");
    const list = await agent.get("/api/v1/protected/projects").set("Host", HOST);
    const detail = await agent.get(`/api/v1/protected/projects/${KITCHEN_ID}`).set("Host", HOST);
    const listed = list.body.data.projects.find((project: { id: string }) => project.id === KITCHEN_ID);
    expect(detail.body.data.project.projectName).toBe(listed.projectName);
    expect(detail.body.data.project.estimatedCost).toBe(listed.estimatedCost);
  });

  it("does not expose the tenant id on the public project shape", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get(`/api/v1/protected/projects/${KITCHEN_ID}`).set("Host", HOST);
    expect(response.body.data.project.tenantId).toBeUndefined();
  });

  it("requires an authenticated session for every project route", async () => {
    for (const path of [
      "/api/v1/protected/projects",
      `/api/v1/protected/projects/${KITCHEN_ID}`,
      `/api/v1/protected/projects/${KITCHEN_ID}/change-orders`,
    ]) {
      const response = await request(app).get(path).set("Host", HOST);
      expect(response.status).toBe(401);
    }
  });
});
