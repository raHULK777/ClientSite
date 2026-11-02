import { one, type Database, type Queryable } from "../../config/database";
import type { MessageRow } from "./message.types";

const SELECT_MESSAGE = `
  SELECT m.id, m.tenant_id, m.project_id, m.author_id, m.body, m.created_at,
         u.first_name AS author_first_name, u.last_name AS author_last_name
  FROM project_messages m
  LEFT JOIN users u ON u.id = m.author_id AND u.tenant_id = m.tenant_id
`;

export class MessageRepository {
  constructor(private readonly db: Database) {}

  async listByProject(tenantId: string, projectId: string, limit = 100): Promise<MessageRow[]> {
    return this.db.query<MessageRow>(
      `${SELECT_MESSAGE}
       WHERE m.tenant_id = $1 AND m.project_id = $2
       ORDER BY m.created_at ASC
       LIMIT $3`,
      [tenantId, projectId, limit],
    );
  }

  async create(
    tenantId: string,
    projectId: string,
    authorId: string,
    body: string,
  ): Promise<MessageRow | null> {
    const row = await one<{ id: string }>(
      this.db,
      `INSERT INTO project_messages (tenant_id, project_id, author_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [tenantId, projectId, authorId, body],
    );
    if (!row) return null;
    return one<MessageRow>(
      this.db,
      `${SELECT_MESSAGE} WHERE m.tenant_id = $1 AND m.id = $2 LIMIT 1`,
      [tenantId, row.id],
    );
  }

  async getUnreadCount(tenantId: string, projectId: string, userId: string): Promise<number> {
    const row = await one<{ count: string }>(
      this.db,
      `SELECT COUNT(*)::int AS count
       FROM project_messages m
       WHERE m.tenant_id = $1 AND m.project_id = $2
         AND m.created_at > COALESCE(r.last_read_at, '1970-01-01')
         AND m.author_id != $3`,
      [tenantId, projectId, userId],
    );
    return Number(row?.count ?? 0);
  }

  async markRead(tenantId: string, projectId: string, userId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO project_message_reads (tenant_id, project_id, user_id, last_read_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (project_id, user_id) DO UPDATE SET last_read_at = NOW()`,
      [tenantId, projectId, userId],
    );
  }
}

export async function listMessages(
  db: Queryable,
  tenantId: string,
  projectId: string,
  limit = 100,
): Promise<MessageRow[]> {
  return db.query<MessageRow>(
    `${SELECT_MESSAGE}
     WHERE m.tenant_id = $1 AND m.project_id = $2
     ORDER BY m.created_at ASC
     LIMIT $3`,
    [tenantId, projectId, limit],
  );
}