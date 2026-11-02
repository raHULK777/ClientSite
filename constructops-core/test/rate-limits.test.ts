import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { env } from "../src/config/env";
import { app, closeWorkspace, HOST, seedWorkspace } from "./support";

const ESTIMATE = {
  projectType: "kitchen",
  squareFeet: 120,
  materialTier: "standard",
  complexity: "standard",
  addons: [],
};

describe("rate limiting", () => {
  beforeAll(async () => {
    await seedWorkspace();
    env.NODE_ENV = "development";
    env.RATE_LIMIT_DISABLED = false;
  });

  afterEach(() => {
    env.NODE_ENV = "development";
  });

  afterAll(async () => {
    env.NODE_ENV = "test";
    await closeWorkspace();
  });

  it("blocks repeated failed sign ins after the limit", async () => {
    let blocked: number | null = null;
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .set("Host", HOST)
        .send({ email: "owner@santos.test", password: "wrong-password" });
      if (response.status === 429) {
        blocked = attempt + 1;
        break;
      }
    }
    expect(blocked).not.toBeNull();
    expect(blocked).toBeLessThanOrEqual(12);
  });

  it("publishes the rate limit headers", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Host", HOST)
      .send({ email: "owner@santos.test", password: "wrong-password" });
    expect(response.headers["ratelimit-limit"]).toBeTruthy();
    expect(response.headers["ratelimit-remaining"]).toBeTruthy();
  });

  it("blocks repeated estimates after the limit", async () => {
    let blocked = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await request(app).post("/api/v1/public/estimate").set("Host", HOST).send(ESTIMATE);
      if (response.status === 429) {
        blocked = true;
        break;
      }
    }
    expect(blocked).toBe(true);
  });

  it("explains that too many estimates were requested", async () => {
    let message = "";
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await request(app).post("/api/v1/public/estimate").set("Host", HOST).send(ESTIMATE);
      if (response.status === 429) {
        message = response.body.error;
        break;
      }
    }
    expect(message).toBe("Too many estimates. Try again in a few minutes.");
  });
});
