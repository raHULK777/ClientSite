import type { Metadata } from "next";

import { ProjectTable } from "@/components/app/project-table";
import { DataCard } from "@/components/ui/data-card";
import { coreFetch, requireSession } from "@/lib/core";
import { formatDate, formatMoney } from "@/lib/format";
import { knownClients, rollupProjects } from "@/lib/rollups";

import type { ChangeOrder, Project } from "@/lib/api-types";

export const metadata: Metadata = { title: "Project index" };

export default async function ProjectIndexPage() {
  const user = await requireSession(["admin", "field_staff"]);
  const [projectData, orderData] = await Promise.all([
    coreFetch<{ projects: Project[] }>("/protected/projects"),
    coreFetch<{ changeOrders: ChangeOrder[] }>("/protected/change-orders"),
  ]);

  const projects = rollupProjects(projectData.projects, orderData.changeOrders);
  const active = projects.filter((project) => project.status === "active").length;
  const awaiting = projects.reduce((total, project) => total + project.pendingCount, 0);
  const awaitingValue = projects.reduce((total, project) => total + project.pendingValue, 0);
  const approvedValue = projects.reduce((total, project) => total + project.approvedValue, 0);
  const revisedTotal = projects.reduce((total, project) => total + project.revisedCost, 0);
  const clients = knownClients(projects);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-label text-muted">Workspace</p>
          <h1 className="type-title mt-1 text-[clamp(2rem,4vw,3.25rem)]">Project index</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            {active} active {active === 1 ? "job" : "jobs"} on the board. Every change is priced
            before it reaches the client.
          </p>
        </div>
        <p className="type-label border border-line-strong px-2 py-1 text-[9px] text-muted">
          Board as of {formatDate(new Date().toISOString())}
        </p>
      </header>

      <section aria-label="Board summary" className="grid gap-3 sm:grid-cols-3">
        <DataCard
          label="Active jobs"
          value={active}
          detail={`${projects.length} ${projects.length === 1 ? "job" : "jobs"} in the index`}
          footer="Current work on the board"
        />
        <DataCard
          label="Awaiting signature"
          value={awaiting}
          detail={awaiting ? `${formatMoney(awaitingValue)} in pending changes` : "Nothing waiting on a client"}
          footer="Client portal"
        />
        <DataCard
          label="Approved changes"
          value={formatMoney(approvedValue)}
          detail={`${formatMoney(revisedTotal)} revised contract across all jobs`}
          footer="Original contract plus approved changes"
        />
      </section>

      <ProjectTable
        projects={projects}
        canCreate={user.role === "admin"}
        clients={clients}
      />
    </div>
  );
}
