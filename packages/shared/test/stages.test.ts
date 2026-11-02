import { describe, expect, it } from "vitest";

import { stagePlanSchema, stageStatusUpdateSchema } from "../src/contracts";
import { DEFAULT_STAGE_PLAN, deriveCurrentPhase, deriveStageProgress } from "../src/stages";

const stage = (name: string, status: "pending" | "active" | "completed") => ({ name, status });

describe("deriveStageProgress", () => {
  it("returns 0 for an empty plan", () => {
    expect(deriveStageProgress([])).toBe(0);
  });

  it("returns 0 when nothing is completed, even with an active stage", () => {
    expect(deriveStageProgress([stage("Permitting", "active"), stage("Framing", "pending")])).toBe(
      0,
    );
  });

  it("credits only completed stages", () => {
    expect(
      deriveStageProgress([
        stage("Permitting", "completed"),
        stage("Framing", "active"),
        stage("Finishes", "pending"),
        stage("Closeout", "pending"),
      ]),
    ).toBe(25);
  });

  it("returns 100 when every stage is completed", () => {
    expect(
      deriveStageProgress([stage("Permitting", "completed"), stage("Closeout", "completed")]),
    ).toBe(100);
  });

  it("rounds to the nearest whole percent", () => {
    expect(
      deriveStageProgress([stage("A", "completed"), stage("B", "pending"), stage("C", "pending")]),
    ).toBe(33);
  });

  it("handles a single stage", () => {
    expect(deriveStageProgress([stage("Only", "pending")])).toBe(0);
    expect(deriveStageProgress([stage("Only", "completed")])).toBe(100);
  });

  it("reaches 100 for the full default plan", () => {
    const plan = DEFAULT_STAGE_PLAN.map((name) => stage(name, "completed"));
    expect(deriveStageProgress(plan)).toBe(100);
  });
});

describe("deriveCurrentPhase", () => {
  it("returns null for an empty plan", () => {
    expect(deriveCurrentPhase([])).toBeNull();
  });

  it("returns the first non-completed stage", () => {
    expect(
      deriveCurrentPhase([
        stage("Permitting", "completed"),
        stage("Site prep", "active"),
        stage("Framing", "pending"),
      ]),
    ).toBe("Site prep");
  });

  it("returns the first pending stage when none is active", () => {
    expect(
      deriveCurrentPhase([stage("Permitting", "completed"), stage("Framing", "pending")]),
    ).toBe("Framing");
  });

  it("returns the final stage name when everything is completed", () => {
    expect(
      deriveCurrentPhase([stage("Permitting", "completed"), stage("Closeout", "completed")]),
    ).toBe("Closeout");
  });

  it("returns the only stage when it is active", () => {
    expect(deriveCurrentPhase([stage("Only", "active")])).toBe("Only");
  });
});

describe("stagePlanSchema", () => {
  it("accepts a valid plan and trims names", () => {
    const parsed = stagePlanSchema.parse({ stages: ["  Permitting  ", "Framing"] });
    expect(parsed.stages).toEqual(["Permitting", "Framing"]);
  });

  it("rejects an empty plan", () => {
    expect(stagePlanSchema.safeParse({ stages: [] }).success).toBe(false);
  });

  it("rejects more than thirty stages", () => {
    const stages = Array.from({ length: 31 }, (_, index) => `Stage ${index + 1}`);
    expect(stagePlanSchema.safeParse({ stages }).success).toBe(false);
  });

  it("rejects blank stage names", () => {
    expect(stagePlanSchema.safeParse({ stages: ["   "] }).success).toBe(false);
  });

  it("rejects a name longer than one hundred characters", () => {
    expect(stagePlanSchema.safeParse({ stages: ["x".repeat(101)] }).success).toBe(false);
  });

  it("accepts exactly thirty stages", () => {
    const stages = Array.from({ length: 30 }, (_, index) => `Stage ${index + 1}`);
    expect(stagePlanSchema.safeParse({ stages }).success).toBe(true);
  });
});

describe("stageStatusUpdateSchema", () => {
  it("requires a comment on every transition", () => {
    expect(stageStatusUpdateSchema.safeParse({ status: "completed" }).success).toBe(false);
    expect(stageStatusUpdateSchema.safeParse({ status: "completed", comment: "" }).success).toBe(
      false,
    );
  });

  it("accepts a status with a comment", () => {
    const parsed = stageStatusUpdateSchema.parse({
      status: "active",
      comment: " Framing started ",
    });
    expect(parsed).toEqual({ status: "active", comment: "Framing started" });
  });

  it("rejects an unknown status", () => {
    expect(
      stageStatusUpdateSchema.safeParse({ status: "blocked", comment: "waiting" }).success,
    ).toBe(false);
  });

  it("rejects a comment longer than two thousand characters", () => {
    expect(
      stageStatusUpdateSchema.safeParse({ status: "completed", comment: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});
