import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { env } from "../src/config/env";
import { app, closeWorkspace, HOST, seedWorkspace } from "./support";

const ENVELOPE_KEYS = ["success", "error", "code", "timestamp"];

describe("response envelope and hardening headers", () => {
  beforeAll(async () => {
    await seedWorkspace();
  });

  afterEach(() => {
    env.NODE_ENV = "test";
  });

  afterAll(async () => {
    await closeWorkspace();
  });

  it("returns a stable envelope for an unknown route", async () => {
    const response = await request(app).get("/api/v1/does-not-exist").set("Host", HOST);
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Route not found.");
    expect(response.body.code).toBe("not_found");
    expect(new Date(response.body.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("never leaks a stack trace in an error body", async () => {
    const response = await request(app).get("/api/v1/does-not-exist").set("Host", HOST);
    expect(JSON.stringify(response.body)).not.toContain("at ");
    expect(response.body.stack).toBeUndefined();
  });

  it("wraps successful payloads in a data envelope", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeTruthy();
    expect(response.body.error).toBeUndefined();
  });

  it("sets the standard error keys on a bad request", async () => {
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .send({ projectType: "kitchen" });
    expect(response.status).toBe(400);
    for (const key of ENVELOPE_KEYS) {
      expect(response.body).toHaveProperty(key);
    }
  });

  it("does not advertise the server framework", async () => {
    const response = await request(app).get("/health");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("sets the security headers helmet provides", async () => {
    const response = await request(app).get("/health");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-dns-prefetch-control"]).toBe("off");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["content-security-policy"]).toBeTruthy();
  });

  it("rejects a body over the size limit", async () => {
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .send({ projectType: "kitchen", squareFeet: 120, materialTier: "standard", padding: "x".repeat(200_000) });
    expect(response.status).toBe(413);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe("payload_too_large");
  });

  it("serves a health check without a tenant", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("constructops-core");
  });

  it("allows the configured web origin to make changes", async () => {
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .set("Origin", env.WEB_ORIGIN)
      .send({ projectType: "kitchen", squareFeet: 120, materialTier: "standard", addons: [] });
    expect(response.status).toBe(200);
  });

  it("allows a tenant subdomain on the same scheme and port", async () => {
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .set("Origin", "http://santos.localhost:3000")
      .send({ projectType: "kitchen", squareFeet: 120, materialTier: "standard", addons: [] });
    expect(response.status).toBe(200);
  });

  it("rejects a change from an unknown origin", async () => {
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .set("Origin", "https://evil.example")
      .send({ projectType: "kitchen", squareFeet: 120, materialTier: "standard", addons: [] });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("origin_rejected");
    expect(response.body.error).toBe("This origin is not allowed to make changes.");
  });

  it("rejects a change from a different port", async () => {
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .set("Origin", "http://localhost:3100")
      .send({ projectType: "kitchen", squareFeet: 120, materialTier: "standard", addons: [] });
    expect(response.status).toBe(403);
  });

  it("rejects a change from a different scheme", async () => {
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .set("Origin", "https://localhost:3000")
      .send({ projectType: "kitchen", squareFeet: 120, materialTier: "standard", addons: [] });
    expect(response.status).toBe(403);
  });

  it("rejects a change from an unrelated host", async () => {
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .set("Origin", "http://santos.evil.example:3000")
      .send({ projectType: "kitchen", squareFeet: 120, materialTier: "standard", addons: [] });
    expect(response.status).toBe(403);
  });

  it("does not apply the origin guard to safe methods", async () => {
    const response = await request(app)
      .get("/api/v1/public/tenant")
      .set("Host", HOST)
      .set("Origin", "https://evil.example");
    expect(response.status).toBe(200);
  });

  it("only allows the exact configured origin in production", async () => {
    env.NODE_ENV = "production";
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .set("Origin", "http://santos.localhost:3000")
      .send({ projectType: "kitchen", squareFeet: 120, materialTier: "standard", addons: [] });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("origin_rejected");
  });

  it("allows the exact configured origin in production", async () => {
    env.NODE_ENV = "production";
    const response = await request(app)
      .post("/api/v1/public/estimate")
      .set("Host", HOST)
      .set("Origin", env.WEB_ORIGIN)
      .send({ projectType: "kitchen", squareFeet: 120, materialTier: "standard", addons: [] });
    expect(response.status).toBe(200);
  });

  it("answers the CORS preflight for the allowed origin", async () => {
    const response = await request(app)
      .options("/api/v1/public/estimate")
      .set("Host", HOST)
      .set("Origin", env.WEB_ORIGIN)
      .set("Access-Control-Request-Method", "POST");
    expect(response.status).toBeLessThan(300);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers["access-control-allow-origin"]).toBe(env.WEB_ORIGIN);
  });

  it("does not allow an unlisted request header", async () => {
    const response = await request(app)
      .options("/api/v1/public/estimate")
      .set("Host", HOST)
      .set("Origin", env.WEB_ORIGIN)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "X-Evil");
    expect(response.headers["access-control-allow-headers"] ?? "").not.toContain("X-Evil");
  });
});
