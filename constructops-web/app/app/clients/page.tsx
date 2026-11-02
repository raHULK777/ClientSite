import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Schedule,
  ScheduleAmount,
  ScheduleBody,
  ScheduleCell,
  ScheduleHead,
  ScheduleHeaderCell,
  ScheduleRow,
  ScheduleTable,
} from "@/components/ui/schedule";
import { Sheet } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { coreFetch, requireSession } from "@/lib/core";
import { cn } from "@/lib/cn";
import { formatMoney, jobNumber, PROJECT_STATUS_LABEL } from "@/lib/format";
import { groupClients, rollupProjects } from "@/lib/rollups";

import type { ChangeOrder, Project } from "@/lib/api-types";
import type { ProjectStatus } from "@constructops/shared";

export const metadata: Metadata = {
  title: "Clients",
  robots: { index: false, follow: false },
};

const STATUS_STAMP: Record<ProjectStatus, string> = {
  planning: "border-line-strong text-muted",
  active: "border-ink text-ink",
  completed: "border-ink bg-ink text-paper",
};

function ClientCard({ client }: { client: ReturnType<typeof groupClients>[number] }) {
  const revised = client.projects.reduce((total, project) => total + project.revisedCost, 0);
  const pending = client.projects.reduce((total, project) => total + project.pendingValue, 0);
  const awaiting = client.projects.reduce((total, project) => total + project.pendingCount, 0);

  return (
    <Sheet className="bg-paper-raised">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink px-4 py-3">
        <div className="min-w-0">
          <p className="type-heading truncate text-base">{client.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{client.email ?? "No email on file"}</p>
        </div>
        <span className="type-label border border-line-strong px-2 py-1 text-[9px] text-muted">
          {client.projects.length} {client.projects.length === 1 ? "job" : "jobs"}
        </span>
      </div>

      <Schedule>
        <ScheduleTable className="min-w-0">
          <ScheduleHead>
            <tr>
              <ScheduleHeaderCell>Job</ScheduleHeaderCell>
              <ScheduleHeaderCell>Status</ScheduleHeaderCell>
              <ScheduleHeaderCell className="text-right">Revised</ScheduleHeaderCell>
            </tr>
          </ScheduleHead>
          <ScheduleBody>
            {client.projects.map((project) => (
              <ScheduleRow key={project.id}>
                <ScheduleCell>
                  <Link
                    href={`/app/projects/${project.id}`}
                    className="flex min-h-11 flex-col justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised"
                  >
                    <span className="type-stencil text-[9px] text-muted">{jobNumber(project.id)}</span>
                    <span className="mt-0.5 text-sm text-ink">{project.projectName}</span>
                  </Link>
                </ScheduleCell>
                <ScheduleCell>
                  <Stamp className={cn("px-1.5 py-0.5 text-[9px]", STATUS_STAMP[project.status])}>
                    {PROJECT_STATUS_LABEL[project.status]}
                  </Stamp>
                </ScheduleCell>
                <ScheduleAmount>{formatMoney(project.revisedCost)}</ScheduleAmount>
              </ScheduleRow>
            ))}
          </ScheduleBody>
        </ScheduleTable>
      </Schedule>

      <div className="border-t border-ink px-4 py-3">
        <dl className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <dt className="type-label text-[9px] text-muted">Contract total</dt>
            <dd className="type-data mt-0.5 text-sm text-ink">{formatMoney(revised)}</dd>
          </div>
          <div className="text-right">
            <dt className="type-label text-[9px] text-muted">Awaiting signature</dt>
            <dd className={cn("type-data mt-0.5 text-sm", awaiting ? "text-revision" : "text-muted")}>
              {awaiting ? `${formatMoney(pending)} · ${awaiting}` : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </Sheet>
  );
}

export default async function ClientsPage() {
  await requireSession(["admin", "field_staff"]);
  const [projectData, orderData] = await Promise.all([
    coreFetch<{ projects: Project[] }>("/protected/projects"),
    coreFetch<{ changeOrders: ChangeOrder[] }>("/protected/change-orders"),
  ]);

  const projects = rollupProjects(projectData.projects, orderData.changeOrders);
  const clients = groupClients(projects);
  const revisedTotal = clients.reduce(
    (total, client) =>
      total + client.projects.reduce((sum, project) => sum + project.revisedCost, 0),
    0,
  );
  const pendingTotal = clients.reduce(
    (total, client) =>
      total + client.projects.reduce((sum, project) => sum + project.pendingValue, 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-label text-muted">Directory</p>
          <h1 className="type-title mt-1 text-[clamp(2rem,4vw,3.25rem)]">Clients</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            {clients.length} {clients.length === 1 ? "client account" : "client accounts"} tied to
            jobs on the board.
          </p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="type-label text-[9px] text-muted">Contract total</p>
            <p className="type-data mt-1 text-sm">{formatMoney(revisedTotal)}</p>
          </div>
          <div>
            <p className="type-label text-[9px] text-muted">Awaiting</p>
            <p className="type-data mt-1 text-sm text-revision">{formatMoney(pendingTotal)}</p>
          </div>
        </div>
      </header>

      {clients.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <Sheet className="bg-paper-raised px-5 py-10 text-center">
          <p className="type-heading text-lg">No client accounts on the board.</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
            Client accounts are issued by the office. Assign a client when a job is opened.
          </p>
          <Button asChild className="mt-4">
            <Link href="/app">Project index</Link>
          </Button>
        </Sheet>
      )}

      <p className="max-w-2xl border-l-2 border-line-strong px-3 text-xs leading-relaxed text-muted">
        The directory is derived from jobs on the board. Client portal access follows the account
        email; the workspace never impersonates a client.
      </p>
    </div>
  );
}
