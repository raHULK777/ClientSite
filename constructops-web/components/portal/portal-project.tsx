import { ChangeOrderCard } from "@/components/portal/change-order-card";
import { DataCard } from "@/components/ui/data-card";
import { Progress } from "@/components/ui/progress";
import { Stamp } from "@/components/ui/stamp";
import { cn } from "@/lib/cn";
import {
  formatDate,
  formatMoney,
  formatSignedMoney,
  jobNumber,
  PROJECT_STATUS_LABEL,
  projectStatusNote,
} from "@/lib/format";

import type { ChangeOrder, ProjectRollup } from "@/lib/api-types";

type HistoryEvent = {
  key: string;
  label: string;
  title: string;
  date: string | null;
  sortDate: number;
};

function historyFor(orders: ChangeOrder[]): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  for (const order of orders) {
    const issued = new Date(order.createdAt).getTime();
    events.push({
      key: `${order.id}-issued`,
      label: "Change order issued",
      title: order.title,
      date: order.createdAt,
      sortDate: issued,
    });
    if (order.status === "approved" && order.signedAt) {
      events.push({
        key: `${order.id}-approved`,
        label: "Approved by client",
        title: order.title,
        date: order.signedAt,
        sortDate: new Date(order.signedAt).getTime(),
      });
    }
    if (order.status === "rejected") {
      events.push({
        key: `${order.id}-rejected`,
        label: "Declined by client",
        title: order.title,
        date: null,
        sortDate: issued + 1,
      });
    }
  }
  return events.sort((left, right) => right.sortDate - left.sortDate);
}

function ProjectHistory({ orders }: { orders: ChangeOrder[] }) {
  const events = historyFor(orders);
  if (!events.length) return null;

  return (
    <div className="mt-6">
      <p className="type-label text-[9px] text-muted">Project record</p>
      <h3 className="type-heading mt-1 text-base">History</h3>
      <ol className="mt-3">
        {events.map((event, index) => (
          <li key={event.key} className="relative flex gap-3 pb-3">
            <span className="relative flex w-3 shrink-0 justify-center">
              <span className="mt-1.5 h-1.5 w-1.5 border border-ink bg-brand-bg" />
              {index < events.length - 1 ? (
                <span className="absolute bottom-0 top-3 w-px bg-line" aria-hidden="true" />
              ) : null}
            </span>
            <div className="min-w-0">
              <p className="type-label text-[8px] text-muted">
                {event.date ? formatDate(event.date) : "Decision recorded"}
              </p>
              <p className="mt-0.5 text-sm text-ink-soft">
                <span className="font-semibold text-ink">{event.label}</span> · {event.title}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PortalProject({
  project,
  orders,
  companyName,
  changeOrdersEnabled,
}: {
  project: ProjectRollup;
  orders: ChangeOrder[];
  companyName: string;
  changeOrdersEnabled: boolean;
}) {
  const sortedOrders = [...orders].sort((left, right) => {
    if (left.status === "pending" && right.status !== "pending") return -1;
    if (right.status === "pending" && left.status !== "pending") return 1;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
  const pendingLabel =
    project.pendingCount === 1 ? "1 change awaits your signature" : `${project.pendingCount} changes await your signature`;

  return (
    <section
      id={`project-${project.id}`}
      aria-labelledby={`project-${project.id}-heading`}
      className="scroll-mt-6"
    >
      <div className="border-b-2 border-ink pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="type-label text-[9px] text-muted">
              Job {jobNumber(project.id)} · Prepared by {companyName}
            </p>
            <h2
              id={`project-${project.id}-heading`}
              className="type-title mt-1 text-[clamp(1.75rem,5vw,2.75rem)] leading-none"
            >
              {project.projectName}
            </h2>
          </div>
          <Stamp
            className={cn(
              "px-2.5 py-1 text-[9px]",
              project.status === "planning"
                ? "border-line-strong text-muted"
                : "border-ink text-ink",
            )}
          >
            {PROJECT_STATUS_LABEL[project.status]}
          </Stamp>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {projectStatusNote(project.status)}.
          {project.currentPhase ? ` Current phase: ${project.currentPhase}.` : ""}
        </p>

        <div className="mt-4 max-w-md">
          <div className="flex items-baseline justify-between gap-3">
            <p className="type-label text-[8px] text-muted">Progress</p>
            <p className="type-data text-[11px] text-ink-soft">{project.progressPercentage}%</p>
          </div>
          <Progress
            value={project.progressPercentage}
            className="mt-1.5"
            aria-label={`${project.projectName} progress`}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <DataCard label="Original contract" value={formatMoney(project.estimatedCost)} />
        <DataCard
          label="Approved changes"
          value={formatSignedMoney(project.approvedValue)}
          detail={
            project.approvedValue === 0
              ? "No approved changes."
              : "Added to the contract."
          }
        />
        <DataCard
          label="Current total"
          value={formatMoney(project.revisedCost)}
          className="border-ink bg-brand-surface"
        />
      </div>

      {project.pendingCount > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-2 border-revision bg-paper-raised p-4">
          <div>
            <p className="type-label text-[9px] text-revision">Action needed</p>
            <p className="mt-1 text-sm font-semibold text-ink">{pendingLabel}.</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {formatMoney(project.pendingValue)} in proposed changes.
            </p>
          </div>
          <p className="type-label text-[9px] text-muted">Review below</p>
        </div>
      ) : null}

      <div className="mt-6 border-b-2 border-ink pb-2">
        <p className="type-label text-muted">Changes to the contract</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="type-heading text-lg">Change orders</h3>
          <p className="type-label text-[9px] text-muted">
            {orders.length} {orders.length === 1 ? "record" : "records"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {sortedOrders.length ? (
          sortedOrders.map((order) => (
            <div key={order.id} id={`change-${order.id}`} className="scroll-mt-6">
              <ChangeOrderCard
                order={order}
                project={project}
                approvedTotal={project.approvedValue}
                signingEnabled={changeOrdersEnabled}
              />
              <p className="mt-1.5 px-1 text-[11px] text-muted">
                {order.status === "approved"
                  ? `Signed ${formatDate(order.signedAt)}`
                  : `Issued ${formatDate(order.createdAt)}`}
              </p>
            </div>
          ))
        ) : (
          <p className="border border-line bg-paper-raised px-4 py-4 text-sm leading-relaxed text-muted">
            No change orders have been issued. The contract stands at{" "}
            {formatMoney(project.estimatedCost)}.
          </p>
        )}
      </div>

      <ProjectHistory orders={orders} />
    </section>
  );
}
