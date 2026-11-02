import { one, type Database } from "../../config/database";
import { recordAudit } from "../audit/audit.repository";
import type { ChangeOrderRow, ChangeOrderUpdate } from "./change-order.types";

const SELECT_ORDER = `
  SELECT co.id, co.tenant_id, co.project_id, co.title, co.description, co.cost_impact, co.status,
         co.signed_by, co.signed_at, co.ip_address, co.created_at, sig.signer_name
  FROM change_orders co
  LEFT JOIN change_order_signatures sig ON sig.change_order_id = co.id
`;

export class ChangeOrderRepository {
  constructor(private readonly db: Database) {}

  async listByProject(tenantId: string, projectId: string): Promise<ChangeOrderRow[]> {
    return this.db.query<ChangeOrderRow>(
      `${SELECT_ORDER} WHERE co.tenant_id = $1 AND co.project_id = $2 ORDER BY co.created_at DESC`,
      [tenantId, projectId],
    );
  }

  async listAccessible(tenantId: string, clientId: string | null): Promise<ChangeOrderRow[]> {
    return this.db.query<ChangeOrderRow>(
      `${SELECT_ORDER}
       JOIN projects p ON p.id = co.project_id AND p.tenant_id = co.tenant_id
       WHERE co.tenant_id = $1 AND ($2::uuid IS NULL OR p.client_id = $2)
       ORDER BY co.created_at DESC`,
      [tenantId, clientId],
    );
  }

  async findById(tenantId: string, id: string): Promise<ChangeOrderRow | null> {
    return one<ChangeOrderRow>(this.db, `${SELECT_ORDER} WHERE co.tenant_id = $1 AND co.id = $2 LIMIT 1`, [
      tenantId,
      id,
    ]);
  }

  async create(
    tenantId: string,
    projectId: string,
    input: { title: string; description?: string; costImpact: number },
  ): Promise<ChangeOrderRow | null> {
    const row = await one<{ id: string }>(
      this.db,
      `INSERT INTO change_orders (tenant_id, project_id, title, description, cost_impact, status)
       VALUES ($1,$2,$3,$4,$5,'pending') RETURNING id`,
      [tenantId, projectId, input.title, input.description ?? null, input.costImpact.toFixed(2)],
    );
    return row ? this.findById(tenantId, row.id) : null;
  }

  async update(tenantId: string, id: string, input: ChangeOrderUpdate): Promise<ChangeOrderRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [tenantId, id];
    const set = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (input.title !== undefined) set("title", input.title);
    if (input.description !== undefined) set("description", input.description);
    if (input.costImpact !== undefined) set("cost_impact", input.costImpact.toFixed(2));

    if (!fields.length) return this.findById(tenantId, id);

    const row = await one<{ id: string }>(
      this.db,
      `UPDATE change_orders SET ${fields.join(", ")} WHERE tenant_id = $1 AND id = $2 AND status = 'pending' RETURNING id`,
      values,
    );
    return row ? this.findById(tenantId, row.id) : null;
  }

  async approve(input: {
    tenantId: string;
    changeOrderId: string;
    userId: string;
    signerName: string;
    signatureHash: string;
    consentText: string;
    signedAt: string;
    ip: string | null;
    userAgent: string | null;
  }): Promise<ChangeOrderRow | null> {
    return this.db.transaction(async (tx) => {
      const updated = await one<{ id: string }>(
        tx,
        `UPDATE change_orders
         SET status = 'approved', signed_by = $1, signed_at = $2, ip_address = $3
         WHERE tenant_id = $4 AND id = $5 AND status = 'pending'
         RETURNING id`,
        [input.userId, input.signedAt, input.ip, input.tenantId, input.changeOrderId],
      );
      if (!updated) return null;

      await tx.query(
        `INSERT INTO change_order_signatures
           (tenant_id, change_order_id, user_id, signer_name, consent_text, signature_hash, ip_address, user_agent, signed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          input.tenantId,
          input.changeOrderId,
          input.userId,
          input.signerName,
          input.consentText,
          input.signatureHash,
          input.ip,
          input.userAgent,
          input.signedAt,
        ],
      );

      await recordAudit(tx, {
        tenantId: input.tenantId,
        actorId: input.userId,
        action: "change_order.approved",
        entityType: "change_order",
        entityId: input.changeOrderId,
        metadata: { signerName: input.signerName, signatureHash: input.signatureHash },
        ip: input.ip,
      });

      return one<ChangeOrderRow>(tx, `${SELECT_ORDER} WHERE co.tenant_id = $1 AND co.id = $2 LIMIT 1`, [
        input.tenantId,
        input.changeOrderId,
      ]);
    });
  }

  async reject(input: {
    tenantId: string;
    changeOrderId: string;
    userId: string;
    reason?: string;
    ip: string | null;
  }): Promise<ChangeOrderRow | null> {
    return this.db.transaction(async (tx) => {
      const updated = await one<{ id: string }>(
        tx,
        `UPDATE change_orders SET status = 'rejected'
         WHERE tenant_id = $1 AND id = $2 AND status = 'pending' RETURNING id`,
        [input.tenantId, input.changeOrderId],
      );
      if (!updated) return null;

      await recordAudit(tx, {
        tenantId: input.tenantId,
        actorId: input.userId,
        action: "change_order.rejected",
        entityType: "change_order",
        entityId: input.changeOrderId,
        metadata: { reason: input.reason ?? null },
        ip: input.ip,
      });

      return one<ChangeOrderRow>(tx, `${SELECT_ORDER} WHERE co.tenant_id = $1 AND co.id = $2 LIMIT 1`, [
        input.tenantId,
        input.changeOrderId,
      ]);
    });
  }
}
