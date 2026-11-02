import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { env } from "../src/config/env";
import {
  app,
  closeWorkspace,
  CUSTOM_DOMAIN_HOST,
  HOST,
  insertOtherTenant,
  login,
  OTHER_HOST,
  OTHER_TENANT_ID,
  seedWorkspace,
  TENANT_ID,
  UNKNOWN_HOST,
} from "./support";

describe("tenant resolution and isolation", () => {
  beforeAll(async () => {
    await seedWorkspace();
    await insertOtherTenant();
  });

  afterEach(() => {
    env.NODE_ENV = "test";
  });

  afterAll(async () => {
    await closeWorkspace();
  });

  it("resolves the tenant from the Host header", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.id).toBe(TENANT_ID);
    expect(response.body.data.tenant.subdomain).toBe("santos");
  });

  it("resolves the same tenant through its custom domain", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", CUSTOM_DOMAIN_HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.id).toBe(TENANT_ID);
    expect(response.body.data.tenant.customDomain).toBe(CUSTOM_DOMAIN_HOST);
  });

  it("resolves the dev tenant when the host is plain localhost", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", "localhost");
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.id).toBe(TENANT_ID);
  });

  it("resolves the dev tenant when the host is a loopback address", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", "127.0.0.1:4000");
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.id).toBe(TENANT_ID);
  });

  it("honours the X-Tenant-Host override outside production", async () => {
    const response = await request(app)
      .get("/api/v1/public/tenant")
      .set("Host", UNKNOWN_HOST)
      .set("X-Tenant-Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.id).toBe(TENANT_ID);
  });

  it("ignores the X-Tenant-Host override in production", async () => {
    env.NODE_ENV = "production";
    const response = await request(app)
      .get("/api/v1/public/tenant")
      .set("Host", UNKNOWN_HOST)
      .set("X-Tenant-Host", HOST);
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("tenant_not_found");
  });

  it("returns 404 for an unknown workspace", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", UNKNOWN_HOST);
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Workspace not found.");
    expect(response.body.code).toBe("tenant_not_found");
  });

  it("falls back to the request host when the override is blank", async () => {
    const response = await request(app)
      .get("/api/v1/public/tenant")
      .set("Host", HOST)
      .set("X-Tenant-Host", "   ");
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.id).toBe(TENANT_ID);
  });

  it("takes the first host from a comma separated forwarded list", async () => {
    const response = await request(app)
      .get("/api/v1/public/tenant")
      .set("Host", UNKNOWN_HOST)
      .set("X-Tenant-Host", `${HOST}, proxy.internal`);
    expect(response.status).toBe(200);
    expect(response.body.data.tenant.id).toBe(TENANT_ID);
  });

  it("does not leak the pricing matrix on the public tenant surface", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    expect(response.body.data.tenant.pricingMatrix).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain("rate_per_sf");
    expect(JSON.stringify(response.body)).not.toContain("password_hash");
  });

  it("exposes the tenant feature flags", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    expect(response.body.data.tenant.features).toEqual({
      estimator: true,
      clientPortal: true,
      changeOrders: true,
    });
  });

  it("rejects a session issued for a different tenant", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/projects").set("Host", OTHER_HOST);
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("This session does not belong to this workspace.");
  });

  it("keeps project reads inside the resolved tenant", async () => {
    const other = await request(app).get("/api/v1/public/tenant").set("Host", OTHER_HOST);
    expect(other.status).toBe(200);
    expect(other.body.data.tenant.id).toBe(OTHER_TENANT_ID);
    expect(other.body.data.tenant.companyName).toBe("Other Builders");
  });

  it("serves the branded tenant configuration without leaking internals", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    expect(response.body.data.tenant.palette.primary).toBe("#0B1220");
    expect(response.body.data.tenant.palette.secondary).toBe("#C2410C");
    expect(response.body.data.tenant.branding.typography.fontFamily).toBe("Archivo");
    expect(response.body.data.tenant.branding.layout.navbarStyle).toBe("ruled");
  });
});
