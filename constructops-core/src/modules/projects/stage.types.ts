import type { Role, StageStatus } from "@constructops/shared";

export type StageRow = {
  id: string;
  tenant_id: string;
  project_id: string;
  stage_order: number;
  name: string;
  status: StageStatus;
  started_at: string | Date | null;
  completed_at: string | Date | null;
  created_at: string | Date;
};

export type StageDto = {
  id: string;
  order: number;
  name: string;
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
};

export type StageUpdateRow = {
  id: string;
  stage_id: string | null;
  stage_name: string;
  actor_id: string | null;
  actor_role: string;
  comment: string | null;
  progress_percentage: number;
  created_at: string | Date;
  actor_first_name?: string | null;
  actor_last_name?: string | null;
};

export type StageUpdateDto = {
  id: string;
  stageId: string | null;
  stageName: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string;
  comment: string | null;
  progressPercentage: number;
  createdAt: string;
};

export type StageTransition = {
  status: StageStatus;
  comment: string;
  actorId: string;
  actorRole: Role;
};
