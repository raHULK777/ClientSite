import type { ProjectDto, ProjectRow } from "./project.types";

export function mapProject(row: ProjectRow): ProjectDto {
  const clientName = [row.client_first_name, row.client_last_name].filter(Boolean).join(" ").trim();
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: clientName || null,
    clientEmail: row.client_email ?? null,
    projectName: row.project_name,
    status: row.status,
    currentPhase: row.current_phase,
    progressPercentage: row.progress_percentage,
    estimatedCost: Number(row.estimated_cost),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
