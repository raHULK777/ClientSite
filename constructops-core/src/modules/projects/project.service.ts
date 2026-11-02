import { notFound } from "../../lib/errors";
import type { ProjectActor, ProjectRow } from "./project.types";
import type { ProjectRepository } from "./project.repository";

export async function requireProject(
  repo: ProjectRepository,
  tenantId: string,
  actor: ProjectActor,
  id: string,
): Promise<ProjectRow> {
  const project = await repo.findAccessible(tenantId, id, actor);
  if (!project) throw notFound("Project not found.");
  return project;
}
