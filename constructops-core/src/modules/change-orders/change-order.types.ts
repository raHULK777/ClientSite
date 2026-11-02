import type { ChangeOrderStatus } from "@constructops/shared";

export type ChangeOrderRow = {
  id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  description: string | null;
  cost_impact: string | number;
  status: ChangeOrderStatus;
  signed_by: string | null;
  signed_at: string | Date | null;
  ip_address: string | null;
  created_at: string | Date;
  signer_name?: string | null;
};

export type ChangeOrderDto = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  costImpact: number;
  status: ChangeOrderStatus;
  signedBy: string | null;
  signerName: string | null;
  signedAt: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export type ChangeOrderUpdate = {
  title?: string;
  description?: string | null;
  costImpact?: number;
};
