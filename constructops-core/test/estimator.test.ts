import { estimateProject, publicEstimatorOptions } from "@constructops/shared";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  app,
  closeWorkspace,
  HOST,
  seedWorkspace,
  setPricingMatrix,
  setTenantFeature,
} from "./support";

const BASE = {
  projectType: "kitchen",
  squareFeet: 120,
  materialTier: "standard",
  complexity: "standard",
  addons: [],
};

const MATRIX = {
  currency: "USD",
  minimum_charge: 3500,
  contingency_rate: 0.08,
  range_spread: 0.07,
  project_types: {
    kitchen: { label: "Kitchen remodel", base: 8500, rate_per_sf: 210, min_sf: 40, max_sf: 600 },
    bath: { label: "Bath remodel", base: 7200, rate_per_sf: 260, min_sf: 20, max_sf: 180 },
    addition: { label: "Addition", base: 12000, rate_per_sf: 185, min_sf: 80, max_sf: 1200 },
    structural: { label: "Structural repair", base: 5000, rate_per_sf: 145, min_sf: 20, max_sf: 400 },
  },
  material_tiers: {
    standard: { label: "Standard", multiplier: 1 },
    premium: { label: "Premium", multiplier: 1.28 },
    luxury: { label: "Luxury", multiplier: 1.55 },
  },
  complexity: {
    low: { label: "Straightforward", multiplier: 0.94 },
    standard: { label: "Standard", multiplier: 1 },
    high: { label: "Complex", multiplier: 1.16 },
  },
  addons: {
    structural: { label: "Structural changes", flat: 4200 },
    electrical: { label: "Electrical upgrade", flat: 1900 },
    plumbing: { label: "Plumbing relocation", flat: 2600 },
    permit: { label: "Permit and inspection", flat: 850 },
    design: { label: "Design and selections", flat: 2400 },
  },
};

async function estimate(body: Record<string, unknown>) {
  return request(app).post("/api/v1/public/estimate").set("Host", HOST).send(body);
}

describe("public estimator", () => {
  beforeAll(async () => {
    await seedWorkspace();
  });

  beforeEach(async () => {
    await seedWorkspace();
  });

  afterAll(async () => {
    await closeWorkspace();
  });

  it("returns a complete itemised quote", async () => {
    const response = await estimate(BASE);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.currency).toBe("USD");
    expect(response.body.data.totalCents).toBeGreaterThan(0);
    expect(response.body.data.subtotalCents).toBeGreaterThan(0);
    expect(response.body.data.assumptions.length).toBe(3);
  });

  it("matches the shared pricing maths exactly", async () => {
    const input = { ...BASE, materialTier: "premium", addons: ["electrical"] };
    const response = await estimate(input);
    const expected = estimateProject(input, MATRIX);
    expect(response.body.data.totalCents).toBe(expected.totalCents);
    expect(response.body.data.range).toEqual(expected.range);
    expect(response.body.data.lineItems).toHaveLength(expected.lineItems.length);
  });

  it("prices every project type in the matrix", async () => {
    const cases = [
      { projectType: "kitchen", squareFeet: 120 },
      { projectType: "bath", squareFeet: 80 },
      { projectType: "addition", squareFeet: 400 },
      { projectType: "structural", squareFeet: 150 },
    ];
    for (const item of cases) {
      const response = await estimate({ ...BASE, ...item });
      expect(response.status).toBe(200);
      expect(response.body.data.totalCents).toBeGreaterThan(0);
      expect(response.body.data.lineItems.some((item2: { key: string }) => item2.key === "base")).toBe(true);
    }
  });

  it("prices every material tier", async () => {
    const totals: number[] = [];
    for (const materialTier of ["standard", "premium", "luxury"]) {
      const response = await estimate({ ...BASE, materialTier });
      expect(response.status).toBe(200);
      totals.push(response.body.data.totalCents);
    }
    expect(totals[1]).toBeGreaterThan(totals[0]!);
    expect(totals[2]).toBeGreaterThan(totals[1]!);
  });

  it("prices every complexity level", async () => {
    const totals: number[] = [];
    for (const complexity of ["low", "standard", "high"]) {
      const response = await estimate({ ...BASE, complexity });
      expect(response.status).toBe(200);
      totals.push(response.body.data.totalCents);
    }
    expect(totals[0]).toBeLessThan(totals[1]!);
    expect(totals[2]).toBeGreaterThan(totals[1]!);
  });

  it("charges each add-on and lists it as a line item", async () => {
    for (const addon of ["structural", "electrical", "plumbing", "permit", "design"]) {
      const response = await estimate({ ...BASE, addons: [addon] });
      expect(response.status).toBe(200);
      const line = response.body.data.lineItems.find((item: { key: string }) => item.key === `addon:${addon}`);
      expect(line).toBeTruthy();
      expect(line.amountCents).toBeGreaterThan(0);
    }
  });

  it("charges a duplicate add-on only once", async () => {
    const once = await estimate({ ...BASE, addons: ["electrical"] });
    const twice = await estimate({ ...BASE, addons: ["electrical", "electrical"] });
    expect(twice.body.data.totalCents).toBe(once.body.data.totalCents);
  });

  it("defaults complexity to standard when it is omitted", async () => {
    const omitted = await estimate({ ...BASE, complexity: undefined });
    const standard = await estimate(BASE);
    expect(omitted.body.data.totalCents).toBe(standard.body.data.totalCents);
  });

  it("applies the minimum project charge", async () => {
    await setPricingMatrix({ ...MATRIX, minimum_charge: 100_000 });
    const response = await estimate({ ...BASE, projectType: "structural", squareFeet: 20 });
    expect(response.status).toBe(200);
    expect(response.body.data.subtotalCents).toBe(10_000_000);
    expect(response.body.data.lineItems.some((item: { key: string }) => item.key === "minimum")).toBe(true);
  });

  it("builds a symmetric range around the total", async () => {
    const response = await estimate(BASE);
    const { lowCents, highCents } = response.body.data.range;
    const total = response.body.data.totalCents;
    expect(highCents - total).toBeCloseTo(total - lowCents, -1);
    expect(lowCents).toBeLessThan(total);
    expect(highCents).toBeGreaterThan(total);
  });

  it("always includes base, area and contingency lines", async () => {
    const response = await estimate(BASE);
    const keys = response.body.data.lineItems.map((item: { key: string }) => item.key);
    expect(keys).toContain("base");
    expect(keys).toContain("area");
    expect(keys).toContain("contingency");
  });

  it("states the contingency percentage in the assumptions", async () => {
    const response = await estimate(BASE);
    expect(response.body.data.assumptions.join(" ")).toContain("8% contingency");
  });

  it("rejects an unknown project type", async () => {
    const response = await estimate({ ...BASE, projectType: "garage" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("UNKNOWN_PROJECT_TYPE");
  });

  it("rejects an unknown material tier", async () => {
    const response = await estimate({ ...BASE, materialTier: "platinum" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("UNKNOWN_TIER");
  });

  it("rejects an unknown complexity", async () => {
    const response = await estimate({ ...BASE, complexity: "extreme" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("UNKNOWN_COMPLEXITY");
  });

  it("rejects an unknown add-on", async () => {
    const response = await estimate({ ...BASE, addons: ["gold-plating"] });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("UNKNOWN_ADDON");
  });

  it("rejects an area below the project minimum", async () => {
    const response = await estimate({ ...BASE, squareFeet: 10 });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("OUT_OF_RANGE");
    expect(response.body.error).toContain("40");
    expect(response.body.error).toContain("600");
  });

  it("rejects an area above the project maximum", async () => {
    const response = await estimate({ ...BASE, squareFeet: 5000 });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("OUT_OF_RANGE");
  });

  it("rejects a non numeric area", async () => {
    const response = await estimate({ ...BASE, squareFeet: "one hundred" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("bad_request");
  });

  it("rejects a negative area", async () => {
    const response = await estimate({ ...BASE, squareFeet: -50 });
    expect(response.status).toBe(400);
  });

  it("rejects an area beyond the hard ceiling", async () => {
    const response = await estimate({ ...BASE, squareFeet: 200_000 });
    expect(response.status).toBe(400);
  });

  it("rejects a missing project type", async () => {
    const response = await estimate({ squareFeet: 120, materialTier: "standard" });
    expect(response.status).toBe(400);
    expect(response.body.details.some((issue: { path: string }) => issue.path === "projectType")).toBe(true);
  });

  it("rejects more than twenty add-ons", async () => {
    const response = await estimate({ ...BASE, addons: Array.from({ length: 21 }, () => "electrical") });
    expect(response.status).toBe(400);
  });

  it("refuses to price when the estimator feature is off", async () => {
    await setTenantFeature("estimator", false);
    const response = await estimate(BASE);
    expect(response.status).toBe(503);
    expect(response.body.code).toBe("estimator_disabled");
    expect(response.body.error).toBe("Estimates are not available for this workspace.");
  });

  it("refuses to price when the workspace has no pricing matrix", async () => {
    await setPricingMatrix(null);
    const response = await estimate(BASE);
    expect(response.status).toBe(503);
    expect(response.body.code).toBe("estimator_unavailable");
  });

  it("hides the estimator when the feature is off", async () => {
    await setTenantFeature("estimator", false);
    const response = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    expect(response.body.data.estimator.enabled).toBe(false);
  });

  it("publishes bounds and labels but never the rates", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    expect(response.body.data.estimator.enabled).toBe(true);
    const kitchen = response.body.data.estimator.options.projectTypes.find(
      (item: { key: string }) => item.key === "kitchen",
    );
    expect(kitchen.minSquareFeet).toBe(40);
    expect(kitchen.maxSquareFeet).toBe(600);
    expect(kitchen.label).toBe("Kitchen remodel");
    expect(JSON.stringify(response.body.data.estimator.options)).not.toContain("rate_per_sf");
    expect(JSON.stringify(response.body.data.estimator.options)).not.toContain("multiplier");
    expect(JSON.stringify(response.body.data.estimator.options)).not.toContain("flat");
  });

  it("projects the matrix into the public option shape", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    expect(response.body.data.estimator.options.projectTypes).toHaveLength(4);
    expect(response.body.data.estimator.options.materialTiers).toHaveLength(3);
    expect(response.body.data.estimator.options.complexity).toHaveLength(3);
    expect(response.body.data.estimator.options.addons).toHaveLength(5);
  });

  it("keeps the public option projection in step with the shared helper", async () => {
    const response = await request(app).get("/api/v1/public/tenant").set("Host", HOST);
    const options = response.body.data.estimator.options;
    expect(options.currency).toBe("USD");
    expect(options.projectTypes.map((item: { key: string }) => item.key).sort()).toEqual([
      "addition",
      "bath",
      "kitchen",
      "structural",
    ]);
    expect(publicEstimatorOptions).toBeTypeOf("function");
  });
});
