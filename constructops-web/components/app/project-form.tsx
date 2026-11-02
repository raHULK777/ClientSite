"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, TitleBlock } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { apiMutate, ClientApiError } from "@/lib/client-api";
import { formatMoney, jobNumber } from "@/lib/format";

import type { Project } from "@/lib/api-types";
import type { ClientAccount } from "@/lib/api-types";
import type { ProjectStatus } from "@constructops/shared";

export function ProjectForm({
  mode,
  project,
  clients,
  currentUserId,
  changeOrdersEnabled,
}: {
  mode: "create" | "edit";
  project?: Project;
  clients: ClientAccount[];
  currentUserId: string;
  changeOrdersEnabled: boolean;
}) {
  const router = useRouter();
  const isAdmin = true;
  const readOnly = mode === "edit" && project && project.status === "completed";

  const [name, setName] = useState(project?.projectName ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "planning");
  const [phase, setPhase] = useState(project?.currentPhase ?? "Permitting");
  const [progress, setProgress] = useState(project?.progressPercentage ?? 0);
  const [cost, setCost] = useState(project?.estimatedCost.toString() ?? "");
  const [clientId, setClientId] = useState(project?.clientId ?? "");
  const [stages, setStages] = useState<string[]>(
    project?.currentPhase && project.status !== "completed"
      ? [project.currentPhase]
      : ["Permitting", "Foundation", "Framing", "Finishes"],
  );

  const [nameError, setNameError] = useState<string | null>(null);
  const [costError, setCostError] = useState<string | null>(null);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const costValid = cost.trim() && Number(cost) >= 0;
  const amount = costValid ? Number(cost) : 0;

  useEffect(() => {
    if (project) {
      setName(project.projectName);
      setStatus(project.status);
      setPhase(project.currentPhase);
      setProgress(project.progressPercentage);
      setCost(project.estimatedCost.toString());
      setClientId(project.clientId ?? "");
    }
  }, [project]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    setError(null);
    setNameError(null);
    setCostError(null);
    setPhaseError(null);
    setSaved(false);

    const trimmedName = name.trim();
    const trimmedPhase = phase.trim();
    const amountVal = Number(cost);

    let invalid = false;
    if (trimmedName.length < 2) {
      setNameError("Use at least two characters.");
      invalid = true;
    }
    if (!trimmedPhase) {
      setPhaseError("Add the current phase.");
      invalid = true;
    }
    if (!costValid || !Number.isFinite(amountVal) || amountVal < 0) {
      setCostError("Enter a contract amount, zero or more.");
      invalid = true;
    }
    if (invalid) return;

    const payload: Record<string, string | number | string[] | null> = {
      projectName: trimmedName,
      currentPhase: trimmedPhase,
      progressPercentage: Math.round(progress),
      estimatedCost: amountVal,
      status,
      clientId: clientId || null,
      stages,
    };

    setPending(true);
    try {
      if (mode === "create") {
        const result = await apiMutate<{ project: Project }>(
          "/protected/projects",
          "POST",
          payload,
        );
        router.push(`/app/projects/${result.project.id}`);
        router.refresh();
      } else if (project) {
        await apiMutate(`/protected/projects/${project.id}`, "PATCH", payload);
        setSaved(true);
        setPending(false);
        router.refresh();
      }
    } catch (cause) {
      setError(
        cause instanceof ClientApiError ? cause.message : "The project could not be saved.",
      );
      setPending(false);
    }
  }

  const availableClients = clients.filter((c) => c.id !== currentUserId);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link
          href="/app"
          className="type-label inline-flex min-h-11 items-center text-[9px] text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
        >
          Project index
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {project ? (
            <span className="type-stencil text-xs text-muted">{jobNumber(project.id)}</span>
          ) : (
            <Stamp className="px-1.5 py-0.5 text-[9px] border-line-strong text-muted">New</Stamp>
          )}
        </div>
        <h1 className="type-title mt-2 max-w-3xl text-[clamp(2rem,4vw,3rem)]">
          {mode === "create" ? "Open a new job" : "Project record"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          {mode === "create"
            ? "Create the job record, set the contract amount, and assign the client. Stage plan can be customized."
            : readOnly
            ? "Completed jobs are read-only. Reopen the status to make changes."
            : "Update the job details, contract, or client assignment."}
        </p>
      </header>

      {!changeOrdersEnabled && isAdmin ? (
        <p className="border border-revision bg-paper px-3 py-2.5 text-sm leading-relaxed text-revision">
          Change orders are turned off for this workspace. Re-enable them in Settings before
          issuing a new one.
        </p>
      ) : null}

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]" noValidate>
        <Sheet className="bg-paper-raised">
          <div className="border-b-2 border-ink px-5 py-3">
            <p className="type-label text-[9px] text-muted">Job record</p>
            <h2 className="type-heading mt-0.5 text-base">Details</h2>
          </div>

          <div className="flex flex-col gap-5 p-5">
            <Field id="project-name" label="Job name" error={nameError ?? undefined}>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                placeholder="Elm Street Kitchen"
                readOnly={readOnly}
                aria-invalid={Boolean(nameError) || undefined}
                aria-describedby={fieldDescribedBy("project-name", { error: nameError ?? undefined })}
                autoFocus={!readOnly}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="project-client" label="Client" hint="Optional. Assign a client portal account.">
                <Select value={clientId} onValueChange={setClientId} disabled={readOnly}>
                  <SelectTrigger id="project-client">
                    <SelectValue placeholder="No client assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No client assigned</SelectItem>
                    {availableClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.email ? `· ${client.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field id="project-status" label="Status">
                <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)} disabled={readOnly}>
                  <SelectTrigger id="project-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field id="project-phase" label="Current phase" error={phaseError ?? undefined}>
              <Input
                id="project-phase"
                value={phase}
                onChange={(event) => {
                  setPhase(event.target.value);
                  setSaved(false);
                }}
                placeholder="Permitting"
                readOnly={readOnly}
                aria-invalid={Boolean(phaseError) || undefined}
                aria-describedby={fieldDescribedBy("project-phase", { error: phaseError ?? undefined })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="project-progress" label="Progress" hint="Percent complete, 0 to 100.">
                <Input
                  id="project-progress"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={String(progress)}
                  onChange={(event) => {
                    setProgress(Number(event.target.value) || 0);
                    setSaved(false);
                  }}
                  readOnly={readOnly}
                  aria-describedby={fieldDescribedBy("project-progress", {
                    hint: "Percent complete, 0 to 100.",
                  })}
                />
              </Field>

              <Field id="project-cost" label="Original contract" error={costError ?? undefined} hint="Does not include change orders.">
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted"
                  >
                    $
                  </span>
                  <Input
                    id="project-cost"
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
                    aria-describedby={fieldDescribedBy("project-cost", {
                      hint: "Does not include change orders.",
                      error: costError ?? undefined,
                    })}
                  />
                </div>
              </Field>
            </div>

            <Field id="project-stages" label="Stage plan" hint="Ordered stages. First stage becomes active on create. Max 30.">
              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="type-stencil text-[9px] text-muted shrink-0 w-6 text-right">
                      {index + 1}
                    </span>
                    <Input
                      value={stage}
                      onChange={(e) => {
                        const next = [...stages];
                        next[index] = e.target.value;
                        setStages(next);
                        setSaved(false);
                      }}
                      placeholder={`Stage ${index + 1}`}
                      readOnly={readOnly}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (stages.length <= 1) return;
                        const next = stages.filter((_, i) => i !== index);
                        setStages(next);
                        setSaved(false);
                      }}
                      disabled={readOnly || stages.length <= 1}
                      className="text-revision hover:text-revision"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (stages.length >= 30) return;
                    setStages([...stages, `Stage ${stages.length + 1}`]);
                    setSaved(false);
                  }}
                  disabled={readOnly || stages.length >= 30}
                  className="w-full justify-start"
                >
                  + Add stage
                </Button>
                {stages.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStages(["Permitting", "Foundation", "Framing", "Finishes"]);
                      setSaved(false);
                    }}
                    disabled={readOnly}
                    className="w-full justify-start"
                  >
                    Restore suggested plan
                  </Button>
                )}
              </div>
            </Field>
          </div>

          <TitleBlock>
            <span>
              <span className="text-paper/55">Job </span>
              {project ? jobNumber(project.id) : "—"}
            </span>
            <span>
              <span className="text-paper/55">Client </span>
              {project?.clientName ?? "—"}
            </span>
            <span>
              <span className="text-paper/55">Phase </span>
              {phase}
            </span>
            <span>
              <span className="text-paper/55">Updated </span>
              {project ? new Date().toLocaleDateString() : "—"}
            </span>
          </TitleBlock>
        </Sheet>

        <aside className="flex flex-col gap-4">
          <Sheet className="bg-paper-raised">
            <div className="border-b border-ink px-4 py-3">
              <p className="type-label text-[9px] text-muted">Contract preview</p>
            </div>
            <dl className="flex flex-col p-4">
              <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                <dt className="text-xs text-muted">Original contract</dt>
                <dd className="type-data text-sm">{costValid ? formatMoney(amount) : "—"}</dd>
              </div>
              {project && project.estimatedCost > 0 && (
                <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                  <dt className="text-xs text-muted">Change orders</dt>
                  <dd className="type-data text-sm">Not included here</dd>
                </div>
              )}
              <div className="mt-2 flex items-baseline justify-between gap-3 bg-paper-sunk px-2 py-3">
                <dt className="type-label text-[9px] text-ink">Contract total</dt>
                <dd className="type-heading text-lg">{costValid ? formatMoney(amount) : "—"}</dd>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Change orders are tracked separately and added when approved.
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
                Project saved
              </p>
            ) : null}
          </div>

          {readOnly ? (
            <Button asChild variant="secondary">
              <Link href={project ? `/app/projects/${project.id}` : "/app"}>Back to project index</Link>
            </Button>
          ) : (
            <>
              <Button type="submit" loading={pending} disabled={!costValid}>
                {mode === "create" ? "Open job" : "Save project"}
              </Button>
              <Button asChild variant="ghost">
                <Link href={project ? `/app/projects/${project.id}` : "/app"}>Cancel</Link>
              </Button>
              <p className="text-[11px] leading-relaxed text-muted">
                {mode === "create"
                  ? "The job appears on the project index and the field board. The client gets portal access."
                  : "Changes are saved to the project record. Client assignment updates portal access."}
              </p>
            </>
          )}
        </aside>
      </form>
    </div>
  );
}