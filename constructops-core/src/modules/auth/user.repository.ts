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
}
