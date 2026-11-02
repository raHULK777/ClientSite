"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, TitleBlock } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DailyLogForm } from "@/components/app/daily-log-form";
import { apiMutate, ClientApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import {
  CHANGE_ORDER_STATUS_LABEL,
  formatDate,
  formatDateTime,
  formatMoney,
  formatSignedMoney,
  jobNumber,
  PROJECT_STATUS_LABEL,
} from "@/lib/format";

import type { AuditEvent, ChangeOrder, ProjectDetail, SessionUser } from "@/lib/api-types";
import type { ChangeOrderStatus, ProjectStatus } from "@constructops/shared";

const STATUS_STAMP: Record<ProjectStatus, string> = {
  planning: "border-line-strong text-muted",
  active: "border-ink text-ink",
  completed: "border-ink bg-ink text-paper",
};

const CO_STAMP: Record<ChangeOrderStatus, string> = {
  pending: "border-revision text-revision",
  approved: "border-ink bg-ink text-paper",
  rejected: "border-line-strong text-muted",
};

const ACTION_LABEL: Record<string, string> = {
  "project.updated": "Project updated",
  "project.created": "Project opened",
  "change_order.created": "Change order issued",
  "change_order.updated": "Change order revised",
  "change_order.approved": "Change order approved",
  "change_order.rejected": "Change order declined",
};

function actionLabel(action: string): string {
  return (
    ACTION_LABEL[action] ??
    action
      .replace(/[._]/g, " ")
      .replace(/^\w/, (character) => character.toUpperCase())
  );
}

function eventTitle(event: AuditEvent): string | null {
  const title = event.metadata.title;
  return typeof title === "string" && title.trim() ? title : null;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function ProgressForm({
  detail,
  isAdmin,
}: {
  detail: ProjectDetail;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { project } = detail;
  const [phase, setPhase] = useState(project.currentPhase);
  const [progress, setProgress] = useState(String(project.progressPercentage));
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [cost, setCost] = useState(project.estimatedCost.toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const progressNumber = Math.min(100, Math.max(0, Number(progress) || 0));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const trimmedPhase = phase.trim();
    const amount = Number(cost);
    if (!trimmedPhase) {
      setError("Add the current phase.");
      return;
    }
    if (isAdmin && (!cost.trim() || !Number.isFinite(amount) || amount < 0)) {
      setError("Enter a contract amount, zero or more.");
      return;
    }

    const payload: Record<string, string | number> = {
      currentPhase: trimmedPhase,
      progressPercentage: Math.round(progressNumber),
    };
    if (isAdmin) {
      payload.status = status;
      payload.estimatedCost = amount;
    }

    setPending(true);
    try {
      await apiMutate(`/protected/projects/${project.id}`, "PATCH", payload);
      setSaved(true);
      setPending(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ClientApiError ? cause.message : "The project could not be saved.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="sheet-phase" label="Current phase">
          <Input
            id="sheet-phase"
            value={phase}
            onChange={(event) => {
              setPhase(event.target.value);
              setSaved(false);
            }}
            placeholder="Rough-in"
          />
        </Field>

        <Field id="sheet-progress" label="Progress" hint="Percent complete, 0 to 100.">
          <Input
            id="sheet-progress"
            type="number"
            min={0}
            max={100}
            step={1}
            value={progress}
            onChange={(event) => {
              setProgress(event.target.value);
              setSaved(false);
            }}
            aria-describedby={fieldDescribedBy("sheet-progress", {
              hint: "Percent complete, 0 to 100.",
            })}
          />
        </Field>
      </div>

      {isAdmin ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="sheet-status" label="Status">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as ProjectStatus);
                setSaved(false);
              }}
            >
              <SelectTrigger id="sheet-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field id="sheet-cost" label="Original contract" hint="Does not include change orders.">
            <Input
              id="sheet-cost"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={cost}
              onChange={(event) => {
                setCost(event.target.value);
                setSaved(false);
              }}
              aria-describedby={fieldDescribedBy("sheet-cost", {
                hint: "Does not include change orders.",
              })}
            />
          </Field>
        </div>
      ) : (
        <p className="border-l-2 border-line-strong bg-paper px-3 py-2 text-xs leading-relaxed text-muted">
          The office controls the project status and contract amount. Field updates are limited
          to phase and progress.
        </p>
      )}

      <div aria-live="polite" aria-atomic="true">
        {error ? (
          <p className="border border-revision bg-paper px-3 py-2.5 text-sm leading-relaxed text-revision">
            {error}
          </p>
        ) : null}
        {saved && !error ? (
          <p className="type-label border border-ink bg-paper px-3 py-2 text-[9px] text-ink">
            Project record saved
          </p>
        ) : null}
      </div>

      <div className="border-t border-line pt-4">
        <Button type="submit" loading={pending}>
          Save progress
        </Button>
      </div>
    </form>
  );
}

function ChangeOrderRows({
  projectId,
  changeOrders,
}: {
  projectId: string;
  changeOrders: ChangeOrder[];
}) {
  if (!changeOrders.length) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-10 text-center">
          <p className="type-heading text-base">No change orders on this job.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
            The contract stands as written. Issue a change order when the work or price moves.
          </p>
        </td>
      </tr>
    );
  }

  return (
    <>
      {changeOrders.map((order) => (
        <ScheduleRow key={order.id}>
          <ScheduleCell>
            <Link
              href={`/app/projects/${projectId}/change-orders/${order.id}`}
              className="flex min-h-11 flex-col justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised"
            >
              <span className="text-sm font-semibold text-ink">{order.title}</span>
              <span className="mt-0.5 text-[11px] text-muted">
                {order.signerName
                  ? `Signed by ${order.signerName} · ${formatDate(order.signedAt)}`
                  : `Issued ${formatDate(order.createdAt)}`}
              </span>
            </Link>
          </ScheduleCell>
          <ScheduleCell>
            <Stamp className={cn("px-1.5 py-0.5 text-[9px]", CO_STAMP[order.status])}>
              {CHANGE_ORDER_STATUS_LABEL[order.status]}
            </Stamp>
          </ScheduleCell>
          <ScheduleAmount
            className={cn(order.costImpact < 0 && "text-ink-soft")}
          >
            {formatSignedMoney(order.costImpact)}
          </ScheduleAmount>
          <ScheduleCell className="hidden text-xs text-muted md:table-cell">
            {order.signedAt ? formatDate(order.signedAt) : formatDate(order.createdAt)}
          </ScheduleCell>
          <ScheduleCell className="text-right">
            <Button asChild variant="ghost" size="sm" className="px-2 normal-case tracking-normal">
              <Link href={`/app/projects/${projectId}/change-orders/${order.id}`}>Open</Link>
            </Button>
          </ScheduleCell>
        </ScheduleRow>
      ))}
    </>
  );
}

export function ProjectSheet({
  detail,
  user,
  events,
  changeOrdersEnabled,
}: {
  detail: ProjectDetail;
  user: SessionUser;
  events: AuditEvent[];
  changeOrdersEnabled: boolean;
}) {
  const router = useRouter();
  const { project, changeOrders, changeOrderSummary } = detail;
  const isAdmin = user.role === "admin";
  const canIssue = isAdmin && changeOrdersEnabled;
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(project.clientId ?? "");
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientPending, setClientPending] = useState(false);

  async function assignClient() {
    setClientError(null);
    setClientPending(true);
    try {
      await apiMutate(`/protected/projects/${project.id}`, "PATCH", {
        clientId: selectedClientId || null,
      });
      router.refresh();
    } catch (cause) {
      setClientError(cause instanceof ClientApiError ? cause.message : "Could not assign client.");
    } finally {
      setClientPending(false);
    }
  }
  const approvedValue = changeOrders
    .filter((order) => order.status === "approved")
    .reduce((total, order) => total + order.costImpact, 0);
  const pendingValue = changeOrders
    .filter((order) => order.status === "pending")
    .reduce((total, order) => total + order.costImpact, 0);
  const revised = project.estimatedCost + approvedValue;
  const sortedOrders = [...changeOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/app"
            className="type-label inline-flex min-h-11 items-center text-[9px] text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
          >
            Project index
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="type-stencil text-xs text-muted">{jobNumber(project.id)}</span>
            <Stamp className={cn("px-1.5 py-0.5 text-[9px]", STATUS_STAMP[project.status])}>
              {PROJECT_STATUS_LABEL[project.status]}
            </Stamp>
          </div>
          <h1 className="type-title mt-2 max-w-3xl text-[clamp(2rem,4vw,3.25rem)]">
            {project.projectName}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {project.clientName ?? "No client assigned"}
            {project.clientEmail ? ` · ${project.clientEmail}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && project.clientId ? (
            <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">Edit client</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogTitle>Assign client</DialogTitle>
                <div className="flex flex-col gap-4 mt-4">
                  <p className="text-sm text-ink-soft">
                    Choose an existing client or create a new one in the Users page.
                  </p>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="h-12 border border-ink bg-paper-raised px-3 text-sm"
                  >
                    <option value="">No client assigned</option>
                    {detail.clients?.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.email ? `· ${client.email}` : ""}
                      </option>
                    ))}
                  </select>
                  {clientError && (
                    <p className="text-sm text-revision">{clientError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setClientDialogOpen(false)} disabled={clientPending}>
                      Cancel
                    </Button>
                    <Button onClick={assignClient} loading={clientPending} disabled={clientPending}>
                      Assign
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          {isAdmin && !project.clientId ? (
            <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Assign client</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogTitle>Assign client</DialogTitle>
                <div className="flex flex-col gap-4 mt-4">
                  <p className="text-sm text-ink-soft">
                    Choose an existing client or create a new one in the Users page.
                  </p>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="h-12 border border-ink bg-paper-raised px-3 text-sm"
                  >
                    <option value="">No client assigned</option>
                    {detail.clients?.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.email ? `· ${client.email}` : ""}
                      </option>
                    ))}
                  </select>
                  {clientError && (
                    <p className="text-sm text-revision">{clientError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setClientDialogOpen(false)} disabled={clientPending}>
                      Cancel
                    </Button>
                    <Button onClick={assignClient} loading={clientPending} disabled={clientPending}>
                      Assign
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          {canIssue ? (
            <Button asChild>
              <Link href={`/app/projects/${project.id}/change-orders/new`}>
                New change order
              </Link>
            </Button>
          ) : isAdmin && !changeOrdersEnabled ? (
            <Button disabled title="Change orders are turned off for this workspace.">
              Change orders off
            </Button>
          ) : null}
        </div>
      </header>

      <Sheet className="bg-paper-raised">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="type-label text-muted">Current phase</p>
                <p className="type-heading mt-1 text-lg">{project.currentPhase}</p>
              </div>
              <span className="type-data text-sm text-muted">
                {clampPercent(project.progressPercentage)}%
              </span>
            </div>
            <Progress
              value={project.progressPercentage}
              className="mt-3"
              aria-label={`${project.projectName} progress`}
            />
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {changeOrderSummary.pending
                ? `${changeOrderSummary.pending} ${
                    changeOrderSummary.pending === 1 ? "change" : "changes"
                  } awaiting client signature.`
                : "No changes are awaiting client signature."}{" "}
              Revised contract reflects approved changes only.
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-3">
              <div>
                <dt className="type-label text-[9px] text-muted">Approved</dt>
                <dd className="type-data mt-1 text-sm">{changeOrderSummary.approved}</dd>
              </div>
              <div>
                <dt className="type-label text-[9px] text-muted">Awaiting</dt>
                <dd className="type-data mt-1 text-sm">{changeOrderSummary.pending}</dd>
              </div>
              <div>
                <dt className="type-label text-[9px] text-muted">Declined</dt>
                <dd className="type-data mt-1 text-sm">{changeOrderSummary.rejected}</dd>
              </div>
            </dl>
          </div>

          <div className="border-t-2 border-ink p-5 sm:p-6 lg:border-l-2 lg:border-t-0">
            <p className="type-label text-muted">Contract record</p>
            <dl className="mt-3 flex flex-col">
              <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5">
                <dt className="text-sm text-ink-soft">Original contract</dt>
                <dd className="type-data text-sm">{formatMoney(project.estimatedCost)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5">
                <dt className="text-sm text-ink-soft">Approved changes</dt>
                <dd className="type-data text-sm">{formatSignedMoney(approvedValue)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-line py-2.5">
                <dt className="text-sm text-ink-soft">
                  Awaiting signature
                  <span className="mt-0.5 block text-[11px] text-muted">Not in revised</span>
                </dt>
                <dd className="type-data text-sm text-revision">{formatSignedMoney(pendingValue)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 bg-paper-sunk px-2 py-3">
                <dt className="type-label text-[9px] text-ink">Revised contract</dt>
                <dd className="type-heading text-lg">{formatMoney(revised)}</dd>
              </div>
            </dl>
          </div>
        </div>
        <TitleBlock>
          <span>
            <span className="text-paper/55">Job </span>
            {jobNumber(project.id)}
          </span>
          <span>
            <span className="text-paper/55">Client </span>
            {project.clientName ?? "—"}
          </span>
          <span>
            <span className="text-paper/55">Phase </span>
            {project.currentPhase}
          </span>
          <span>
            <span className="text-paper/55">Updated </span>
            {formatDate(project.updatedAt)}
          </span>
        </TitleBlock>
      </Sheet>

      <Tabs defaultValue="takeoff">
        <TabsList>
          <TabsTrigger value="takeoff">Takeoff</TabsTrigger>
          <TabsTrigger value="change-orders">
            Change orders
            <span className="ml-1.5 text-[10px] text-muted">({changeOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="daily-logs">
            Site logs
            <span className="ml-1.5 text-[10px] text-muted">({detail.dailyLogs.length})</span>
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="takeoff">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section aria-labelledby="cost-sheet-heading">
              <div className="border-b-2 border-ink pb-2">
                <p className="type-label text-muted">Cost sheet</p>
                <h2 id="cost-sheet-heading" className="type-heading mt-1 text-lg">
                  Contract values
                </h2>
              </div>
              <Schedule className="mt-3">
                <ScheduleTable className="min-w-0">
                  <ScheduleBody>
                    <ScheduleRow>
                      <ScheduleCell>
                        <span className="text-sm text-ink">Original contract</span>
                        <span className="mt-0.5 block text-[11px] text-muted">As written</span>
                      </ScheduleCell>
                      <ScheduleAmount>{formatMoney(project.estimatedCost)}</ScheduleAmount>
                    </ScheduleRow>
                    <ScheduleRow>
                      <ScheduleCell>
                        <span className="text-sm text-ink">Approved changes</span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {changeOrderSummary.approved} signed
                        </span>
                      </ScheduleCell>
                      <ScheduleAmount>{formatSignedMoney(approvedValue)}</ScheduleAmount>
                    </ScheduleRow>
                    <ScheduleRow>
                      <ScheduleCell>
                        <span className="text-sm text-ink">Awaiting signature</span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {changeOrderSummary.pending} pending · excluded from revised
                        </span>
                      </ScheduleCell>
                      <ScheduleAmount className="text-revision">
                        {formatSignedMoney(pendingValue)}
                      </ScheduleAmount>
                    </ScheduleRow>
                    <ScheduleRow className="bg-paper-sunk">
                      <ScheduleCell>
                        <span className="type-label text-[9px] text-ink">Revised contract</span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          Original plus approved changes
                        </span>
                      </ScheduleCell>
                      <ScheduleAmount className="type-heading text-base">
                        {formatMoney(revised)}
                      </ScheduleAmount>
                    </ScheduleRow>
                  </ScheduleBody>
                </ScheduleTable>
              </Schedule>
              <p className="mt-3 border-l-2 border-line-strong px-3 text-xs leading-relaxed text-muted">
                Line items live on the estimate sheet. This job carries the approved contract
                total.
              </p>
            </section>

            <section aria-labelledby="progress-heading">
              <div className="border-b-2 border-ink pb-2">
                <p className="type-label text-muted">Field record</p>
                <h2 id="progress-heading" className="type-heading mt-1 text-lg">
                  Update progress
                </h2>
              </div>
              <div className="mt-4">
                <ProgressForm detail={detail} isAdmin={isAdmin} />
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="change-orders">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-2">
            <div>
              <p className="type-label text-muted">Revision log</p>
              <h2 className="type-heading mt-1 text-lg">Change orders</h2>
            </div>
            {canIssue ? (
              <Button asChild size="sm" className="normal-case tracking-normal">
                <Link href={`/app/projects/${project.id}/change-orders/new`}>
                  New change order
                </Link>
              </Button>
            ) : null}
          </div>

          {!changeOrdersEnabled && isAdmin ? (
            <p className="mt-3 border border-line-strong bg-brand-surface px-3 py-2.5 text-sm leading-relaxed text-ink-soft">
              Change orders are turned off for this workspace. Re-enable them in Settings before
              issuing a new one.
            </p>
          ) : null}

          <Schedule className="mt-3">
            <ScheduleTable className="min-w-[720px]">
              <ScheduleHead>
                <tr>
                  <ScheduleHeaderCell>Change</ScheduleHeaderCell>
                  <ScheduleHeaderCell>Status</ScheduleHeaderCell>
                  <ScheduleHeaderCell className="text-right">Amount</ScheduleHeaderCell>
                  <ScheduleHeaderCell className="hidden md:table-cell">Record</ScheduleHeaderCell>
                  <ScheduleHeaderCell className="text-right">Open</ScheduleHeaderCell>
                </tr>
              </ScheduleHead>
              <ScheduleBody>
                <ChangeOrderRows projectId={project.id} changeOrders={sortedOrders} />
              </ScheduleBody>
            </ScheduleTable>
          </Schedule>
        </TabsContent>

        <TabsContent value="daily-logs">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-2">
            <div>
              <p className="type-label text-muted">Site record</p>
              <h2 className="type-heading mt-1 text-lg">Daily logs</h2>
            </div>
          </div>

          <div className="mt-5">
            <DailyLogForm
              projectId={project.id}
              onSubmit={async (values) => {
                await apiMutate(`/protected/projects/${project.id}/daily-logs`, "POST", values);
                router.refresh();
              }}
            />
          </div>

          <div className="mt-5">
            {detail.dailyLogs.length ? (
              <ol className="max-w-2xl">
                {detail.dailyLogs.map((log) => (
                  <li key={log.id} className="relative flex gap-4 border-b border-line py-4">
                    <span className="relative flex w-4 shrink-0 justify-center">
                      <span className="mt-1.5 h-2 w-2 border border-ink bg-brand-bg" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="type-label text-[9px] text-muted">{log.date}</span>
                        {log.authorName ? (
                          <span className="text-[11px] text-muted">by {log.authorName}</span>
                        ) : null}
                        {log.crewSize !== null ? (
                          <span className="text-[11px] text-muted">crew {log.crewSize}</span>
                        ) : null}
                        {log.weather ? (
                          <span className="text-[11px] text-muted">{log.weather}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-ink">{log.summary}</p>
                      {log.details ? (
                        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{log.details}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="max-w-xl text-sm leading-relaxed text-muted">
                No site logs recorded yet. Field staff and the office can add dated entries here.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="border-b-2 border-ink pb-2">
            <p className="type-label text-muted">Office record</p>
            <h2 className="type-heading mt-1 text-lg">Activity</h2>
          </div>

          {!isAdmin ? (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              Only the office can open the workspace activity record. Field updates still stamp
              the project time.
            </p>
          ) : events.length ? (
            <ol className="mt-4 max-w-2xl">
              {events.map((event, index) => (
                <li key={event.id} className="relative flex gap-4 pb-5">
                  <span className="relative flex w-4 shrink-0 justify-center">
                    <span className="mt-1.5 h-2 w-2 border border-ink bg-brand-bg" />
                    {index < events.length - 1 ? (
                      <span className="absolute bottom-0 top-3 w-px bg-line" aria-hidden="true" />
                    ) : null}
                  </span>
                  <div className="min-w-0 pb-1">
                    <p className="type-label text-[9px] text-muted">
                      {formatDateTime(event.createdAt)}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">
                      {actionLabel(event.action)}
                    </p>
                    {eventTitle(event) ? (
                      <p className="mt-0.5 text-sm text-ink-soft">{eventTitle(event)}</p>
                    ) : null}
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {event.entityType}
                      {event.entityId ? ` · ${event.entityId.slice(0, 8)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              No recorded changes on this job yet.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
