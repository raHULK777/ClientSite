import { one, type Database, type Queryable } from "../../config/database";
import type { DailyLogCreate, DailyLogRow } from "./daily-log.types";

const SELECT_DAILY_LOG = `
  SELECT dl.id, dl.tenant_id, dl.project_id, dl.author_id, dl.log_date, dl.summary,
         dl.details, dl.weather, dl.crew_size, dl.created_at,
         u.first_name AS author_first_name, u.last_name AS author_last_name
  FROM project_daily_logs dl
  LEFT JOIN users u ON u.id = dl.author_id AND u.tenant_id = dl.tenant_id
`;

export class DailyLogRepository {
  constructor(private readonly db: Database) {}

  async listByProject(
    tenantId: string,
    projectId: string,
    limit = 100,
  ): Promise<DailyLogRow[]> {
    return this.db.query<DailyLogRow>(
      `${SELECT_DAILY_LOG}
       WHERE dl.tenant_id = $1 AND dl.project_id = $2
       ORDER BY dl.log_date DESC, dl.created_at DESC
       LIMIT $3`,
      [tenantId, projectId, limit],
    );
  }

  async create(
    tenantId: string,
    input: DailyLogCreate,
    authorId: string,
  ): Promise<DailyLogRow | null> {
    const row = await one<{ id: string }>(
      this.db,
      `INSERT INTO project_daily_logs
         (tenant_id, project_id, author_id, log_date, summary, details, weather, crew_size)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        tenantId,
        input.projectId,
        authorId,
        input.logDate,
        input.summary,
        input.details ?? null,
        input.weather ?? null,
        input.crewSize ?? null,
      ],
    );
    if (!row) return null;
    return one<DailyLogRow>(
      this.db,
      `${SELECT_DAILY_LOG} WHERE dl.tenant_id = $1 AND dl.id = $2 LIMIT 1`,
      [tenantId, row.id],
    );
  }
}

export async function listDailyLogs(
  db: Queryable,
  tenantId: string,
  projectId: string,
  limit = 100,
): Promise<DailyLogRow[]> {
  return db.query<DailyLogRow>(
    `${SELECT_DAILY_LOG}
     WHERE dl.tenant_id = $1 AND dl.project_id = $2
     ORDER BY dl.log_date DESC, dl.created_at DESC
     LIMIT $3`,
    [tenantId, projectId, limit],
  );
}