import { one, type Database } from "../../config/database";
import type { UserRow } from "./user.types";

const SELECT_USER = `SELECT id, tenant_id, email, password_hash, role, first_name, last_name, created_at FROM users`;

export class UserRepository {
  constructor(private readonly db: Database) {}

  async findByEmail(tenantId: string, email: string): Promise<UserRow | null> {
    return one<UserRow>(this.db, `${SELECT_USER} WHERE tenant_id = $1 AND lower(email) = lower($2) LIMIT 1`, [
      tenantId,
      email,
    ]);
  }

  async findById(tenantId: string, id: string): Promise<UserRow | null> {
    return one<UserRow>(this.db, `${SELECT_USER} WHERE tenant_id = $1 AND id = $2 LIMIT 1`, [tenantId, id]);
  }

  async findClient(tenantId: string, id: string): Promise<UserRow | null> {
    return one<UserRow>(
      this.db,
      `${SELECT_USER} WHERE tenant_id = $1 AND id = $2 AND role = 'client' LIMIT 1`,
      [tenantId, id],
    );
  }

  async listByTenant(tenantId: string): Promise<UserRow[]> {
    return this.db.query<UserRow>(
      `${SELECT_USER} WHERE tenant_id = $1 ORDER BY role, created_at`,
      [tenantId],
    );
  }

  async listClients(tenantId: string): Promise<UserRow[]> {
    return this.db.query<UserRow>(
      `${SELECT_USER} WHERE tenant_id = $1 AND role = 'client' ORDER BY created_at`,
      [tenantId],
    );
  }

  async create(
    tenantId: string,
    input: {
      email: string;
      passwordHash: string;
      role: string;
      firstName: string | null;
      lastName: string | null;
    },
  ): Promise<UserRow> {
    const row = await one<UserRow>(
      this.db,
      `INSERT INTO users (tenant_id, email, password_hash, role, first_name, last_name)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id`,
      [tenantId, input.email, input.passwordHash, input.role, input.firstName, input.lastName],
    );
    const created = row ? await this.findById(tenantId, row.id) : null;
    if (!created) throw new Error("User insert did not return a row.");
    return created;
  }
}
