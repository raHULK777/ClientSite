"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Stamp } from "@/components/ui/stamp";
import { apiMutate, ClientApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import {
  formatDate,
  formatMoney,
  formatSignedMoney,
  jobNumber,
  PROJECT_STATUS_LABEL,
} from "@/lib/format";

import type { ProjectRollup } from "@/lib/api-types";
import type { ProjectStatus } from "@constructops/shared";

type SortKey = "updated" | "name" | "revised" | "progress";
type StatusFilter = "all" | ProjectStatus;

const STATUS_STAMP: Record<ProjectStatus, string> = {
  planning: "border-line-strong text-muted",
  active: "border-ink text-ink",
  completed: "border-ink bg-ink text-paper",
};

function NewProjectDialog({
  open,
  onOpenChange,
  clients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string; email: string | null }[];
}) {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState("none");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [phase, setPhase] = useState("Permitting");
  const [progress, setProgress] = useState("0");
  const [cost, setCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [costError, setCostError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setProjectName("");
    setClientId("none");
    setStatus("planning");
    setPhase("Permitting");
    setProgress("0");
    setCost("");
    setError(null);
    setNameError(null);
    setCostError(null);
    setPending(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNameError(null);
    setCostError(null);

    const trimmedName = projectName.trim();
    const amount = Number(cost);
    let invalid = false;
    if (trimmedName.length < 2) {
      setNameError("Use at least two characters.");
      invalid = true;
    }
    if (!cost.trim() || !Number.isFinite(amount) || amount < 0) {
      setCostError("Enter the contract amount, zero or more.");
      invalid = true;
    }
    if (invalid) return;

    setPending(true);
    try {
      await apiMutate("/protected/projects", "POST", {
        projectName: trimmedName,
        clientId: clientId === "none" ? null : clientId,
        status,
        currentPhase: phase.trim() || "Permitting",
        progressPercentage: Math.min(100, Math.max(0, Number(progress) || 0)),
        estimatedCost: amount,
      });
      onOpenChange(false);
      reset();
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ClientApiError ? cause.message : "The job could not be created.",
      );
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogTitle>Start a job</DialogTitle>
        <DialogDescription>
          The job number is issued from the record. Client totals begin with the contract amount.
        </DialogDescription>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
          <Field id="project-name" label="Project name" error={nameError ?? undefined}>
            <Input
              id="project-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Elm Street Kitchen"
              aria-invalid={Boolean(nameError) || undefined}
              aria-describedby={fieldDescribedBy("project-name", {
                error: nameError ?? undefined,
              })}
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="project-status" label="Status">
              <Select value={status} onValueChange={(value) => setStatus(value as ProjectStatus)}>
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

            <Field id="project-phase" label="Current phase">
              <Input
                id="project-phase"
                value={phase}
                onChange={(event) => setPhase(event.target.value)}
                placeholder="Permitting"
              />
            </Field>
          </div>

          <Field
            id="project-client"
            label="Client"
            hint={
              clients.length
                ? "Choose a client already on the board."
                : "No client accounts are on the board yet. The job can be assigned later."
            }
          >
            <Select value={clientId} onValueChange={setClientId} disabled={!clients.length}>
              <SelectTrigger id="project-client">
                <SelectValue placeholder="No client yet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client yet</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                    {client.email ? ` · ${client.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="project-progress" label="Progress" hint="Percent complete, 0 to 100.">
              <Input
                id="project-progress"
                type="number"
                min={0}
                max={100}
                step={1}
                value={progress}
                onChange={(event) => setProgress(event.target.value)}
              />
            </Field>

            <Field
              id="project-cost"
              label="Contract amount"
              error={costError ?? undefined}
              hint="The original contract, before change orders."
            >
              <Input
                id="project-cost"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                placeholder="0.00"
                aria-invalid={Boolean(costError) || undefined}
                aria-describedby={fieldDescribedBy("project-cost", {
                  hint: "The original contract, before change orders.",
                  error: costError ?? undefined,
                })}
              />
            </Field>
          </div>

          <div aria-live="polite" aria-atomic="true">
            {error ? (
              <p className="border border-revision bg-paper px-3 py-2.5 text-sm leading-relaxed text-revision">
                {error}
              </p>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Create job
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectTable({
  projects,
  canCreate,
  clients,
}: {
  projects: ProjectRollup[];
  canCreate: boolean;
  clients: { id: string; name: string; email: string | null }[];
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [newOpen, setNewOpen] = useState(false);

  const visible = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? projects
        : projects.filter((project) => project.status === statusFilter);
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.projectName.localeCompare(b.projectName);
      if (sort === "revised") return b.revisedCost - a.revisedCost;
      if (sort === "progress") return b.progressPercentage - a.progressPercentage;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects, sort, statusFilter]);

  return (
    <section aria-labelledby="project-index-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
        <div>
          <p className="type-label text-muted">Schedule</p>
          <h2 id="project-index-heading" className="type-heading mt-1 text-xl">
            All jobs
          </h2>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-40">
            <label htmlFor="project-status-filter" className="type-label mb-1 block text-[9px] text-muted">
              Status
            </label>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger id="project-status-filter" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <label htmlFor="project-sort" className="type-label mb-1 block text-[9px] text-muted">
              Order
            </label>
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger id="project-sort" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="revised">Revised contract</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="name">Project name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canCreate ? (
            <Button onClick={() => setNewOpen(true)} className="h-11">
              New project
            </Button>
          ) : null}
        </div>
      </div>

      <Schedule className="mt-4">
        <ScheduleTable className="min-w-[860px]">
          <ScheduleHead>
            <tr>
              <ScheduleHeaderCell>Job / project</ScheduleHeaderCell>
              <ScheduleHeaderCell>Client</ScheduleHeaderCell>
              <ScheduleHeaderCell>Status</ScheduleHeaderCell>
              <ScheduleHeaderCell className="text-right">Contract</ScheduleHeaderCell>
              <ScheduleHeaderCell className="text-right">Approved</ScheduleHeaderCell>
              <ScheduleHeaderCell className="text-right">Revised</ScheduleHeaderCell>
              <ScheduleHeaderCell className="hidden lg:table-cell">Updated</ScheduleHeaderCell>
            </tr>
          </ScheduleHead>
          <ScheduleBody>
            {visible.map((project) => (
              <ScheduleRow key={project.id} className="transition-colors duration-fast hover:bg-paper-sunk/60">
                <ScheduleCell>
                  <Link
                    href={`/app/projects/${project.id}`}
                    className="flex min-h-11 flex-col justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised"
                  >
                    <span className="type-stencil text-[10px] text-muted">
                      {jobNumber(project.id)}
                    </span>
                    <span className="mt-0.5 text-sm font-semibold text-ink">
                      {project.projectName}
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted">{project.currentPhase}</span>
                  </Link>
                </ScheduleCell>
                <ScheduleCell className="hidden md:table-cell">
                  <span className="block text-sm text-ink">{project.clientName ?? "No client"}</span>
                  {project.clientEmail ? (
                    <span className="mt-0.5 block text-[11px] text-muted">{project.clientEmail}</span>
                  ) : null}
                </ScheduleCell>
                <ScheduleCell>
                  <Stamp className={cn("px-1.5 py-0.5 text-[9px]", STATUS_STAMP[project.status])}>
                    {PROJECT_STATUS_LABEL[project.status]}
                  </Stamp>
                  {project.pendingCount ? (
                    <span className="mt-1 block text-[11px] leading-tight text-revision">
                      {project.pendingCount} awaiting signature
                    </span>
                  ) : null}
                </ScheduleCell>
                <ScheduleAmount className="hidden sm:table-cell">
                  {formatMoney(project.estimatedCost)}
                </ScheduleAmount>
                <ScheduleAmount className="hidden md:table-cell">
                  {project.approvedValue ? formatSignedMoney(project.approvedValue) : "—"}
                </ScheduleAmount>
                <ScheduleAmount className="font-semibold">{formatMoney(project.revisedCost)}</ScheduleAmount>
                <ScheduleCell className="hidden text-xs text-muted lg:table-cell">
                  {formatDate(project.updatedAt)}
                </ScheduleCell>
              </ScheduleRow>
            ))}

            {!visible.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <p className="type-heading text-base">
                    {projects.length ? "No jobs match this order." : "The board is empty."}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
                    {projects.length
                      ? "Change the status filter or add a job to the schedule."
                      : "Start with New project. The job number is issued from the record."}
                  </p>
                  {canCreate && !projects.length ? (
                    <Button onClick={() => setNewOpen(true)} className="mt-4">
                      New project
                    </Button>
                  ) : null}
                </td>
              </tr>
            ) : null}
          </ScheduleBody>
        </ScheduleTable>
      </Schedule>

      {canCreate ? (
        <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} clients={clients} />
      ) : null}
    </section>
  );
}
