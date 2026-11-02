import type { ChangeOrderStatus, ProjectStatus, Role, TenantPalette } from "@constructops/shared";

import type { PublicTenant } from "./tenant";

export type SessionUser = {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
};

export type Project = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  projectName: string;
  status: ProjectStatus;
  currentPhase: string;
  progressPercentage: number;
  estimatedCost: number;
  updatedAt: string;
};

export type ChangeOrder = {
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

export type ChangeOrderSummary = {
  pending: number;
  approved: number;
  rejected: number;
  pendingValue: number;
};

export type ProjectDetail = {
  project: Project;
  changeOrders: ChangeOrder[];
  changeOrderSummary: ChangeOrderSummary;
  dailyLogs: DailyLog[];
  clients: ClientAccount[];
  messages: Message[];
};

export type AuditEvent = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
};

export type AuditPage = {
  events: AuditEvent[];
  pagination: { limit: number; offset: number; total: number };
};

export type AdminTenant = PublicTenant & { pricingMatrix: unknown };

export type ProjectRollup = Project & {
  approvedValue: number;
  pendingValue: number;
  pendingCount: number;
  revisedCost: number;
};

export type ClientAccount = {
  id: string;
  name: string;
  email: string | null;
  projects: ProjectRollup[];
};

export type PaletteForm = TenantPalette;

export type DailyLog = {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string | null;
  date: string;
  summary: string;
  details: string | null;
  weather: string | null;
  crewSize: number | null;
  createdAt: string;
};

export type Message = {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: string;
};