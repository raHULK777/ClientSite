"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, TitleBlock } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { Textarea } from "@/components/ui/textarea";
import { apiMutate, ClientApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import {
  CHANGE_ORDER_STATUS_LABEL,
  formatMoney,
  formatSignedMoney,
  jobNumber,
} from "@/lib/format";

import type { ChangeOrder, Project } from "@/lib/api-types";

const CO_STAMP: Record<ChangeOrder["status"], string> = {
  pending: "border-revision text-revision",
  approved: "border-ink bg-ink text-paper",
  rejected: "border-line-strong text-muted",
};

export function ChangeOrderForm({
  mode,
  project,
  changeOrder,
  approvedValue,
  changeOrdersEnabled,
  canManage = true,
}: {
  mode: "create" | "edit";
  project: Project;
  changeOrder?: ChangeOrder;
  approvedValue: number;
  changeOrdersEnabled: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const readOnly =
    !canManage ||
    (mode === "edit" &&
      (!changeOrder || changeOrder.status !== "pending" || !changeOrdersEnabled));

  const [title, setTitle] = useState(changeOrder?.title ?? "");
  const [description, setDescription] = useState(changeOrder?.description ?? "");
  const [cost, setCost] = useState(
    changeOrder ? String(changeOrder.costImpact) : "",
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [costError, setCostError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const amount = Number(cost);
  const amountValid =
    cost.trim().length > 0 && Number.isFinite(amount) && Math.abs(amount) <= 99_999_999.99;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    setError(null);
    setTitleError(null);
    setCostError(null);
    setSaved(false);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    let invalid = false;
    if (trimmedTitle.length < 2) {
      setTitleError("Use at least two characters.");
      invalid = true;
    }
    if (!amountValid) {
      setCostError("Enter an amount between -99,999,999.99 and 99,999,999.99.");
      invalid = true;
    }
    if (invalid) return;

    const payload: {
      title: string;
      description?: string | null;
      costImpact: number;
    } = { title: trimmedTitle, costImpact: amount };
    if (trimmedDescription) payload.description = trimmedDescription;
    else if (mode === "edit") payload.description = null;

    setPending(true);
    try {
      if (mode === "create") {
        const result = await apiMutate<{ changeOrder: ChangeOrder }>(
          `/protected/projects/${project.id}/change-orders`,
          "POST",
          payload,
        );
        router.push(
          `/app/projects/${project.id}/change-orders/${result.changeOrder.id}`,
        );
        router.refresh();
      } else if (changeOrder) {
        await apiMutate(`/protected/change-orders/${changeOrder.id}`, "PATCH", payload);
        setSaved(true);
        setPending(false);
        router.refresh();
      }
    } catch (cause) {
      setError(
        cause instanceof ClientApiError
          ? cause.message
          : "The change order could not be saved.",
      );
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link
          href={`/app/projects/${project.id}`}
          className="type-label inline-flex min-h-11 items-center text-[9px] text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
        >
          {jobNumber(project.id)} · {project.projectName}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="type-stencil text-xs text-muted">
            {mode === "create" ? "New change order" : "Change order record"}
          </span>
          {changeOrder ? (
            <Stamp className={cn("px-1.5 py-0.5 text-[9px]", CO_STAMP[changeOrder.status])}>
              {CHANGE_ORDER_STATUS_LABEL[changeOrder.status]}
            </Stamp>
          ) : null}
        </div>
        <h1 className="type-title mt-2 max-w-3xl text-[clamp(2rem,4vw,3rem)]">
          {mode === "create" ? "Price the change" : changeOrder?.title ?? "Change order"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {mode === "create"
            ? "This is issued to the client as soon as it is saved. State the work, the reason, and the full price effect."
            : readOnly
              ? !canManage
                ? "The office manages change orders. This record is read-only."
                : changeOrder?.status === "approved"
                  ? "This change order has been signed and is now part of the contract record."
                  : changeOrder?.status === "rejected"
                    ? "This change order was declined. The contract is unchanged."
                    : "Change orders are turned off for this workspace. This record is read-only."
              : "Pending changes can be edited until the client signs."}
        </p>
      </header>

      {changeOrder && changeOrder.status === "approved" ? (
        <div className="border border-ink bg-brand-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="type-label text-[9px] text-muted">Signed by</p>
              <p className="type-heading mt-1 text-lg">{changeOrder.signerName ?? "Client"}</p>
            </div>
            <p className="type-data text-sm">
              {changeOrder.signedAt
                ? new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(changeOrder.signedAt))
                : "—"}
            </p>
          </div>
          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">
            Signature and consent are sealed in the record. The description and amount cannot be
            changed.
          </p>
        </div>
      ) : null}

      {changeOrder && changeOrder.status === "rejected" ? (
        <div className="border border-line-strong bg-paper-raised p-4 text-sm leading-relaxed text-ink-soft">
          Declined by the client. No amount was added to the contract. You can issue a new change
          order if the work still needs approval.
        </div>
      ) : null}

      {mode === "create" && !changeOrdersEnabled ? (
        <p className="border border-revision bg-paper px-3 py-2.5 text-sm leading-relaxed text-revision">
          Change orders are turned off for this workspace. Re-enable them in Settings before
          issuing a new one.
        </p>
      ) : null}

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]" noValidate>
        <Sheet className="bg-paper-raised">
          <div className="border-b-2 border-ink px-5 py-3">
            <p className="type-label text-[9px] text-muted">Revision</p>
            <h2 className="type-heading mt-0.5 text-base">Scope and price</h2>
          </div>

          <div className="flex flex-col gap-5 p-5">
            <Field
              id="change-title"
              label="Change"
              error={titleError ?? undefined}
              hint="What is changing, in one line."
            >
              <Input
                id="change-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setSaved(false);
                }}
                placeholder="Add a beam at the kitchen opening"
                readOnly={readOnly}
                aria-invalid={Boolean(titleError) || undefined}
                aria-describedby={fieldDescribedBy("change-title", {
                  hint: "What is changing, in one line.",
                  error: titleError ?? undefined,
                })}
                autoFocus={!readOnly}
              />
            </Field>

            <Field
              id="change-description"
              label="What changes and why"
              hint="Optional. Note the field condition, the client request, or the reason for the cost."
            >
              <Textarea
                id="change-description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setSaved(false);
                }}
                placeholder="Existing header is undersized for the new opening. Add a 24-foot LVL beam and posts, including engineering and installation."
                rows={7}
                maxLength={4000}
                readOnly={readOnly}
                aria-describedby={fieldDescribedBy("change-description", {
                  hint: "Optional. Note the field condition, the client request, or the reason for the cost.",
                })}
              />
            </Field>

            <Field
              id="change-cost"
              label="Price effect"
              error={costError ?? undefined}
              hint="Use a negative amount for a credit. This is the full change to the contract."
            >
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted"
                >
                  $
                </span>
                <Input
                  id="change-cost"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={cost}
                  onChange={(event) => {
                    setCost(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="0.00"
                  className="pl-7"
                  readOnly={readOnly}
                  aria-invalid={Boolean(costError) || undefined}
                  aria-describedby={fieldDescribedBy("change-cost", {
                    hint: "Use a negative amount for a credit. This is the full change to the contract.",
                    error: costError ?? undefined,
                  })}
                />
              </div>
            </Field>
          </div>

          <TitleBlock>
            <span>
              <span className="text-paper/55">Job </span>
              {jobNumber(project.id)}
            </span>
            <span>
              <span className="text-paper/55">Project </span>
              {project.projectName}
            </span>
            <span>
              <span className="text-paper/55">Client </span>
              {project.clientName ?? "—"}
            </span>
          </TitleBlock>
        </Sheet>

        <aside className="flex flex-col gap-4">
          <Sheet className="bg-paper-raised">
            <div className="border-b border-ink px-4 py-3">
              <p className="type-label text-[9px] text-muted">Contract effect</p>
            </div>
            <dl className="flex flex-col p-4">
              <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                <dt className="text-xs text-muted">Original</dt>
                <dd className="type-data text-sm">{formatMoney(project.estimatedCost)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                <dt className="text-xs text-muted">Approved</dt>
                <dd className="type-data text-sm">{formatSignedMoney(approvedValue)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                <dt className="text-xs text-muted">This change</dt>
                <dd className="type-data text-sm">
                  {amountValid ? formatSignedMoney(amount) : "—"}
                </dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3 bg-paper-sunk px-2 py-3">
                <dt className="type-label text-[9px] text-ink">
                  {changeOrder?.status === "approved" ? "Revised" : "Revised if approved"}
                </dt>
                <dd className="type-heading text-lg">
                  {formatMoney(project.estimatedCost + approvedValue + (amountValid ? amount : 0))}
                </dd>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Revision preview. Pending changes are not part of the contract until signed.
              </p>
            </dl>
          </Sheet>

          <div aria-live="polite" aria-atomic="true">
            {error ? (
              <p className="border border-revision bg-paper px-3 py-2.5 text-sm leading-relaxed text-revision">
                {error}
              </p>
            ) : null}
            {saved && !error ? (
              <p className="type-label border border-ink bg-paper px-3 py-2 text-[9px] text-ink">
                Change order saved
              </p>
            ) : null}
          </div>

          {readOnly ? (
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${project.id}`}>Back to project</Link>
            </Button>
          ) : (
            <>
              <Button type="submit" loading={pending} disabled={!changeOrdersEnabled}>
                {mode === "create" ? "Issue change order" : "Save change order"}
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/app/projects/${project.id}`}>Cancel</Link>
              </Button>
              <p className="text-[11px] leading-relaxed text-muted">
                {mode === "create"
                  ? "Issuing sends the change to the client portal. It does not change the contract until the client signs."
                  : "Changes remain pending until the client signs. Approved records are sealed."}
              </p>
            </>
          )}
        </aside>
      </form>
    </div>
  );
}
