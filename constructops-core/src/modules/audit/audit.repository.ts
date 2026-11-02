import type { Queryable } from "../../config/database";

export type AuditInput = {
  tenantId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

export async function recordAudit(db: Queryable, input: AuditInput): Promise<void> {
  await db.query(
    `INSERT INTO audit_events (tenant_id, actor_id, action, entity_type, entity_id, metadata, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      input.tenantId,
      input.actorId,
      input.action,
      input.entityType,
      input.entityId,
      JSON.stringify(input.metadata ?? {}),
      input.ip ?? null,
    ],
  );
}
