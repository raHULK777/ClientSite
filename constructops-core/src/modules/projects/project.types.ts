import type { ProjectStatus, Role } from "@constructops/shared";

export type ProjectRow = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  project_name: string;
  status: ProjectStatus;
  current_phase: string;
  progress_percentage: number;
  estimated_cost: string | number;
  updated_at: string | Date;
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_email?: string | null;
};

export type ProjectDto = {
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

export type ProjectActor = { id: string; role: Role };

export type ProjectUpdate = {
  clientId?: string | null;
  projectName?: string;
  status?: ProjectStatus;
  currentPhase?: string;
  progressPercentage?: number;
  estimatedCost?: number;
};
