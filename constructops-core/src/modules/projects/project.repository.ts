import { one, type Database } from "../../config/database";
import type { ProjectActor, ProjectRow, ProjectUpdate } from "./project.types";

const SELECT_PROJECT = `
  SELECT p.id, p.tenant_id, p.client_id, p.project_name, p.status, p.current_phase,
         p.progress_percentage, p.estimated_cost, p.updated_at,
         u.first_name AS client_first_name, u.last_name AS client_last_name, u.email AS client_email
  FROM projects p
  LEFT JOIN users u ON u.id = p.client_id AND u.tenant_id = p.tenant_id
`;

export class ProjectRepository {
  constructor(private readonly db: Database) {}

  async listAccessible(tenantId: string, actor: ProjectActor, status?: string): Promise<ProjectRow[]> {
    return this.db.query<ProjectRow>(
      `${SELECT_PROJECT}
       WHERE p.tenant_id = $1
         AND ($2::text IS NULL OR p.status = $2)
         AND ($3::uuid IS NULL OR p.client_id = $3)
       ORDER BY p.updated_at DESC, p.project_name ASC`,
      [tenantId, status ?? null, actor.role === "client" ? actor.id : null],
    );
  }

  async findAccessible(tenantId: string, id: string, actor: ProjectActor): Promise<ProjectRow | null> {
    return one<ProjectRow>(
      this.db,
      `${SELECT_PROJECT}
       WHERE p.tenant_id = $1 AND p.id = $2
         AND ($3::uuid IS NULL OR p.client_id = $3)
       LIMIT 1`,
      [tenantId, id, actor.role === "client" ? actor.id : null],
    );
  }

  async findById(tenantId: string, id: string): Promise<ProjectRow | null> {
    return one<ProjectRow>(this.db, `${SELECT_PROJECT} WHERE p.tenant_id = $1 AND p.id = $2 LIMIT 1`, [tenantId, id]);
  }

  async create(
    tenantId: string,
    input: {
      clientId?: string | null;
      projectName: string;
      status: string;
      currentPhase: string;
      progressPercentage: number;
      estimatedCost: number;
    },
  ): Promise<ProjectRow> {
    const row = await one<ProjectRow>(
      this.db,
      `INSERT INTO projects (tenant_id, client_id, project_name, status, current_phase, progress_percentage, estimated_cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        tenantId,
        input.clientId ?? null,
        input.projectName,
        input.status,
        input.currentPhase,
        input.progressPercentage,
        input.estimatedCost.toFixed(2),
      ],
    );
    const created = row ? await this.findById(tenantId, row.id) : null;
    if (!created) throw new Error("Project insert did not return a row.");
    return created;
  }

  async update(tenantId: string, id: string, input: ProjectUpdate): Promise<ProjectRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [tenantId, id];

    const set = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (input.clientId !== undefined) set("client_id", input.clientId);
    if (input.projectName !== undefined) set("project_name", input.projectName);
    if (input.status !== undefined) set("status", input.status);
    if (input.currentPhase !== undefined) set("current_phase", input.currentPhase);
    if (input.progressPercentage !== undefined) set("progress_percentage", input.progressPercentage);
    if (input.estimatedCost !== undefined) set("estimated_cost", input.estimatedCost.toFixed(2));

    if (!fields.length) return this.findById(tenantId, id);
    fields.push("updated_at = NOW()");

    const row = await one<{ id: string }>(
      this.db,
      `UPDATE projects SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2 RETURNING id`,
      values,
    );
    return row ? this.findById(tenantId, row.id) : null;
  }
}
