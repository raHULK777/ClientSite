import type { StageStatus } from "./contracts";

export const DEFAULT_STAGE_PLAN = [
  "Permitting",
  "Site prep",
  "Foundation",
  "Framing",
  "Rough-in",
  "Insulation",
  "Drywall",
  "Finishes",
  "Inspection",
  "Closeout",
] as const;

export function deriveStageProgress(stages: readonly { status: StageStatus }[]): number {
  if (stages.length === 0) return 0;
  const completed = stages.filter((stage) => stage.status === "completed").length;
  return Math.round((completed / stages.length) * 100);
}

export function deriveCurrentPhase(
  stages: readonly { name: string; status: StageStatus }[],
): string | null {
  if (stages.length === 0) return null;
  const next = stages.find((stage) => stage.status !== "completed");
  if (next) return next.name;
  const last = stages[stages.length - 1];
  return last ? last.name : null;
}
