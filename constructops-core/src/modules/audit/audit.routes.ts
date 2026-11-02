import { Router } from "express";

import { auditQuerySchema, type AuditQueryInput } from "@constructops/shared";

import type { Database } from "../../config/database";
import { asyncHandler } from "../../lib/asyncHandler";
import { ok } from "../../lib/http";
import { authenticate, requireRole } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate";

export type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: unknown;
  ip_address: string | null;
  created_at: string;
};

function mapAudit(row: AuditRow) {
  return {
    id: row.id,
    actorId: row.actor_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

export function auditRouter(db: Database): Router {
  const router = Router();

  router.use(authenticate(db), requireRole("admin"));

  router.get(
    "/",
    validateQuery(auditQuerySchema),
    asyncHandler(async (req, res) => {
      const { limit, offset } = res.locals.query as AuditQueryInput;
      const tenantId = req.tenant!.id;
      const rows = await db.query<AuditRow>(
        `SELECT id, actor_id, action, entity_type, entity_id, metadata, ip_address, created_at
         FROM audit_events
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [tenantId, limit, offset],
      );
      const total = await db.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM audit_events WHERE tenant_id = $1",
        [tenantId],
      );
      ok(res, {
        events: rows.map(mapAudit),
        pagination: { limit, offset, total: total[0]?.count ?? 0 },
      });
    }),
  );

  return router;
}
