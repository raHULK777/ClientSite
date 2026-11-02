"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sheet, TitleBlock } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { apiMutate, ClientApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { formatDate, jobNumber, PROJECT_STATUS_LABEL } from "@/lib/format";

import type { Project, SessionUser } from "@/lib/api-types";

const DRAFT_KEY = "constructops.field.drafts";

type Draft = {
  currentPhase: string;
  progressPercentage: number;
};

type RowStatus = "clean" | "draft" | "queued" | "saving" | "saved" | "error";

type DraftMap = Record<string, Draft>;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function readDrafts(): DraftMap {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const result: DraftMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const record = value as Record<string, unknown>;
      if (typeof record.currentPhase !== "string") continue;
      if (typeof record.progressPercentage !== "number") continue;
      result[id] = {
        currentPhase: record.currentPhase,
        progressPercentage: clampPercent(record.progressPercentage),
      };
    }
    return result;
  } catch {
    return {};
  }
}

function statusCopy(status: RowStatus, online: boolean): string | null {
  if (status === "saving") return "Sending to the office.";
  if (status === "saved") return "Update sent to the office.";
  if (status === "queued") return "Saved on this device — send when back online.";
  if (status === "draft") return online ? "Draft saved on this device." : "Saved on this device — send when back online.";
  if (status === "error") return null;
  return null;
}

function statusTone(status: RowStatus): string {
  if (status === "saved") return "border-ink bg-ink text-paper";
  if (status === "error") return "border-revision text-revision";
  if (status === "queued") return "border-revision text-revision";
  if (status === "saving") return "border-ink text-ink";
  return "border-line-strong text-muted";
}

function JobCard({
  project,
  draft,
  status,
  error,
  online,
  onChange,
  onSave,
}: {
  project: Project;
  draft: Draft;
  status: RowStatus;
  error: string | null;
  online: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onSave: () => void;
}) {
  const phaseId = `field-phase-${project.id}`;
  const progressId = `field-progress-${project.id}`;
  const changed =
    draft.currentPhase.trim() !== project.currentPhase ||
    clampPercent(draft.progressPercentage) !== project.progressPercentage;
  const message = statusCopy(status, online);

  return (
    <Sheet className="flex flex-col bg-paper-raised">
      <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-stencil text-xs text-muted">{jobNumber(project.id)}</span>
            <Stamp
              className={cn(
                "px-1.5 py-0.5 text-[9px]",
                project.status === "active"
                  ? "border-ink text-ink"
                  : "border-line-strong text-muted",
              )}
            >
              {PROJECT_STATUS_LABEL[project.status]}
            </Stamp>
            {changed ? (
              <Stamp className="border-revision px-1.5 py-0.5 text-[9px] text-revision">
                Edited
              </Stamp>
            ) : null}
          </div>
          <h2 className="type-heading mt-1.5 text-lg leading-tight">{project.projectName}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {project.clientName ?? "No client assigned"}
          </p>
        </div>
        <span className="type-data shrink-0 text-right text-2xl leading-none">
          {clampPercent(draft.progressPercentage)}
          <span className="text-sm text-muted">%</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-4 sm:px-5">
        <Field id={phaseId} label="Current phase">
          <Input
            id={phaseId}
            value={draft.currentPhase}
            onChange={(event) => onChange({ currentPhase: event.target.value })}
            placeholder="Rough-in"
            autoComplete="off"
            className="h-12 text-base"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <label htmlFor={progressId} className="type-label text-ink">
            Progress
          </label>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => onChange({ progressPercentage: clampPercent(draft.progressPercentage - 5) })}
              disabled={draft.progressPercentage <= 0}
              className={cn(
                "type-data h-12 w-12 shrink-0 border border-ink bg-paper text-lg text-ink",
                "transition-colors duration-fast ease-out hover:bg-paper-sunk",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised",
                "disabled:cursor-not-allowed disabled:opacity-45",
              )}
              aria-label="−5: reduce progress by five percent"
            >
              −5
            </button>
            <Input
              id={progressId}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={String(draft.progressPercentage)}
              onChange={(event) =>
                onChange({ progressPercentage: Number(event.target.value) || 0 })
              }
              className="h-12 text-center text-lg"
            />
            <button
              type="button"
              onClick={() => onChange({ progressPercentage: clampPercent(draft.progressPercentage + 5) })}
              disabled={draft.progressPercentage >= 100}
              className={cn(
                "type-data h-12 w-12 shrink-0 border border-ink bg-paper text-lg text-ink",
                "transition-colors duration-fast ease-out hover:bg-paper-sunk",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised",
                "disabled:cursor-not-allowed disabled:opacity-45",
              )}
              aria-label="+5: add five percent to progress"
            >
              +5
            </button>
          </div>
          <Progress
            value={draft.progressPercentage}
            aria-label={`${project.projectName} updated progress`}
          />
          <p className="text-[11px] leading-relaxed text-muted">
            Office record: {project.currentPhase} · {project.progressPercentage}%
          </p>
        </div>
      </div>

      <div className="border-t border-line px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1" aria-live="polite">
            {error ? (
              <p className="text-xs leading-relaxed text-revision">{error}</p>
            ) : message ? (
              <Stamp className={cn("px-1.5 py-0.5 text-[9px]", statusTone(status))}>
                {message}
              </Stamp>
            ) : (
              <p className="text-[11px] text-muted">No changes to send.</p>
            )}
          </div>
          <Button
            type="button"
            size="md"
            onClick={onSave}
            loading={status === "saving"}
            disabled={!changed || status === "saving" || !online}
            className="min-h-12"
          >
            Send update
          </Button>
        </div>
      </div>

      <TitleBlock>
        <span>
          <span className="text-paper/55">Job </span>
          {jobNumber(project.id)}
        </span>
        <span>
          <span className="text-paper/55">Updated </span>
          {formatDate(project.updatedAt)}
        </span>
        <Link
          href={`/app/projects/${project.id}`}
          className="ml-auto inline-flex min-h-6 items-center underline decoration-paper/40 underline-offset-2 hover:decoration-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          Open project sheet
        </Link>
      </TitleBlock>
    </Sheet>
  );
}

export function FieldBoard({
  projects,
  user,
}: {
  projects: Project[];
  user: SessionUser;
}) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [bulkPending, setBulkPending] = useState(false);
  const initialProjects = useRef(projects);

  const ordered = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "active") return -1;
        if (b.status === "active") return 1;
        if (a.status === "planning") return -1;
        if (b.status === "planning") return 1;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects]);

  useEffect(() => {
    const detected = typeof navigator === "undefined" ? true : navigator.onLine;
    const stored = readDrafts();
    const ids = new Set(initialProjects.current.map((project) => project.id));
    const valid: DraftMap = {};
    for (const [id, draft] of Object.entries(stored)) {
      if (ids.has(id)) valid[id] = draft;
    }
    setOnline(detected);
    setDrafts(valid);
    setStatuses(
      Object.fromEntries(
        Object.keys(valid).map((id) => [id, detected ? "draft" : "queued"] as const),
      ),
    );
    setReady(true);

    function goOnline() {
      setOnline(true);
      setStatuses((current) => {
        const next = { ...current };
        for (const [id, status] of Object.entries(next)) {
          if (status === "queued") next[id] = "draft";
        }
        return next;
      });
    }

    function goOffline() {
      setOnline(false);
      setStatuses((current) => {
        const next = { ...current };
        for (const [id, status] of Object.entries(next)) {
          if (status === "draft") next[id] = "queued";
        }
        return next;
      });
    }

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      if (Object.keys(drafts).length) {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
      } else {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // Storage may be unavailable; the form still works for this session.
    }
  }, [drafts, ready]);

  function draftFor(project: Project): Draft {
    return (
      drafts[project.id] ?? {
        currentPhase: project.currentPhase,
        progressPercentage: project.progressPercentage,
      }
    );
  }

  function updateDraft(project: Project, patch: Partial<Draft>) {
    setDrafts((current) => {
      const baseline = current[project.id] ?? {
        currentPhase: project.currentPhase,
        progressPercentage: project.progressPercentage,
      };
      return {
        ...current,
        [project.id]: {
          currentPhase: patch.currentPhase ?? baseline.currentPhase,
          progressPercentage:
            patch.progressPercentage === undefined
              ? baseline.progressPercentage
              : clampPercent(patch.progressPercentage),
        },
      };
    });
    setStatuses((current) => ({
      ...current,
      [project.id]: online ? "draft" : "queued",
    }));
    setErrors((current) => ({ ...current, [project.id]: null }));
  }

  async function saveProject(project: Project): Promise<boolean> {
    const draft = drafts[project.id];
    if (!draft) return true;

    const phase = draft.currentPhase.trim();
    if (!phase) {
      setErrors((current) => ({ ...current, [project.id]: "Add the current phase before sending." }));
      setStatuses((current) => ({ ...current, [project.id]: "error" }));
      return false;
    }
    if (!online) {
      setStatuses((current) => ({ ...current, [project.id]: "queued" }));
      return false;
    }

    setStatuses((current) => ({ ...current, [project.id]: "saving" }));
    setErrors((current) => ({ ...current, [project.id]: null }));

    try {
      await apiMutate(`/protected/projects/${project.id}`, "PATCH", {
        currentPhase: phase,
        progressPercentage: clampPercent(draft.progressPercentage),
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[project.id];
        return next;
      });
      setStatuses((current) => ({ ...current, [project.id]: "saved" }));
      return true;
    } catch (cause) {
      if (cause instanceof ClientApiError && cause.status === 503) {
        setStatuses((current) => ({ ...current, [project.id]: "queued" }));
        setErrors((current) => ({ ...current, [project.id]: null }));
        return false;
      }
      setErrors((current) => ({
        ...current,
        [project.id]:
          cause instanceof ClientApiError
            ? cause.message
            : "The update could not be sent. Try again.",
      }));
      setStatuses((current) => ({ ...current, [project.id]: "error" }));
      return false;
    }
  }

  async function saveOne(project: Project) {
    const saved = await saveProject(project);
    if (saved) router.refresh();
  }

  async function saveAll() {
    const pending = ordered.filter((project) => drafts[project.id]);
    if (!pending.length) return;
    setBulkPending(true);
    let savedAny = false;
    for (const project of pending) {
      const saved = await saveProject(project);
      savedAny = savedAny || saved;
      if (!online) break;
    }
    setBulkPending(false);
    if (savedAny) router.refresh();
  }

  const draftCount = ordered.filter((project) => drafts[project.id]).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-ink py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "type-label inline-flex items-center gap-1.5 border px-2 py-1 text-[9px]",
              online ? "border-line-strong text-muted" : "border-revision text-revision",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("h-1.5 w-1.5", online ? "bg-ink" : "bg-revision")}
            />
            {online ? "Connected" : "Offline"}
          </span>
          <span className="type-label text-[9px] text-muted">
            {draftCount
              ? `${draftCount} ${draftCount === 1 ? "update" : "updates"} waiting on this device`
              : "All updates sent"}
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={saveAll}
          loading={bulkPending}
          disabled={!draftCount || !online || bulkPending}
          className="min-h-12"
        >
          Send all updates
        </Button>
      </div>

      {!online ? (
        <p
          role="status"
          className="border border-revision bg-paper px-4 py-3 text-sm leading-relaxed text-revision"
        >
          No signal. Updates are saved on this device and sent when you are back online.
        </p>
      ) : null}

      {ordered.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {ordered.map((project) => (
            <JobCard
              key={project.id}
              project={project}
              draft={draftFor(project)}
              status={statuses[project.id] ?? "clean"}
              error={errors[project.id] ?? null}
              online={online}
              onChange={(patch) => updateDraft(project, patch)}
              onSave={() => void saveOne(project)}
            />
          ))}
        </div>
      ) : (
        <Sheet className="bg-paper-raised px-5 py-12 text-center">
          <p className="type-heading text-lg">No site work on the board.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            {user.role === "admin"
              ? "Start a job from the project index. Active and planned jobs appear here with a field copy."
              : "The office has no active jobs assigned right now. Check back when a job is released."}
          </p>
          <Button asChild variant="secondary" size="md" className="mt-5">
            <Link href="/app">Open project index</Link>
          </Button>
        </Sheet>
      )}
    </div>
  );
}
