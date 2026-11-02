import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getDatabase } from "../src/config/database";
import {
  ADDITION_ID,
  closeWorkspace,
  CLIENT_ID,
  HOST,
  insertOtherTenantProject,
  KITCHEN_ID,
  login,
  OTHER_HOST,
  OTHER_PROJECT_ID,
  OTHER_TENANT_ID,
  seedWorkspace,
} from "./support";

const PLAN = ["Permitting", "Foundation", "Framing", "Finishes"];

async function createProjectWithStages(
  plan: string[] | null = PLAN,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; stages: { id: string; name: string; status: string; order: number }[] }> {
  const { agent, csrf } = await login("owner@santos.test");
  const response = await agent
    .post("/api/v1/protected/projects")
    .set("Host", HOST)
    .set("X-CSRF-Token", csrf)
    .send({
      projectName: "Stage Test Job",
      ...(plan && plan.length ? { stages: plan } : {}),
      ...overrides,
    });
  expect(response.status).toBe(201);
  return { id: response.body.data.project.id, stages: response.body.data.stages ?? [] };
}

describe("project stages, progress and comments", () => {
  beforeAll(async () => {
    await seedWorkspace();
  });

  beforeEach(async () => {
    await seedWorkspace();
    await insertOtherTenantProject();
  });

  afterAll(async () => {
    await closeWorkspace();
  });

  describe("plan creation", () => {
    it("creates a project without stages when none are supplied", async () => {
      const { agent, csrf } = await login("owner@santos.test");
      const response = await agent
        .post("/api/v1/protected/projects")
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ projectName: "No Plan Job", currentPhase: "Framing", progressPercentage: 40 });

      expect(response.status).toBe(201);
      expect(response.body.data.stages).toEqual([]);
      expect(response.body.data.project.currentPhase).toBe("Framing");
      expect(response.body.data.project.progressPercentage).toBe(40);
    });

    it("seeds the plan in order and activates the first stage", async () => {
      const { id, stages } = await createProjectWithStages();
      expect(stages.map((stage) => stage.name)).toEqual(PLAN);
      expect(stages.map((stage) => stage.order)).toEqual([0, 1, 2, 3]);
      expect(stages[0]!.status).toBe("active");
      expect(stages.slice(1).every((stage) => stage.status === "pending")).toBe(true);
      expect(id).toBeTruthy();
    });

    it("derives current phase and zero progress from the new plan", async () => {
      const { id } = await createProjectWithStages();
      const { agent } = await login("owner@santos.test");
      const response = await agent.get(`/api/v1/protected/projects/${id}`).set("Host", HOST);
      expect(response.body.data.project.currentPhase).toBe("Permitting");
      expect(response.body.data.project.progressPercentage).toBe(0);
    });

    it("rejects a plan with more than thirty stages", async () => {
      const { agent, csrf } = await login("owner@santos.test");
      const response = await agent
        .post("/api/v1/protected/projects")
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ projectName: "Too Many", stages: Array.from({ length: 31 }, (_, i) => `S${i}`) });
      expect(response.status).toBe(400);
    });

    it("rejects a blank stage name", async () => {
      const { agent, csrf } = await login("owner@santos.test");
      const response = await agent
        .post("/api/v1/protected/projects")
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ projectName: "Blank Stage", stages: ["Permitting", "   "] });
      expect(response.status).toBe(400);
    });
  });

  describe("reading the plan", () => {
    it("returns stages for an admin", async () => {
      const { id } = await createProjectWithStages();
      const { agent } = await login("owner@santos.test");
      const response = await agent.get(`/api/v1/protected/projects/${id}/stages`).set("Host", HOST);
      expect(response.status).toBe(200);
      expect(response.body.data.stages).toHaveLength(4);
      expect(response.body.data.stageUpdates).toEqual([]);
    });

    it("returns stages for field staff", async () => {
      const { id } = await createProjectWithStages();
      const { agent } = await login("field@santos.test");
      const response = await agent.get(`/api/v1/protected/projects/${id}/stages`).set("Host", HOST);
      expect(response.status).toBe(200);
      expect(response.body.data.stages).toHaveLength(4);
    });

    it("returns an empty plan for a project without stages", async () => {
      const { agent } = await login("owner@santos.test");
      const response = await agent
        .get(`/api/v1/protected/projects/${KITCHEN_ID}/stages`)
        .set("Host", HOST);
      expect(response.status).toBe(200);
      expect(response.body.data.stages).toEqual([]);
    });

    it("hides another tenant's project stages", async () => {
      const { agent } = await login("owner@santos.test");
      const response = await agent
        .get(`/api/v1/protected/projects/${OTHER_PROJECT_ID}/stages`)
        .set("Host", HOST);
      expect(response.status).toBe(404);
    });

    it("rejects a non-uuid project id", async () => {
      const { agent } = await login("owner@santos.test");
      const response = await agent
        .get("/api/v1/protected/projects/not-a-uuid/stages")
        .set("Host", HOST);
      expect(response.status).toBe(400);
    });
  });

  describe("replacing the plan", () => {
    it("renames positions and drops trailing stages", async () => {
      const { id } = await createProjectWithStages();
      const { agent, csrf } = await login("owner@santos.test");
      const response = await agent
        .put(`/api/v1/protected/projects/${id}/stages`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ stages: ["Pre-construction", "Rough-in"] });

      expect(response.status).toBe(200);
      expect(response.body.data.stages.map((stage: { name: string }) => stage.name)).toEqual([
        "Pre-construction",
        "Rough-in",
      ]);
    });

    it("preserves completion state by position", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent, csrf } = await login("field@santos.test");
      await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed", comment: "Permit issued." });

      const admin = await login("owner@santos.test");
      const response = await admin.agent
        .put(`/api/v1/protected/projects/${id}/stages`)
        .set("Host", HOST)
        .set("X-CSRF-Token", admin.csrf)
        .send({ stages: ["Permits approved", "Foundation", "Framing", "Finishes"] });

      expect(response.status).toBe(200);
      expect(response.body.data.stages[0].name).toBe("Permits approved");
      expect(response.body.data.stages[0].status).toBe("completed");
      expect(response.body.data.project.progressPercentage).toBe(25);
    });

    it("refuses a client", async () => {
      const { id } = await createProjectWithStages(undefined, { clientId: CLIENT_ID });
      const { agent, csrf } = await login("client@santos.test");
      const response = await agent
        .put(`/api/v1/protected/projects/${id}/stages`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ stages: ["Only"] });
      expect(response.status).toBe(403);
    });

    it("refuses field staff", async () => {
      const { id } = await createProjectWithStages();
      const { agent, csrf } = await login("field@santos.test");
      const response = await agent
        .put(`/api/v1/protected/projects/${id}/stages`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ stages: ["Only"] });
      expect(response.status).toBe(403);
    });

    it("rejects an empty plan", async () => {
      const { id } = await createProjectWithStages();
      const { agent, csrf } = await login("owner@santos.test");
      const response = await agent
        .put(`/api/v1/protected/projects/${id}/stages`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ stages: [] });
      expect(response.status).toBe(400);
    });
  });

  describe("stage transitions", () => {
    it("moves progress and phase when field staff complete a stage with a comment", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent, csrf } = await login("field@santos.test");
      const response = await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed", comment: "Permit issued, foundation stakeout booked." });

      expect(response.status).toBe(200);
      expect(response.body.data.update.comment).toBe("Permit issued, foundation stakeout booked.");
      expect(response.body.data.update.actorRole).toBe("field_staff");
      expect(response.body.data.update.actorName).toBe("Danny Ortiz");
      expect(response.body.data.update.progressPercentage).toBe(25);
      expect(response.body.data.project.progressPercentage).toBe(25);
      expect(response.body.data.project.currentPhase).toBe("Foundation");
      expect(response.body.data.stages[0].completedAt).not.toBeNull();
      expect(response.body.data.stages[0].startedAt).not.toBeNull();
    });

    it("reaches 100 and keeps the last phase when every stage is complete", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent, csrf } = await login("field@santos.test");
      let last = await agent.get(`/api/v1/protected/projects/${id}/stages`).set("Host", HOST);

      for (const stage of stages) {
        last = await agent
          .post(`/api/v1/protected/projects/${id}/stages/${stage.id}/status`)
          .set("Host", HOST)
          .set("X-CSRF-Token", csrf)
          .send({ status: "completed", comment: `Finished ${stage.name}.` });
        expect(last.status).toBe(200);
      }

      expect(last.body.data.project.progressPercentage).toBe(100);
      expect(last.body.data.project.currentPhase).toBe("Finishes");
    });

    it("reopens a stage and resets its timestamps", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent, csrf } = await login("field@santos.test");
      await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed", comment: "Done." });

      const reopened = await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "pending", comment: "Inspection failed, reopening." });

      expect(reopened.status).toBe(200);
      expect(reopened.body.data.stages[0].status).toBe("pending");
      expect(reopened.body.data.stages[0].completedAt).toBeNull();
      expect(reopened.body.data.stages[0].startedAt).toBeNull();
      expect(reopened.body.data.project.progressPercentage).toBe(0);
    });

    it("records every transition in the update trail, newest first", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent, csrf } = await login("field@santos.test");
      await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed", comment: "First note." });
      await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[1]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "active", comment: "Second note." });

      const response = await agent.get(`/api/v1/protected/projects/${id}/stages`).set("Host", HOST);
      const trail = response.body.data.stageUpdates;
      expect(trail).toHaveLength(2);
      expect(trail[0].comment).toBe("Second note.");
      expect(trail[1].comment).toBe("First note.");
    });

    it("keeps the stage name on the trail after the plan is renamed", async () => {
      const { id, stages } = await createProjectWithStages();
      const field = await login("field@santos.test");
      await field.agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", field.csrf)
        .send({ status: "completed", comment: "Permit issued." });

      const admin = await login("owner@santos.test");
      await admin.agent
        .put(`/api/v1/protected/projects/${id}/stages`)
        .set("Host", HOST)
        .set("X-CSRF-Token", admin.csrf)
        .send({ stages: ["Renamed stage", "Foundation", "Framing", "Finishes"] });

      const response = await admin.agent
        .get(`/api/v1/protected/projects/${id}/stages`)
        .set("Host", HOST);
      expect(response.body.data.stageUpdates[0].stageName).toBe("Permitting");
    });

    it("requires a comment on every transition", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent, csrf } = await login("field@santos.test");
      const response = await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed" });
      expect(response.status).toBe(400);
    });

    it("rejects an unknown status value", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent, csrf } = await login("field@santos.test");
      const response = await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "blocked", comment: "Waiting on delivery." });
      expect(response.status).toBe(400);
    });

    it("returns 404 for a stage that belongs to another project", async () => {
      const first = await createProjectWithStages();
      const second = await createProjectWithStages();
      const { agent, csrf } = await login("field@santos.test");
      const response = await agent
        .post(`/api/v1/protected/projects/${second.id}/stages/${first.stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed", comment: "Wrong project." });
      expect(response.status).toBe(404);
    });

    it("rejects a non-uuid stage id", async () => {
      const { id } = await createProjectWithStages();
      const { agent, csrf } = await login("field@santos.test");
      const response = await agent
        .post(`/api/v1/protected/projects/${id}/stages/nope/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed", comment: "Bad id." });
      expect(response.status).toBe(400);
    });

    it("lets an admin transition a stage", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent, csrf } = await login("owner@santos.test");
      const response = await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed", comment: "Admin closed it out." });
      expect(response.status).toBe(200);
      expect(response.body.data.update.actorRole).toBe("admin");
    });

    it("refuses a client", async () => {
      const { id, stages } = await createProjectWithStages(undefined, { clientId: CLIENT_ID });
      const { agent, csrf } = await login("client@santos.test");
      const response = await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed", comment: "Client cannot do this." });
      expect(response.status).toBe(403);
    });

    it("keeps completed projects read-only for field staff", async () => {
      const { id, stages } = await createProjectWithStages(undefined, { status: "completed" });
      const { agent, csrf } = await login("field@santos.test");
      const response = await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed", comment: "Should be blocked." });
      expect(response.status).toBe(403);
    });

    it("requires csrf on transition", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent } = await login("field@santos.test");
      const response = await agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .send({ status: "completed", comment: "No token." });
      expect(response.status).toBe(403);
    });

    it("hides another tenant's stage", async () => {
      const { id } = await createProjectWithStages();
      const { agent, csrf } = await login("owner@santos.test");
      const response = await agent
        .post(`/api/v1/protected/projects/${OTHER_PROJECT_ID}/stages/${id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ status: "completed", comment: "Cross tenant." });
      expect(response.status).toBe(404);
    });
  });

  describe("client visibility", () => {
    it("lets the owning client read the plan and the trail", async () => {
      const { id, stages } = await createProjectWithStages(undefined, { clientId: CLIENT_ID });
      const field = await login("field@santos.test");
      await field.agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", field.csrf)
        .send({ status: "completed", comment: "Permits approved by the city." });

      const { agent } = await login("client@santos.test");
      const response = await agent.get(`/api/v1/protected/projects/${id}/stages`).set("Host", HOST);
      expect(response.status).toBe(200);
      expect(response.body.data.stages).toHaveLength(4);
      expect(response.body.data.stageUpdates[0].comment).toBe("Permits approved by the city.");
    });

    it("hides another client's project plan", async () => {
      const { id } = await createProjectWithStages(undefined, { clientId: CLIENT_ID });
      const { agent } = await login("client2@santos.test");
      const response = await agent.get(`/api/v1/protected/projects/${id}/stages`).set("Host", HOST);
      expect(response.status).toBe(404);
    });

    it("exposes stages and the trail on the project detail payload", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent } = await login("owner@santos.test");
      const field = await login("field@santos.test");
      await field.agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", field.csrf)
        .send({ status: "completed", comment: "Detail payload note." });

      const response = await agent.get(`/api/v1/protected/projects/${id}`).set("Host", HOST);
      expect(response.status).toBe(200);
      expect(response.body.data.stages).toHaveLength(4);
      expect(response.body.data.stageUpdates[0].comment).toBe("Detail payload note.");
    });

    it("leaves seeded projects with an empty plan and their original progress", async () => {
      const { agent } = await login("owner@santos.test");
      const response = await agent
        .get(`/api/v1/protected/projects/${ADDITION_ID}`)
        .set("Host", HOST);
      expect(response.body.data.stages).toEqual([]);
      expect(response.body.data.stageUpdates).toEqual([]);
      expect(response.body.data.project.progressPercentage).toBe(35);
    });
  });

  describe("audit trail", () => {
    it("records plan replacement and stage transitions", async () => {
      const { id, stages } = await createProjectWithStages();
      const { agent, csrf } = await login("owner@santos.test");
      await agent
        .put(`/api/v1/protected/projects/${id}/stages`)
        .set("Host", HOST)
        .set("X-CSRF-Token", csrf)
        .send({ stages: ["Only stage"] });
      const field = await login("field@santos.test");
      await field.agent
        .post(`/api/v1/protected/projects/${id}/stages/${stages[0]!.id}/status`)
        .set("Host", HOST)
        .set("X-CSRF-Token", field.csrf)
        .send({ status: "completed", comment: "Audited." });

      const audit = await agent.get("/api/v1/protected/audit?limit=20").set("Host", HOST);
      const actions = audit.body.data.events
        .filter((event: { entityId: string }) => event.entityId === id)
        .map((event: { action: string }) => event.action);
      expect(actions).toContain("project.stages_replaced");
      expect(actions).toContain("project.stage_updated");
    });

    it("scopes stage audit events to the resolved tenant", async () => {
      const { id } = await createProjectWithStages();
      await getDatabase().query(
        `INSERT INTO audit_events (tenant_id, actor_id, action, entity_type, entity_id, metadata)
         VALUES ($1, NULL, 'other.tenant.stage', 'project', NULL, '{}'::jsonb)`,
        [OTHER_TENANT_ID],
      );

      const { agent } = await login("owner@santos.test");
      const audit = await agent.get("/api/v1/protected/audit?limit=100").set("Host", HOST);
      const actions = audit.body.data.events.map((event: { action: string }) => event.action);

      expect(actions).toContain("project.stages_replaced");
      expect(actions).not.toContain("other.tenant.stage");
      expect(
        audit.body.data.events.some((event: { entityId: string }) => event.entityId === id),
      ).toBe(true);
    });
  });

  describe("tenant isolation", () => {
    it("refuses a session acting against another tenant's workspace", async () => {
      const { id } = await createProjectWithStages();
      const { agent, csrf } = await login("owner@santos.test");
      const response = await agent
        .put(`/api/v1/protected/projects/${id}/stages`)
        .set("Host", OTHER_HOST)
        .set("X-CSRF-Token", csrf)
        .send({ stages: ["Hijacked"] });
      expect(response.status).toBe(403);

      const verify = await agent.get(`/api/v1/protected/projects/${id}/stages`).set("Host", HOST);
      expect(verify.body.data.stages.map((stage: { name: string }) => stage.name)).toEqual(PLAN);
    });
  });
});
