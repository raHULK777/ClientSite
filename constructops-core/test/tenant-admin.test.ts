import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { app, closeWorkspace, HOST, login, seedWorkspace } from "./support";

const MATRIX = {
  currency: "USD",
  minimum_charge: 4200,
  contingency_rate: 0.1,
  range_spread: 0.05,
  project_types: {
    kitchen: { label: "Kitchen remodel", base: 9000, rate_per_sf: 220, min_sf: 40, max_sf: 600 },
  },
  material_tiers: {
    standard: { label: "Standard", multiplier: 1 },
  },
  complexity: {
    standard: { label: "Standard", multiplier: 1 },
  },
  addons: {
    permit: { label: "Permit and inspection", flat: 900 },
  },
};

describe("tenant administration", () => {
  beforeAll(async () => {
    await seedWorkspace();
  });

  beforeEach(async () => {
    await seedWorkspace();
  });

  afterAll(async () => {
    await closeWorkspace();
  });

  it("returns the full tenant configuration to an admin", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/tenant").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.companyName).toBe("Santos Construction");
    expect(response.body.data.tenant.pricingMatrix).toBeTruthy();
    expect(response.body.data.tenant.pricingMatrix.project_types.kitchen).toBeTruthy();
  });

  it("does not let field staff read the tenant configuration", async () => {
    const { agent } = await login("field@santos.test");
    const response = await agent.get("/api/v1/protected/tenant").set("Host", HOST);
    expect(response.status).toBe(403);
  });

  it("does not let a client read the tenant configuration", async () => {
    const { agent } = await login("client@santos.test");
    const response = await agent.get("/api/v1/protected/tenant").set("Host", HOST);
    expect(response.status).toBe(403);
  });

  it("requires a session for the tenant configuration", async () => {
    const response = await request(app).get("/api/v1/protected/tenant").set("Host", HOST);
    expect(response.status).toBe(401);
  });

  it("updates the company name", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ companyName: "Santos Construction Co." });
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.companyName).toBe("Santos Construction Co.");
  });

  it("updates the primary and secondary palette", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ palette: { primary: "#112233", secondary: "#445566" } });
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.palette.primary).toBe("#112233");
    expect(response.body.data.tenant.palette.secondary).toBe("#445566");
  });

  it("invalidates the tenant cache so the public surface updates at once", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ companyName: "Santos Renovation Group" });
    const publicTenant = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    expect(publicTenant.body.data.tenant.companyName).toBe("Santos Renovation Group");
  });

  it("keeps the existing branding values when one field changes", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ palette: { primary: "#112233" } });
    expect(response.body.data.tenant.palette.secondary).toBe("#C2410C");
    expect(response.body.data.tenant.branding.palette.background).toBe("#F6F3ED");
    expect(response.body.data.tenant.branding.layout.sidebarPosition).toBe("left");
  });

  it("rejects a colour that is not a six digit hex", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ palette: { primary: "navy" } });
    expect(response.status).toBe(400);
    expect(response.body.details[0].message).toContain("six-digit hex");
  });

  it("rejects a three digit hex colour", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ palette: { primary: "#123" } });
    expect(response.status).toBe(400);
  });

  it("rejects a typography size that is not in pixels", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ typography: { baseSize: "1rem" } });
    expect(response.status).toBe(400);
    expect(response.body.details[0].message).toContain("pixel size");
  });

  it("accepts a valid typography size", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ typography: { baseSize: "18px", fontFamily: "Archivo" } });
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.branding.typography.baseSize).toBe("18px");
  });

  it("rejects an unknown border radius token", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ layout: { borderRadius: "12px" } });
    expect(response.status).toBe(400);
  });

  it("accepts the allowed layout tokens", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ layout: { navbarStyle: "solid", sidebarPosition: "right", borderRadius: "4px" } });
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.branding.layout.navbarStyle).toBe("solid");
    expect(response.body.data.tenant.branding.layout.sidebarPosition).toBe("right");
    expect(response.body.data.tenant.branding.layout.borderRadius).toBe("4px");
  });

  it("rejects an asset url that is not a path or an http url", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ assets: { faviconUrl: "javascript:alert(1)" } });
    expect(response.status).toBe(400);
  });

  it("accepts a relative asset path", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ assets: { faviconUrl: "/brand/mark.svg" } });
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.branding.assets.faviconUrl).toBe("/brand/mark.svg");
  });

  it("rejects an empty branding payload", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({});
    expect(response.status).toBe(400);
  });

  it("does not let field staff change the branding", async () => {
    const { agent, csrf } = await login("field@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ companyName: "Field Rebrand" });
    expect(response.status).toBe(403);
  });

  it("toggles each feature flag independently", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/features")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ estimator: false, clientPortal: true, changeOrders: false });
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.features.estimator).toBe(false);
    expect(response.body.data.tenant.features.clientPortal).toBe(true);
    expect(response.body.data.tenant.features.changeOrders).toBe(false);
  });

  it("keeps the flags that were not sent", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    await agent
      .patch("/api/v1/protected/tenant/features")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ estimator: false });
    const response = await agent
      .patch("/api/v1/protected/tenant/features")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ changeOrders: false });
    expect(response.body.data.tenant.features.estimator).toBe(false);
    expect(response.body.data.tenant.features.changeOrders).toBe(false);
    expect(response.body.data.tenant.features.clientPortal).toBe(true);
  });

  it("rejects a feature flag that is not a boolean", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/features")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ estimator: "off" });
    expect(response.status).toBe(400);
  });

  it("rejects an empty feature payload", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/features")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({});
    expect(response.status).toBe(400);
  });

  it("does not let a client change the features", async () => {
    const { agent, csrf } = await login("client@santos.test");
    const response = await agent
      .patch("/api/v1/protected/tenant/features")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ estimator: false });
    expect(response.status).toBe(403);
  });

  it("replaces the pricing matrix", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .put("/api/v1/protected/tenant/pricing")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send(MATRIX);
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.pricingMatrix.minimum_charge).toBe(4200);
    expect(response.body.data.tenant.pricingMatrix.project_types.kitchen.rate_per_sf).toBe(220);
  });

  it("applies the new pricing matrix to the public estimator", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    await agent
      .put("/api/v1/protected/tenant/pricing")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send(MATRIX);

    const estimate = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .send({
        projectType: "kitchen",
        squareFeet: 120,
        materialTier: "standard",
        complexity: "standard",
        addons: [],
      });
    expect(estimate.status).toBe(200);
    expect(estimate.body.data.totalCents).toBe(3_894_000);
  });

  it("rejects a pricing matrix with an out of range contingency", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .put("/api/v1/protected/tenant/pricing")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ ...MATRIX, contingency_rate: 0.9 });
    expect(response.status).toBe(400);
  });

  it("rejects a pricing matrix with a non positive square foot bound", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .put("/api/v1/protected/tenant/pricing")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({
        ...MATRIX,
        project_types: { kitchen: { ...MATRIX.project_types.kitchen, min_sf: 0 } },
      });
    expect(response.status).toBe(400);
  });

  it("rejects a pricing matrix that is missing its project types", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .put("/api/v1/protected/tenant/pricing")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ currency: "USD" });
    expect(response.status).toBe(400);
  });

  it("does not let field staff replace the pricing matrix", async () => {
    const { agent, csrf } = await login("field@santos.test");
    const response = await agent
      .put("/api/v1/protected/tenant/pricing")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send(MATRIX);
    expect(response.status).toBe(403);
  });

  it("records an audit event for every tenant change", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    await agent
      .patch("/api/v1/protected/tenant/branding")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ companyName: "Audited Rebrand" });
    await agent
      .patch("/api/v1/protected/tenant/features")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ estimator: false });
    await agent
      .put("/api/v1/protected/tenant/pricing")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send(MATRIX);

    const audit = await agent.get("/api/v1/protected/audit?limit=100").set("Host", HOST);
    const actions = audit.body.data.events.map((event: { action: string }) => event.action);
    expect(actions).toContain("tenant.branding_updated");
    expect(actions).toContain("tenant.features_updated");
    expect(actions).toContain("tenant.pricing_updated");
  });
});
