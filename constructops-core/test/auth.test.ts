import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { signSession } from "../src/lib/jwt";
import { app, closeWorkspace, HOST, login, seedWorkspace, TENANT_ID } from "./support";

const PASSWORD = "SantosDemo!23";

describe("authentication, sessions and CSRF", () => {
  beforeAll(async () => {
    await seedWorkspace();
  });

  afterAll(async () => {
    await closeWorkspace();
  });

  it("signs a valid account in and returns the user plus a CSRF token", async () => {
    const { response } = await login("owner@santos.test");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.role).toBe("admin");
    expect(response.body.data.user.email).toBe("owner@santos.test");
    expect(typeof response.body.data.csrfToken).toBe("string");
    expect(response.body.data.csrfToken.length).toBeGreaterThan(20);
  });

  it("never returns the password hash or the tenant secret", async () => {
    const { response } = await login("owner@santos.test");
    expect(JSON.stringify(response.body)).not.toContain("password_hash");
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  it("sets an http-only session cookie and a readable CSRF cookie", async () => {
    const { response } = await login("owner@santos.test");
    const raw = response.headers["set-cookie"] as unknown as string[];
    const session = raw.find((cookie) => cookie.startsWith("co_session="));
    const csrf = raw.find((cookie) => cookie.startsWith("co_csrf="));
    expect(session).toBeDefined();
    expect(session).toContain("HttpOnly");
    expect(session).toContain("Path=/");
    expect(session).toContain("SameSite=Lax");
    expect(csrf).toBeDefined();
    expect(csrf).not.toContain("HttpOnly");
  });

  it("matches the email without caring about case or padding", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Host", HOST)
      .send({ email: "  OWNER@SANTOS.TEST  ", password: PASSWORD });
    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe("admin");
  });

  it("rejects a wrong password without revealing which field failed", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Host", HOST)
      .send({ email: "owner@santos.test", password: "not-the-password" });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Email or password is incorrect.");
  });

  it("returns the same error for an unknown account", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Host", HOST)
      .send({ email: "nobody@santos.test", password: PASSWORD });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Email or password is incorrect.");
  });

  it("rejects a malformed email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Host", HOST)
      .send({ email: "not-an-email", password: PASSWORD });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("bad_request");
    expect(response.body.details).toBeTruthy();
  });

  it("rejects a password shorter than the policy", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Host", HOST)
      .send({ email: "owner@santos.test", password: "short" });
    expect(response.status).toBe(400);
    expect(response.body.details.some((issue: { path: string }) => issue.path === "password")).toBe(true);
  });

  it("rejects an unknown workspace before checking credentials", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Host", "northwind.localhost")
      .send({ email: "owner@santos.test", password: PASSWORD });
    expect(response.status).toBe(404);
    expect(response.body.code).toBe("tenant_not_found");
  });

  it("returns the signed-in identity from /auth/me", async () => {
    const { agent } = await login("client@santos.test");
    const response = await agent.get("/api/v1/auth/me").set("Host", HOST);
    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe("client");
    expect(response.body.data.user.firstName).toBe("Avery");
    expect(response.body.data.user.lastName).toBe("Chen");
  });

  it("rejects /auth/me without a session", async () => {
    const response = await request(app).get("/api/v1/auth/me").set("Host", HOST);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("unauthorized");
  });

  it("rejects a tampered session token", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Host", HOST)
      .set("Cookie", "co_session=not-a-real-token");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Your session has expired.");
  });

  it("rejects a session signed with a different secret", async () => {
    const token = jwt.sign(
      { sub: "22222222-2222-4222-8222-222222222222", tenantId: TENANT_ID, role: "admin" },
      "a-completely-different-signing-secret-value",
    );
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Host", HOST)
      .set("Cookie", `co_session=${token}`);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Your session has expired.");
  });

  it("accepts a bearer token without a cookie", async () => {
    const { response } = await login("field@santos.test");
    const cookie = (response.headers["set-cookie"] as unknown as string[]).find((entry) =>
      entry.startsWith("co_session="),
    )!;
    const token = cookie.split(";")[0]!.split("=")[1]!;
    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Host", HOST)
      .set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.role).toBe("field_staff");
  });

  it("rejects a session whose user was removed", async () => {
    const token = signSession({
      sub: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      tenantId: TENANT_ID,
      role: "client",
    });
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Host", HOST)
      .set("Cookie", `co_session=${token}`);
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Your session is no longer valid.");
  });

  it("clears the session on logout and records the event", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/auth/logout")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf);
    expect(response.status).toBe(200);
    expect(response.body.data.signedOut).toBe(true);

    const raw = response.headers["set-cookie"] as unknown as string[];
    expect(raw.some((cookie) => cookie.startsWith("co_session=") && cookie.includes("Expires=Thu, 01 Jan 1970"))).toBe(true);
    expect(raw.some((cookie) => cookie.startsWith("co_csrf=") && cookie.includes("Expires=Thu, 01 Jan 1970"))).toBe(true);

    const after = await agent.get("/api/v1/auth/me").set("Host", HOST);
    expect(after.status).toBe(401);
  });

  it("refuses logout without a CSRF token", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.post("/api/v1/auth/logout").set("Host", HOST);
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Invalid CSRF token.");
  });

  it("refuses logout when the CSRF header does not match the cookie", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/auth/logout")
      .set("Host", HOST)
      .set("X-CSRF-Token", "not-the-right-token");
    expect(response.status).toBe(403);
  });

  it("requires a session for protected reads", async () => {
    const response = await request(app).get("/api/v1/protected/projects").set("Host", HOST);
    expect(response.status).toBe(401);
  });

  it("requires a CSRF token for cookie backed mutations", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .send({ projectName: "Without CSRF" });
    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Invalid CSRF token.");
  });

  it("accepts a mutation when the CSRF header matches the cookie", async () => {
    const { agent, csrf } = await login("owner@santos.test");
    const response = await agent
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("X-CSRF-Token", csrf)
      .send({ projectName: "With CSRF" });
    expect(response.status).toBe(201);
  });

  it("does not require CSRF for safe methods", async () => {
    const { agent } = await login("owner@santos.test");
    const response = await agent.get("/api/v1/protected/projects").set("Host", HOST);
    expect(response.status).toBe(200);
  });

  it("lets a bearer token perform a mutation without CSRF", async () => {
    const { response } = await login("owner@santos.test");
    const cookie = (response.headers["set-cookie"] as unknown as string[]).find((entry) =>
      entry.startsWith("co_session="),
    )!;
    const token = cookie.split(";")[0]!.split("=")[1]!;
    const created = await request(app)
      .post("/api/v1/protected/projects")
      .set("Host", HOST)
      .set("Authorization", `Bearer ${token}`)
      .send({ projectName: "Bearer created" });
    expect(created.status).toBe(201);
  });

  it("signs in each demo role with the documented credentials", async () => {
    for (const [email, role] of [
      ["owner@santos.test", "admin"],
      ["field@santos.test", "field_staff"],
      ["client@santos.test", "client"],
      ["client2@santos.test", "client"],
    ] as const) {
      const { response } = await login(email);
      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe(role);
    }
  });
});
