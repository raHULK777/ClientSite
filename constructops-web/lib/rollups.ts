import type { ChangeOrder, ClientAccount, Project, ProjectRollup } from "./api-types";

export function rollupProject(project: Project, changeOrders: ChangeOrder[]): ProjectRollup {
  const forProject = changeOrders.filter((order) => order.projectId === project.id);
  const approvedValue = forProject
    .filter((order) => order.status === "approved")
    .reduce((total, order) => total + order.costImpact, 0);
  const pendingOrders = forProject.filter((order) => order.status === "pending");
  const pendingValue = pendingOrders.reduce((total, order) => total + order.costImpact, 0);

  return {
    ...project,
    approvedValue,
    pendingValue,
    pendingCount: pendingOrders.length,
    revisedCost: project.estimatedCost + approvedValue,
  };
}

export function rollupProjects(projects: Project[], changeOrders: ChangeOrder[]): ProjectRollup[] {
  const byProject = new Map<string, ChangeOrder[]>();
  for (const order of changeOrders) {
    const list = byProject.get(order.projectId);
    if (list) list.push(order);
    else byProject.set(order.projectId, [order]);
  }
  return projects.map((project) => rollupProject(project, byProject.get(project.id) ?? []));
}

export function groupClients(projects: ProjectRollup[]): ClientAccount[] {
  const clients = new Map<string, ClientAccount>();
  for (const project of projects) {
    if (!project.clientId) continue;
    const existing = clients.get(project.clientId);
    if (existing) {
      existing.projects.push(project);
    } else {
      clients.set(project.clientId, {
        id: project.clientId,
        name: project.clientName ?? "Unnamed client",
        email: project.clientEmail,
        projects: [project],
      });
    }
  }
  return [...clients.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function knownClients(projects: ProjectRollup[]) {
  return groupClients(projects).map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
  }));
}
