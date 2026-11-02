"use client";

import { Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { apiMutate, ClientApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import {
  CHANGE_ORDER_STATUS_LABEL,
  formatDateTime,
  formatMoney,
  formatSignedMoney,
  jobNumber,
} from "@/lib/format";

import type { ChangeOrder, Project } from "@/lib/api-types";

const CONSENT_TEXT = "I approve this change order and the revised contract amount.";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character,
  );
}

function statusTone(status: ChangeOrder["status"]): string {
  if (status === "pending") return "border-revision text-revision";
  if (status === "approved") return "border-ink text-ink";
  return "border-line-strong text-muted";
}

function printApprovedRecord({
  project,
  order,
  priorApproved,
  revised,
}: {
  project: Project;
  order: ChangeOrder;
  priorApproved: number;
  revised: number;
}) {
  const popup = window.open("", "_blank", "width=760,height=920");
  if (!popup) return false;

  const rows = [
    ["Original contract", formatMoney(project.estimatedCost)],
    ["Previously approved", formatMoney(priorApproved)],
    ["This change", formatSignedMoney(order.costImpact)],
    ["Revised contract", formatMoney(revised)],
  ]
    .map(
      ([label, value]) =>
        `<tr><td>${escapeHtml(label ?? "")}</td><td class="amount">${escapeHtml(value ?? "")}</td></tr>`,
    )
    .join("");

  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(order.title)} · ${escapeHtml(jobNumber(project.id))}</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #15202b; background: #fff; font: 13px/1.5 Arial, Helvetica, sans-serif; }
  .sheet { max-width: 680px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #15202b; padding-bottom: 10px; }
  .eyebrow, .label { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: #5c6a76; }
  h1 { font-size: 24px; line-height: 1.15; margin: 4px 0 0; }
  h2 { font-size: 17px; margin: 0 0 4px; }
  .stamp { border: 2px solid #15202b; padding: 6px 10px; font-size: 15px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; transform: rotate(-4deg); align-self: flex-start; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; border-bottom: 1px solid #c9d0d5; padding: 14px 0; }
  .scope { padding: 16px 0; border-bottom: 1px solid #c9d0d5; }
  .scope p { margin: 0; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { border-bottom: 1px solid #c9d0d5; padding: 8px 0; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
  .signature { display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; border-top: 1px solid #15202b; padding-top: 12px; margin-top: 18px; }
  .signature .name { border-bottom: 1px solid #15202b; font-size: 18px; padding-bottom: 4px; }
  .consent { margin-top: 18px; font-size: 11px; color: #3e4a55; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #c9d0d5; font-size: 9px; color: #5c6a76; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div>
        <p class="eyebrow">Approved change order</p>
        <h1>${escapeHtml(order.title)}</h1>
      </div>
      <div class="stamp">Approved</div>
    </div>
    <div class="meta">
      <div><span class="label">Project</span><br />${escapeHtml(project.projectName)}</div>
      <div><span class="label">Job number</span><br />${escapeHtml(jobNumber(project.id))}</div>
      <div><span class="label">Signed by</span><br />${escapeHtml(order.signerName ?? "")}</div>
      <div><span class="label">Signed at</span><br />${escapeHtml(formatDateTime(order.signedAt))}</div>
    </div>
    <div class="scope">
      <p class="label">Scope of change</p>
      <p>${escapeHtml(order.description ?? "As described by the office.")}</p>
    </div>
    <table aria-label="Contract amounts">${rows}</table>
    <div class="signature">
      <div>
        <span class="label">Electronic signature</span>
        <div class="name">${escapeHtml(order.signerName ?? "")}</div>
      </div>
      <div>
        <span class="label">Date</span>
        <div class="name">${escapeHtml(formatDateTime(order.signedAt))}</div>
      </div>
    </div>
    <p class="consent">${escapeHtml(CONSENT_TEXT)}</p>
    <p class="footer">${escapeHtml(project.projectName)} · ${escapeHtml(jobNumber(project.id))} · This record was printed from the client portal.</p>
  </div>
</body>
</html>`);
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}

export function ChangeOrderCard({
  order,
  project,
  approvedTotal,
  signingEnabled,
}: {
  order: ChangeOrder;
  project: Project;
  approvedTotal: number;
  signingEnabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [consent, setConsent] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [pending, setPending] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<ChangeOrder | null>(null);
  const [decidedAt, setDecidedAt] = useState<string | null>(null);
  const [decidedPrior, setDecidedPrior] = useState<number | null>(null);

  const current = record ?? order;
  const isPending = current.status === "pending";
  const isApproved = current.status === "approved";
  const priorApproved =
    decidedPrior ?? (isApproved && !record ? approvedTotal - current.costImpact : approvedTotal);
  const revisedIfApproved = project.estimatedCost + priorApproved + current.costImpact;
  const revisedNow = project.estimatedCost + priorApproved + (isApproved ? current.costImpact : 0);
  const nameValid = signerName.trim().length >= 2;

  function resetTransient() {
    setError(null);
    setConfirmDecline(false);
  }

  async function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nameValid || !consent) {
      setError("Type your full name and check the consent before signing.");
      return;
    }
    setError(null);
    setPending("approve");
    try {
      const result = await apiMutate<{ changeOrder: ChangeOrder }>(
        `/protected/change-orders/${order.id}/approve`,
        "PATCH",
        { signerName: signerName.trim(), consent: true },
      );
      setRecord(result.changeOrder);
      setDecidedAt(new Date().toISOString());
      setDecidedPrior(approvedTotal);
      setPending(null);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ClientApiError
          ? cause.message
          : "The signature could not be recorded. Try again.",
      );
      setPending(null);
    }
  }

  async function decline() {
    setError(null);
    setPending("decline");
    try {
      const result = await apiMutate<{ changeOrder: ChangeOrder }>(
        `/protected/change-orders/${order.id}/reject`,
        "PATCH",
        {},
      );
      setRecord(result.changeOrder);
      setDecidedAt(new Date().toISOString());
      setDecidedPrior(approvedTotal);
      setPending(null);
      setConfirmDecline(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ClientApiError
          ? cause.message
          : "The decision could not be recorded. Try again.",
      );
      setPending(null);
    }
  }

  function handlePrint() {
    setError(null);
    const opened = printApprovedRecord({
      project,
      order: current,
      priorApproved,
      revised: revisedNow,
    });
    if (!opened) {
      setError("Allow pop-ups to print this record.");
    }
  }

  const actionLabel = isPending
    ? "Review and approve"
    : isApproved
      ? "View signed record"
      : "View decision";

  return (
    <Sheet
      className={cn(
        "bg-paper-raised",
        isPending && "border-l-4 border-l-revision",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="type-label text-[9px] text-muted">
              Change order · issued {formatDateTime(order.createdAt)}
            </p>
            <h3 className="type-heading mt-1 text-lg leading-snug">{order.title}</h3>
          </div>
          <span
            className={cn(
              "type-label inline-flex border px-2 py-1 text-[8px]",
              statusTone(current.status),
            )}
          >
            {CHANGE_ORDER_STATUS_LABEL[current.status]}
          </span>
        </div>

        {order.description ? (
          <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {order.description}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 border-y border-line py-3 sm:grid-cols-2">
          <div>
            <p className="type-label text-[8px] text-muted">Change to contract</p>
            <p className="type-data mt-0.5 text-lg text-ink">
              {formatSignedMoney(order.costImpact)}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="type-label text-[8px] text-muted">
              {isPending ? "If approved, revised contract" : "Revised contract"}
            </p>
            <p className="type-data mt-0.5 text-lg text-ink">
              {formatMoney(isPending ? revisedIfApproved : revisedNow)}
            </p>
          </div>
        </div>

        {isApproved ? (
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            Approved by {current.signerName ?? "the client"} on{" "}
            {formatDateTime(current.signedAt)}.
          </p>
        ) : current.status === "rejected" ? (
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            Declined. The contract stays at {formatMoney(revisedNow)}.
          </p>
        ) : null}

        <div className="mt-4">
          <Button
            variant={isPending ? "primary" : "secondary"}
            onClick={() => {
              resetTransient();
              setOpen(true);
            }}
            disabled={isPending && !signingEnabled}
          >
            {actionLabel}
          </Button>
          {isPending && !signingEnabled ? (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              The office has paused change order signing.
            </p>
          ) : null}
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetTransient();
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto bg-paper-raised p-0">
          <div className="border-b-2 border-ink px-5 py-4 pr-14">
            <DialogTitle>
              {isPending ? "Review change order" : "Change order record"}
            </DialogTitle>
            <DialogDescription>
              {isPending
                ? "Read the scope and the revised contract before you sign."
                : "The decision below is part of the project record."}
            </DialogDescription>
          </div>

          <div className="p-5">
            <p className="type-label text-[9px] text-muted">
              {project.projectName} · {jobNumber(project.id)}
            </p>
            <h3 className="type-heading mt-1 text-xl leading-snug">{current.title}</h3>

            {!isPending ? (
              <div aria-live="polite" className="mt-4">
                <Stamp
                  className={cn(
                    "stamp-land px-4 py-2 text-xl",
                    isApproved ? "border-ink text-ink" : "border-line-strong text-muted",
                  )}
                >
                  {isApproved ? "Approved" : "Declined"}
                </Stamp>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  {isApproved
                    ? `Signed by ${current.signerName ?? "the client"} on ${formatDateTime(current.signedAt)}.`
                    : decidedAt
                      ? `Recorded ${formatDateTime(decidedAt)}. The office has been notified.`
                      : "Declined. The office has been notified."}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {isApproved
                    ? "This decision cannot be changed here. Contact the office if something is wrong."
                    : "No reason is required. The contract is unchanged."}
                </p>

                <dl className="mt-5 divide-y divide-line border-y border-line">
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-xs text-muted">Original contract</dt>
                    <dd className="type-data text-sm text-ink">
                      {formatMoney(project.estimatedCost)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-xs text-muted">Previously approved</dt>
                    <dd className="type-data text-sm text-ink">
                      {formatMoney(priorApproved)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-xs text-muted">This change</dt>
                    <dd className="type-data text-sm text-ink">
                      {formatSignedMoney(current.costImpact)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-xs font-semibold text-ink">Revised contract</dt>
                    <dd className="type-data text-base font-semibold text-ink">
                      {formatMoney(revisedNow)}
                    </dd>
                  </div>
                </dl>

                {isApproved ? (
                  <>
                    <p className="mt-4 text-xs leading-relaxed text-muted">
                      {CONSENT_TEXT}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={handlePrint}>
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Print record
                      </Button>
                    </div>
                  </>
                ) : null}
                {error ? (
                  <p
                    role="alert"
                    className="mt-4 border border-revision bg-paper px-3 py-2.5 text-sm text-revision"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                  {current.description ?? "The office will describe the scope of this change."}
                </p>

                <dl className="mt-5 divide-y divide-line border-y border-line">
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-xs text-muted">Original contract</dt>
                    <dd className="type-data text-sm text-ink">
                      {formatMoney(project.estimatedCost)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-xs text-muted">Previously approved</dt>
                    <dd className="type-data text-sm text-ink">{formatMoney(priorApproved)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-xs text-muted">This change</dt>
                    <dd className="type-data text-sm text-ink">
                      {formatSignedMoney(current.costImpact)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-xs font-semibold text-ink">Revised contract if approved</dt>
                    <dd className="type-data text-base font-semibold text-ink">
                      {formatMoney(revisedIfApproved)}
                    </dd>
                  </div>
                </dl>

                <form onSubmit={approve} className="mt-5 flex flex-col gap-4" noValidate>
                  <Field
                    id={`signer-${order.id}`}
                    label="Type your full name"
                    hint="This is your electronic signature."
                    error={
                      error && !nameValid
                        ? "Use the name of the person approving this change."
                        : undefined
                    }
                  >
                    <Input
                      id={`signer-${order.id}`}
                      value={signerName}
                      onChange={(event) => {
                        setSignerName(event.target.value);
                        setError(null);
                      }}
                      autoComplete="name"
                      autoCapitalize="words"
                      disabled={pending !== null}
                      aria-describedby={fieldDescribedBy(`signer-${order.id}`, {
                        hint: "This is your electronic signature.",
                      })}
                    />
                  </Field>

                  <label className="flex cursor-pointer items-start gap-3 border border-line bg-paper p-3">
                    <Checkbox
                      checked={consent}
                      onCheckedChange={(checked) => {
                        setConsent(checked === true);
                        setError(null);
                      }}
                      disabled={pending !== null}
                    />
                    <span className="text-sm leading-relaxed text-ink-soft">
                      {CONSENT_TEXT}
                    </span>
                  </label>

                  <p className="text-xs leading-relaxed text-muted">
                    Your name, the time, and this decision are recorded. The office is notified
                    immediately.
                  </p>

                  <div aria-live="polite" aria-atomic="true">
                    {error ? (
                      <p
                        role="alert"
                        className="border border-revision bg-paper px-3 py-2.5 text-sm leading-relaxed text-revision"
                      >
                        {error}
                      </p>
                    ) : null}
                  </div>

                  <div className="border-t border-line pt-4">
                    <Button
                      type="submit"
                      size="lg"
                      loading={pending === "approve"}
                      disabled={!nameValid || !consent || pending !== null}
                      className="w-full sm:w-auto"
                    >
                      Sign and approve
                    </Button>
                  </div>
                </form>

                <div className="mt-6 border-t border-line pt-4">
                  {confirmDecline ? (
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Decline this change? No reason is needed.
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        The office will be notified. The contract stays as it is.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setConfirmDecline(false)}
                          disabled={pending !== null}
                        >
                          Keep reviewing
                        </Button>
                        <Button
                          variant="revision"
                          onClick={decline}
                          loading={pending === "decline"}
                          disabled={pending !== null}
                        >
                          Yes, decline
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmDecline(true)}
                      disabled={pending !== null}
                    >
                      Decline this change
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
