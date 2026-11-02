import type { StageDto, StageRow, StageUpdateDto, StageUpdateRow } from "./stage.types";

function toIso(value: string | Date | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

export function mapStage(row: StageRow): StageDto {
  return {
    id: row.id,
    order: row.stage_order,
    name: row.name,
    status: row.status,
    startedAt: toIso(row.started_at),
    completedAt: toIso(row.completed_at),
  };
}

export function mapStageUpdate(row: StageUpdateRow): StageUpdateDto {
  const actorName = [row.actor_first_name, row.actor_last_name].filter(Boolean).join(" ").trim();
  return {
    id: row.id,
    stageId: row.stage_id,
    stageName: row.stage_name,
    actorId: row.actor_id,
    actorName: actorName || null,
    actorRole: row.actor_role,
    comment: row.comment,
    progressPercentage: row.progress_percentage,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
