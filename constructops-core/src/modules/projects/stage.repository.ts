import { deriveCurrentPhase, deriveStageProgress } from "@constructops/shared";

import { one, type Database, type Queryable } from "../../config/database";
import type { StageRow, StageTransition, StageUpdateRow } from "./stage.types";

const SELECT_STAGE = `
  SELECT id, tenant_id, project_id, stage_order, name, status, started_at, completed_at, created_at
  FROM project_stages
`;

const SELECT_UPDATE = `
  SELECT su.id, su.stage_id, su.stage_name, su.actor_id, su.actor_role, su.comment,
         su.progress_percentage, su.created_at,
         u.first_name AS actor_first_name, u.last_name AS actor_last_name
  FROM project_stage_updates su
  LEFT JOIN users u ON u.id = su.actor_id AND u.tenant_id = su.tenant_id
`;

function listStages(db: Queryable, tenantId: string, projectId: string): Promise<StageRow[]> {
  return db.query<StageRow>(
    `${SELECT_STAGE} WHERE tenant_id = $1 AND project_id = $2 ORDER BY stage_order ASC`,
    [tenantId, projectId],
  );
}

async function syncProject(
  db: Queryable,
  tenantId: string,
  projectId: string,
  stages: StageRow[],
): Promise<void> {
  const progress = deriveStageProgress(stages);
  const phase = deriveCurrentPhase(stages);
  await db.query(
    `UPDATE projects
     SET progress_percentage = $3, current_phase = COALESCE($4, current_phase), updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2`,
    [tenantId, projectId, progress, phase],
  );
}

export class StageRepository {
  constructor(private readonly db: Database) {}

  async listByProject(tenantId: string, projectId: string): Promise<StageRow[]> {
    return listStages(this.db, tenantId, projectId);
  }

  async listUpdates(tenantId: string, projectId: string, limit = 50): Promise<StageUpdateRow[]> {
    return this.db.query<StageUpdateRow>(
      `${SELECT_UPDATE}
       WHERE su.tenant_id = $1 AND su.project_id = $2
       ORDER BY su.created_at DESC
       LIMIT $3`,
      [tenantId, projectId, limit],
    );
  }

  /**
   * Reconciles the stage plan positionally: order N is renamed to names[N], trailing orders are
   * dropped, and completion state is preserved by position. Derives current_phase and
   * progress_percentage back onto the project in the same transaction.
   */
  async replacePlan(tenantId: string, projectId: string, names: string[]): Promise<StageRow[]> {
    return this.db.transaction(async (tx) => {
      await tx.query(
        `DELETE FROM project_stages
         WHERE tenant_id = $1 AND project_id = $2 AND stage_order >= $3`,
        [tenantId, projectId, names.length],
      );

      for (const [index, name] of names.entries()) {
        await tx.query(
          `INSERT INTO project_stages (tenant_id, project_id, stage_order, name, status)
           VALUES ($1,$2,$3,$4,'pending')
           ON CONFLICT (project_id, stage_order) DO UPDATE SET name = EXCLUDED.name`,
          [tenantId, projectId, index, name],
        );
      }

      const existing = await listStages(tx, tenantId, projectId);
      if (existing.length > 0 && existing.every((row) => row.status === "pending")) {
        await tx.query(
          `UPDATE project_stages
           SET status = 'active', started_at = COALESCE(started_at, NOW())
           WHERE tenant_id = $1 AND project_id = $2 AND stage_order = 0`,
          [tenantId, projectId],
        );
      }

      const stages = await listStages(tx, tenantId, projectId);
      await syncProject(tx, tenantId, projectId, stages);
      return stages;
    });
  }

  async updateStatus(
    tenantId: string,
    projectId: string,
    stageId: string,
    transition: StageTransition,
  ): Promise<{ stages: StageRow[]; update: StageUpdateRow } | null> {
    return this.db.transaction(async (tx) => {
      const stage = await one<StageRow>(
        tx,
        `${SELECT_STAGE} WHERE tenant_id = $1 AND project_id = $2 AND id = $3 LIMIT 1`,
        [tenantId, projectId, stageId],
      );
      if (!stage) return null;

      const now = new Date().toISOString();
      const startedAt =
        transition.status === "pending"
          ? null
          : stage.started_at
            ? new Date(stage.started_at).toISOString()
            : now;
      const completedAt =
        transition.status === "completed"
          ? stage.completed_at
            ? new Date(stage.completed_at).toISOString()
            : now
          : null;

      await tx.query(
        `UPDATE project_stages
         SET status = $4, started_at = $5, completed_at = $6
         WHERE tenant_id = $1 AND project_id = $2 AND id = $3`,
        [tenantId, projectId, stageId, transition.status, startedAt, completedAt],
      );

      const stages = await listStages(tx, tenantId, projectId);
      const progress = deriveStageProgress(stages);

      const inserted = await one<{ id: string }>(
        tx,
        `INSERT INTO project_stage_updates
           (tenant_id, project_id, stage_id, stage_name, actor_id, actor_role, comment, progress_percentage)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id`,
        [
          tenantId,
          projectId,
          stageId,
          stage.name,
          transition.actorId,
          transition.actorRole,
          transition.comment,
          progress,
        ],
      );
      if (!inserted) throw new Error("Stage update insert did not return a row.");

      const update = await one<StageUpdateRow>(
        tx,
        `${SELECT_UPDATE} WHERE su.tenant_id = $1 AND su.id = $2 LIMIT 1`,
        [tenantId, inserted.id],
      );
      if (!update) throw new Error("Stage update could not be read back.");

      await syncProject(tx, tenantId, projectId, stages);
      return { stages, update };
    });
  }
}
