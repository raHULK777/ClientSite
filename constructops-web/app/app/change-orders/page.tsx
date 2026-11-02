import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/ui/data-card";
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
import { Stamp } from "@/components/ui/stamp";
import { coreFetch, requireSession } from "@/lib/core";
import { cn } from "@/lib/cn";
import {
  CHANGE_ORDER_STATUS_LABEL,
  formatDate,
  formatMoney,
  formatSignedMoney,
  jobNumber,
} from "@/lib/format";

import type { ChangeOrder, Project } from "@/lib/api-types";
import type { ChangeOrderStatus } from "@constructops/shared";

export const metadata: Metadata = {
  title: "Change orders",
  robots: { index: false, follow: false },
};

const CO_STAMP: Record<ChangeOrderStatus, string> = {
  pending: "border-revision text-revision",
  approved: "border-ink bg-ink text-paper",
  rejected: "border-line-strong text-muted",
};

export default async function ChangeOrdersPage() {
  await requireSession(["admin", "field_staff"]);
  const [projectData, orderData] = await Promise.all([
    coreFetch<{ projects: Project[] }>("/protected/projects"),
    coreFetch<{ changeOrders: ChangeOrder[] }>("/protected/change-orders"),
  ]);

  const projectById = new Map(projectData.projects.map((project) => [project.id, project]));
  const orders = [...orderData.changeOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const awaiting = orders.filter((order) => order.status === "pending");
  const approved = orders.filter((order) => order.status === "approved");
  const declined = orders.filter((order) => order.status === "rejected");
  const awaitingValue = awaiting.reduce((total, order) => total + order.costImpact, 0);
  const approvedValue = approved.reduce((total, order) => total + order.costImpact, 0);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="type-label text-muted">Revision log</p>
        <h1 className="type-title mt-1 text-[clamp(2rem,4vw,3.25rem)]">Change orders</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
          Every priced change on the board, newest first. Pending changes do not move the contract
          until the client signs.
        </p>
      </header>

      <section aria-label="Change order summary" className="grid gap-3 sm:grid-cols-3">
        <DataCard
          label="Awaiting signature"
          value={awaiting.length}
          detail={awaiting.length ? `${formatMoney(awaitingValue)} pending` : "Nothing waiting"}
          footer="Client portal"
        />
        <DataCard
          label="Approved"
          value={approved.length}
          detail={`${formatSignedMoney(approvedValue)} across signed changes`}
          footer="Included in revised contracts"
        />
        <DataCard
          label="Declined"
          value={declined.length}
          detail="No amount added to the contract"
          footer="Kept in the record"
        />
      </section>

      <section aria-labelledby="all-changes-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-2">
          <div>
            <p className="type-label text-muted">Schedule</p>
            <h2 id="all-changes-heading" className="type-heading mt-1 text-lg">
              All changes
            </h2>
          </div>
          <p className="type-label text-[9px] text-muted">
            {orders.length} {orders.length === 1 ? "record" : "records"}
          </p>
        </div>

        <Schedule className="mt-3">
          <ScheduleTable className="min-w-[780px]">
            <ScheduleHead>
              <tr>
                <ScheduleHeaderCell>Change</ScheduleHeaderCell>
                <ScheduleHeaderCell>Project</ScheduleHeaderCell>
                <ScheduleHeaderCell>Status</ScheduleHeaderCell>
                <ScheduleHeaderCell className="text-right">Amount</ScheduleHeaderCell>
                <ScheduleHeaderCell className="hidden md:table-cell">Signer / record</ScheduleHeaderCell>
                <ScheduleHeaderCell className="text-right">Open</ScheduleHeaderCell>
              </tr>
            </ScheduleHead>
            <ScheduleBody>
              {orders.map((order) => {
                const project = projectById.get(order.projectId);
                const href = project
                  ? `/app/projects/${project.id}/change-orders/${order.id}`
                  : null;
                return (
                  <ScheduleRow key={order.id}>
                    <ScheduleCell>
                      <span className="flex min-h-11 flex-col justify-center">
                        <span className="text-sm font-semibold text-ink">{order.title}</span>
                        <span className="mt-0.5 text-[11px] text-muted">
                          Issued {formatDate(order.createdAt)}
                        </span>
                      </span>
                    </ScheduleCell>
                    <ScheduleCell>
                      {project ? (
                        <Link
                          href={`/app/projects/${project.id}`}
                          className="inline-flex min-h-11 flex-col justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised"
                        >
                          <span className="type-stencil text-[9px] text-muted">
                            {jobNumber(project.id)}
                          </span>
                          <span className="mt-0.5 max-w-[12rem] truncate text-xs text-ink">
                            {project.projectName}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">Unknown project</span>
                      )}
                    </ScheduleCell>
                    <ScheduleCell>
                      <Stamp className={cn("px-1.5 py-0.5 text-[9px]", CO_STAMP[order.status])}>
                        {CHANGE_ORDER_STATUS_LABEL[order.status]}
                      </Stamp>
                    </ScheduleCell>
                    <ScheduleAmount className={cn(order.costImpact < 0 && "text-ink-soft")}>
                      {formatSignedMoney(order.costImpact)}
                    </ScheduleAmount>
                    <ScheduleCell className="hidden text-xs text-muted md:table-cell">
                      {order.status === "approved"
                        ? `${order.signerName ?? "Client"} · ${formatDate(order.signedAt)}`
                        : order.status === "pending"
                          ? "Awaiting client signature"
                          : "Declined by client"}
                    </ScheduleCell>
                    <ScheduleCell className="text-right">
                      {href ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="px-2 normal-case tracking-normal"
                        >
                          <Link href={href}>Open</Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </ScheduleCell>
                  </ScheduleRow>
                );
              })}

              {!orders.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="type-heading text-base">No change orders yet.</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
                      Open a project sheet to price the first change.
                    </p>
                    <Button asChild className="mt-4">
                      <Link href="/app">Project index</Link>
                    </Button>
                  </td>
                </tr>
              ) : null}
            </ScheduleBody>
          </ScheduleTable>
        </Schedule>
      </section>
    </div>
  );
}
