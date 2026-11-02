import { describe, expect, it } from "vitest";

import {
  estimateProject,
  estimateRequestSchema,
  EstimateError,
  pricingMatrixSchema,
  publicEstimatorOptions,
  type PricingMatrix,
} from "../src/index";

const matrix: PricingMatrix = {
  currency: "USD",
  minimum_charge: 5000,
  contingency_rate: 0.1,
  range_spread: 0.05,
  project_types: {
    kitchen: { label: "Kitchen remodel", base: 5000, rate_per_sf: 100, min_sf: 40, max_sf: 400 },
    bath: { label: "Bath remodel", base: 4000, rate_per_sf: 120, min_sf: 20, max_sf: 120 },
    consult: { label: "Consult", base: 500, rate_per_sf: 10, min_sf: 1, max_sf: 50 },
  },
  material_tiers: {
    standard: { label: "Standard", multiplier: 1 },
    premium: { label: "Premium", multiplier: 1.25 },
  },
  complexity: {
    standard: { label: "Standard", multiplier: 1 },
    high: { label: "High", multiplier: 1.1 },
  },
  addons: {
    structural: { label: "Structural changes", flat: 3000 },
  },
};

describe("estimateProject", () => {
  it("prices a project from the tenant matrix in cents", () => {
    const input = estimateRequestSchema.parse({
      projectType: "kitchen",
      squareFeet: 100,
      materialTier: "standard",
    });

    const result = estimateProject(input, matrix);

    expect(result.currency).toBe("USD");
    expect(result.subtotalCents).toBe(1_500_000);
    expect(result.contingencyCents).toBe(150_000);
    expect(result.totalCents).toBe(1_650_000);
    expect(result.range).toEqual({ lowCents: 1_567_500, highCents: 1_732_500 });
    expect(result.lineItems.map((item) => item.key)).toEqual(["base", "area", "contingency"]);
  });

  it("applies tier, complexity, add-ons, and the minimum charge", () => {
    const input = estimateRequestSchema.parse({
      projectType: "consult",
      squareFeet: 20,
      materialTier: "premium",
      complexity: "high",
      addons: ["structural", "structural"],
    });

    const result = estimateProject(input, matrix);

    expect(result.subtotalCents).toBe(500_000);
    expect(result.lineItems.map((item) => item.key)).toContain("minimum");
    expect(result.lineItems.filter((item) => item.key === "addon:structural")).toHaveLength(1);
    expect(result.totalCents).toBe(550_000);
  });

  it("rejects unknown keys and out-of-range dimensions", () => {
    const base = { projectType: "kitchen", squareFeet: 100, materialTier: "standard" };

    expect(() => estimateProject(estimateRequestSchema.parse({ ...base, projectType: "roof" }), matrix)).toThrow(
      EstimateError,
    );
    expect(() => estimateProject(estimateRequestSchema.parse({ ...base, squareFeet: 10 }), matrix)).toThrow(
      /priced between/,
    );
    expect(() =>
      estimateProject(estimateRequestSchema.parse({ ...base, addons: ["paint"] }), matrix),
    ).toThrow(/Unknown add-on/);
  });

  it("exposes labels and bounds without rates", () => {
    const options = publicEstimatorOptions(matrix);

    expect(options.projectTypes[0]).toEqual({
      key: "kitchen",
      label: "Kitchen remodel",
      minSquareFeet: 40,
      maxSquareFeet: 400,
    });
    expect(JSON.stringify(options)).not.toContain("rate_per_sf");
    expect(JSON.stringify(options)).not.toContain("base");
  });

  it("validates the matrix shape", () => {
    expect(() => pricingMatrixSchema.parse({ ...matrix, contingency_rate: 0.9 })).toThrow();
    expect(() => pricingMatrixSchema.parse({ ...matrix, project_types: {} })).not.toThrow();
  });
});
