"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Schedule, ScheduleBody, ScheduleCell, ScheduleRow } from "@/components/ui/schedule";
import { Sheet, TitleBlock } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiMutate } from "@/lib/client-api";
import { CoreApiError } from "@/lib/core";
import { cn } from "@/lib/cn";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatSignedMoney,
  jobNumber,
  PROJECT_STATUS_LABEL,
} from "@/lib/format";

import type { AuditEvent, ChangeOrder, DailyLog, ProjectDetail, SessionUser, Message } from "@/lib/api-types";
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

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function PortalProjectDetail({
  detail,
  user,
  events,
  projectChatEnabled,
}: {
  detail: ProjectDetail;
  user: SessionUser;
  events: AuditEvent[];
  projectChatEnabled: boolean;
}) {
  const router = useRouter();
  const { project, changeOrders, changeOrderSummary, dailyLogs, messages } = detail;
  const isCompleted = project.status === "completed";
  const approvedValue = changeOrders
    .filter((order) => order.status === "approved")
    .reduce((total, order) => total + order.costImpact, 0);
  const pendingValue = changeOrders
    .filter((order) => order.status === "pending")
    .reduce((total, order) => total + order.costImpact, 0);
  const revised = project.estimatedCost + approvedValue;

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      await apiMutate(`/protected/projects/${project.id}/messages`, "POST", { body: newMessage.trim() });
      setNewMessage("");
      router.refresh();
    } catch (cause) {
      alert(cause instanceof CoreApiError ? cause.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/portal"
            className="type-label inline-flex min-h-11 items-center text-[9px] text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
          >
            My projects
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
        </div>

        <div className="type-data text-sm text-muted">
          {clampPercent(project.progressPercentage)}%
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
                  } awaiting your signature.`
                : "No changes are awaiting your signature."}{" "}
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
            <span className="text-paper/55">Phase </span>
            {project.currentPhase}
          </span>
          <span>
            <span className="text-paper/55">Progress </span>
            {clampPercent(project.progressPercentage)}%
          </span>
          <span>
            <span className="text-paper/55">Updated </span>
            {formatDate(project.updatedAt)}
          </span>
        </TitleBlock>
      </Sheet>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="change-orders">
            Change orders
            <span className="ml-1.5 text-[10px] text-muted">({changeOrders.length})</span>
          </TabsTrigger>
          <TabsTrigger value="daily-logs">
            Daily logs
            <span className="ml-1.5 text-[10px] text-muted">({dailyLogs.length})</span>
          </TabsTrigger>
          {projectChatEnabled && (
            <TabsTrigger value="chat">
              Chat
              <span className="ml-1.5 text-[10px] text-muted">
                {messages.length}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="progress">
          <div className="border-b-2 border-ink pb-2">
            <p className="type-label text-muted">Timeline</p>
            <h2 className="type-heading mt-1 text-lg">Project progress</h2>
          </div>
          <div className="mt-5">
            {events.length ? (
              <ol className="max-w-2xl">
                {events.map((event, index) => (
                  <li key={event.id} className="relative flex gap-4 border-b border-line py-4">
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
                        {event.action
                          .replace(/[._]/g, " ")
                          .replace(/^\w/, (c) => c.toUpperCase())}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {event.entityType}
                        {event.entityId ? ` · ${event.entityId.slice(0, 8)}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="max-w-xl text-sm leading-relaxed text-muted">
                No recorded changes on this job yet.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="change-orders">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-2">
            <div>
              <p className="type-label text-muted">Revision log</p>
              <h2 className="type-heading mt-1 text-lg">Change orders</h2>
            </div>
          </div>

          <Schedule className="mt-3">
            <ScheduleBody>
              {changeOrders.length ? (
                changeOrders.map((order) => (
                  <ScheduleRow key={order.id}>
                    <ScheduleCell>
                      <div className="flex min-h-11 flex-col justify-center">
                        <span className="text-sm font-semibold text-ink">{order.title}</span>
                        <span className="mt-0.5 text-[11px] text-muted">
                          {order.signerName
                            ? `Signed by ${order.signerName} · ${formatDate(order.signedAt)}`
                            : `Issued ${formatDate(order.createdAt)}`}
                        </span>
                      </div>
                    </ScheduleCell>
                    <ScheduleCell>
                      <Stamp className={cn("px-1.5 py-0.5 text-[9px]", CO_STAMP[order.status])}>
                        {order.status === "pending"
                          ? "Awaiting your signature"
                          : order.status === "approved"
                          ? "Approved"
                          : "Declined"}
                      </Stamp>
                    </ScheduleCell>
                    <ScheduleCell className="text-right">
                      <div className={cn(order.costImpact < 0 && "text-ink-soft")}>
                        {formatSignedMoney(order.costImpact)}
                      </div>
                    </ScheduleCell>
                  </ScheduleRow>
                ))
              ) : (
                <ScheduleRow>
                  <ScheduleCell colSpan={3} className="px-4 py-10 text-center">
                    <p className="type-heading text-base">No change orders on this job.</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
                      The contract stands as written. The office will issue a change order when work or price changes.
                    </p>
                  </ScheduleCell>
                </ScheduleRow>
              )}
            </ScheduleBody>
          </Schedule>

          {changeOrders.some((o) => o.status === "pending") && (
            <div className="mt-4 border border-revision bg-paper px-4 py-3 text-sm leading-relaxed text-revision">
              You have pending change orders. Review and approve or decline them from the change order cards.
            </div>
          )}
        </TabsContent>

        <TabsContent value="daily-logs">
          <div className="border-b-2 border-ink pb-2">
            <p className="type-label text-muted">Site record</p>
            <h2 className="type-heading mt-1 text-lg">Daily logs</h2>
          </div>

          <div className="mt-5">
            {dailyLogs.length ? (
              <ol className="max-w-2xl">
                {dailyLogs.map((log) => (
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
                No site logs recorded yet. The field team will add daily updates here.
              </p>
            )}
          </div>
        </TabsContent>

        {projectChatEnabled && (
          <TabsContent value="chat">
            <div className="border-b-2 border-ink pb-2">
              <p className="type-label text-muted">Project messages</p>
              <h2 className="type-heading mt-1 text-lg">Chat with field & office</h2>
            </div>

            <div className="mt-5 max-w-2xl">
              {messages.length ? (
                <ol className="max-h-[50vh] overflow-y-auto flex flex-col-reverse">
                  {messages.map((msg) => (
                    <li
                      key={msg.id}
                      className={`flex gap-3 py-3 ${msg.authorId === user.id ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`flex max-w-[75%] flex-col ${
                          msg.authorId === user.id ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`px-3 py-2 rounded-lg text-sm ${
                            msg.authorId === user.id
                              ? "bg-brand-primary text-paper"
                              : "bg-paper-raised border border-line"
                          }`}
                        >
                          {msg.body}
                        </div>
                        <div className="mt-1 flex gap-2 text-[10px] text-muted">
                          <span>{msg.authorName ?? "Unknown"}</span>
                          <span>{formatDateTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="max-w-xl text-sm leading-relaxed text-muted">
                  No messages yet. Start the conversation below.
                </p>
              )}

              <form onSubmit={sendMessage} className="mt-5 flex flex-col gap-3">
                <Field id="chat-message" label="Message">
                  <Input
                    id="chat-message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sending}
                    aria-describedby="chat-hint"
                  />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" size="md" loading={sending} disabled={sending || !newMessage.trim()}>
                    Send
                  </Button>
                </div>
                <p id="chat-hint" className="text-[11px] text-muted">
                  Messages are visible to the client, field staff, and office for this project.
                </p>
              </form>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}