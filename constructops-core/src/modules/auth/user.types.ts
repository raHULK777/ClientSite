import type { Role } from "@constructops/shared";

export type UserRow = {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  role: Role;
  first_name: string | null;
  last_name: string | null;
  created_at: string | Date;
};

export type PublicUser = {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
};

export function publicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
  };
}
