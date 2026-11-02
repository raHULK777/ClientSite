import type { ChangeOrderDto, ChangeOrderRow } from "./change-order.types";

export function mapChangeOrder(row: ChangeOrderRow): ChangeOrderDto {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    costImpact: Number(row.cost_impact),
    status: row.status,
    signedBy: row.signed_by,
    signerName: row.signer_name ?? null,
    signedAt: row.signed_at ? new Date(row.signed_at).toISOString() : null,
    ipAddress: row.ip_address,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
