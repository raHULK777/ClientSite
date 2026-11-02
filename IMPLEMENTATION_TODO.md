# ConstructOps — Feature Implementation TODO

Feature set: project stages + progress tracking, admin project creation, field stage updates
with comments, client portal Active/Closed views, daily logs, realtime chat.

Status key: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

Authority: `SRS.txt`, `PRODUCT.md`, `IMPLEMENTATION_PLAN.md`, `DESIGN.md`.
Where those documents conflict with this plan, P0 amends them first so the repo stays
internally consistent. No phase may start before its predecessor's "done" criteria pass.

---

## Scope decisions (recorded 2026-11-01, product owner)

| Item | Decision | Spec impact |
| --- | --- | --- |
| Realtime chat + push notifications | **Approved — full realtime** | Amends `SRS.txt` §3 (previously *forbidden*), `PRODUCT.md`, `IMPLEMENTATION_PLAN.md` |
| Daily logs with images | **Text only now**; images deferred to a later phase | Amends `PRODUCT.md`, `IMPLEMENTATION_PLAN.md` |
| Customizable stages, progress bar, project creation UI, field stage + comment, portal Active/Closed, Track progress | **Approved, already in scope** | None — extends existing `current_phase` / `progress_percentage` |

### Scope conflicts being resolved

- `SRS.txt` §3 previously read: *"Real-time Dynamic Chat Infrastructure: No WebSockets,
  Socket.io, or persistent chat logging pools."* — superseded by P0.
- `PRODUCT.md` previously listed `daily logs` and `WebSockets/chat` as out of scope — superseded by P0.
- `SRS.txt` still stands on binary documents: *"Document management is strictly restricted to
  asset file paths."* Image **upload** therefore stays forbidden until explicitly amended; P8
  ships text only.

---

## P0 — Spec amendments

- [x] `SRS.txt` §3: move realtime chat out of Out-of-Scope into In-Scope, written as a dated
      amendment rather than a silent deletion, and note the tenant feature flag that gates it.
- [x] `SRS.txt` §3: keep the binary-document prohibition; add an explicit line that daily-log
      text updates are in scope and image handling remains asset-path-only.
- [x] `PRODUCT.md` "Capabilities and Constraints": remove `WebSockets/chat` and `daily logs` from
      the out-of-scope list; add them to in-scope with phase references.
- [x] `IMPLEMENTATION_PLAN.md` "MVP boundary" and the LLD-extras conflict row: record the
      promotion of `daily_logs` and realtime chat out of the deferred backlog.
- [x] `IMPLEMENTATION_PLAN.md` §1.3 API surface: add the P2 stage endpoints to the contract table.

**Done:** no document in the repo contradicts any phase below; every amendment is dated and
attributable, with the original prohibition left visible in the revision history.

---

## P1 — Database + shared contracts

- [x] `infra/migrations/002_project_stages.sql`
  - `project_stages`: `id`, `tenant_id` → tenants cascade, `project_id` → projects cascade,
    `stage_order INT`, `name VARCHAR(100)`, `status` in `(pending|active|completed)`,
    `started_at`, `completed_at`, `created_at`, `UNIQUE (project_id, stage_order)`.
  - `project_stage_updates`: `id`, `tenant_id` cascade, `project_id` cascade,
    `stage_id` → set null, `actor_id` → users set null, `actor_role`,
    `comment TEXT`, `progress_percentage INT CHECK 0..100`, `created_at`.
  - **Deviation:** added `stage_name VARCHAR(100) NOT NULL` to `project_stage_updates`. Because
    `stage_id` is `ON DELETE SET NULL`, replacing a plan would otherwise erase the stage name from
    the historical trail. Denormalizing the name keeps the audit record readable forever.
  - Indexes in the existing composite convention: `(tenant_id, project_id, stage_order)` and
    `(tenant_id, project_id, created_at DESC)`.
- [x] `packages/shared/src/stages.ts` (new): `DEFAULT_STAGE_PLAN`, `deriveStageProgress`,
      `deriveCurrentPhase`. Pure, deterministic, unit-testable — same role as `estimator.ts`.
- [x] `packages/shared/src/contracts.ts`: `stageStatusSchema`, `stageNameSchema`, `stagePlanSchema`,
      `stageStatusUpdateSchema`, `stageIdParamSchema`; `projectCreateSchema` gains optional
      `stages[]` (1–30). `stageStatusUpdateSchema.comment` is **required** (min 2 chars) so every
      transition carries a field note.
- [x] `packages/shared/src/index.ts`: export the new symbols.
- [x] `packages/shared/test/stages.test.ts`: progress derivation, phase derivation, edge cases
      (empty plan, all complete, single stage, rounding), plan validation bounds, required comment.

**Done:** `npm run db:migrate` applies cleanly on PGlite and is re-runnable; shared unit tests green;
`npm run typecheck` green.

**Derivation contract (binding):** `progress_percentage = round(100 × completed / total)`;
`current_phase` = first non-completed stage name, else last stage name. The UI always shows a
`N of M` readout so a 0% active project still communicates position honestly.

---

## P2 — API: stages, progress, comments

- [x] `src/modules/projects/stage.types.ts`, `stage.mapper.ts` — follow the existing
      `project.types.ts` / `project.mapper.ts` snake_case-row → camelCase-DTO convention.
- [x] `src/modules/projects/stage.repository.ts`
  - `listByProject(tenantId, projectId)` — ordered by `stage_order`.
  - `replacePlan(tenantId, projectId, names)` — positional reconcile inside one transaction:
    upsert by `(project_id, stage_order)`, delete trailing orders, activate stage 1 when all
    pending, then project the derived progress back onto `projects`.
  - `updateStatus(tenantId, projectId, stageId, status, comment, actor)` — transactional:
    update stage, append a `project_stage_updates` row, re-derive `current_phase` +
    `progress_percentage` on `projects`.
  - `listUpdates(tenantId, projectId, limit)` — newest first.
  - **Deviation:** stage timestamps are computed in TypeScript and written as plain `$5`/`$6`
    values rather than a SQL `CASE` on the status parameter. Reusing one parameter in both a
    `status =` assignment and a `CASE WHEN $4 = '…'` comparison makes Postgres deduce
    `character varying` and `text` for the same placeholder and fail with `42P08
    inconsistent types deduced for parameter $4`. Single-context parameters avoid it, and the
    rules stay unit-testable in TS.
- [x] `project.routes.ts` — four endpoints, all tenant-bound, zod-validated, `asyncHandler`-wrapped:
  | Method | Route | Role |
  | --- | --- | --- |
  | `GET` | `/protected/projects/:id/stages` | all (client-scoped) |
  | `PUT` | `/protected/projects/:id/stages` | admin |
  | `POST` | `/protected/projects/:id/stages/:stageId/status` | admin, field_staff |
  | `POST` | `/protected/projects` *(extend)* | admin — accepts and seeds `stages[]` |
- [x] `GET /protected/projects/:id` returns `stages[]` + `stageUpdates[]` alongside the existing
      `changeOrders[]`, so a project page needs one fetch.
- [x] Audit events on every mutation: `project.stages_replaced`, `project.stage_updated`,
      reusing `recordAudit`.
- [x] `fieldStaffProjectUpdateSchema` is left untouched — field staff still cannot touch money,
      status, or the plan, only stage status + comment.
- [x] `constructops-core/test/stages.test.ts`: plan validation, progress derivation parity with
      shared, RBAC matrix (admin/field/client), client read-only enforcement, cross-tenant 404,
      invalid UUID 400, unknown stage 404, comment length bounds, audit rows written.
- [x] **Behavior note:** stages are seeded only when `stages[]` is explicitly supplied on create.
      Omitting it preserves the previous API contract exactly (manual `currentPhase` /
      `progressPercentage`, no stage rows), which is what kept the 234 pre-existing tests green.
      The web form (P4) always sends a plan.

**Done:** verified. 270 core tests pass (234 pre-existing, unchanged + 36 new) and 37 shared tests
pass; `npm run lint` and `npm run typecheck` clean; migration 002 applies and is re-runnable; the
full flow was exercised against the live dev API — create with a 3-stage plan (phase `Permitting`,
0%), field staff completes stage 1 with a comment (progress 33%, phase `Framing`, trail records
`Danny Ortiz / field_staff`), and a client receives 404 for an unlinked project.

---

## P3 — `StageTrack` component (design-system verified)

- [ ] `constructops-web/components/ui/stage-track.tsx` — the ruled stage schedule bar and the
      shared display used by workspace, field, and portal.
- [ ] `components/app/stage-plan-editor.tsx` — ordered add/remove/reorder editor, admin only.
- [ ] Design conformance (`DESIGN.md`): square corners only; 1px rules between segments;
      2px ink page rule; completed `bg-brand-primary`; active `bg-paper-sunk` with a 2px ink
      marker; pending outline only; stencil numerals for order; `type-label` for names;
      `type-data` tabular for the `N of M` readout; status-only badges; 44px minimum targets;
      `transform`/`opacity`-only motion with a `prefers-reduced-motion` path.
- [ ] No `transition: all`; no rounded pills; no circular geometry beyond the radio indicator.

**Done:** `/system` renders every track state (0%, active, all complete, empty plan, 30 stages)
at 390 / 768 / 1440 with no overflow; contrast and keyboard checks pass.

---

## P4 — Admin: create project + manage stages

- [ ] `app/app/projects/new/page.tsx` + `components/app/project-form.tsx`, modeled on the
      existing `change-order-form.tsx` (labeled fields, error summary, `apiMutate`,
      `router.push` on success).
- [ ] Stage editor seeded from `DEFAULT_STAGE_PLAN`, with `Restore suggested plan`.
- [ ] `app/app/projects/[id]/page.tsx` gains a "Stage plan" sheet with the editor (admin) and
      the update trail.
- [ ] `components/app/workspace-shell.tsx`: admin-gated "New project" primary action.
- [ ] `e2e/projects.spec.ts`: admin creates a project with a custom 4-stage plan and sees it in
      the index with a 0% track.

**Done:** an admin creates and edits a project entirely in the browser; audit rows recorded.

---

## P5 — Field: stage update with comment

- [ ] `components/app/field-board.tsx`: stage stepper from the plan, "Mark stage complete" +
      comment textarea + submit, optimistic-free (re-read from the response).
- [ ] Large touch targets, sunlight-legible, single-hand operation, offline-tolerant form state
      (retain the typed comment on failure so it is not lost in the field).
- [ ] Keep the existing phase/progress slider for projects that have no stage plan.
- [ ] `e2e/field.spec.ts` extended: field completes a stage with a comment and sees it persisted
      after reload.

**Done:** field staff advance a stage with a comment; the project bar and `N of M` update;
the comment appears in the trail for the office and the client.

---

## P6 — Client portal: Active/Closed + Track progress

- [ ] `app/portal/page.tsx`: replace the "On this page" anchor nav (`app/portal/page.tsx:50-66`)
      with a Radix tab set — **Active Projects** (planning + active) and **Closed Projects**
      (completed) — each with a count badge. Only the selected tab's projects render, removing
      the single-long-scroll list.
- [ ] `components/portal/portal-project.tsx`: add the `StageTrack` bar and a **Track progress**
      primary action.
- [ ] `app/portal/projects/[id]/page.tsx` (new): client-facing project detail — stage track,
      read-only stage update trail, change orders, signed records. Cross-client access returns
      404 (already enforced by `findAccessible`).
- [ ] Deferred to P9: the "Chat with field agent" action on active projects only.
- [ ] `e2e/portal.spec.ts` extended: toggle Active/Closed, open a project via Track progress.

**Done:** a client switches views, opens a project, and reads the progress trail without any
mutating capability; a11y spec still green on `/portal`.

---

## P7 — Verification sweep

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` all green.
- [ ] axe: zero critical/serious on landing, login, workspace, change orders, field, portal, and
      the two new routes.
- [ ] Screenshots at 1440×900 and 390×844 with the document-overflow assertion, added to
      `.impeccable/review/`.
- [ ] Cross-tenant probe script returns only 403/404 for every new endpoint.
- [ ] Update `README.md` (new routes, roles, demo data), `DESIGN.md` (StageTrack rules),
      `IMPLEMENTATION_PLAN.md` (delivered state), and this file's checkboxes.

**Done:** every "done" criterion above is demonstrated, not asserted; residual gaps listed.

---

## P8 — Daily logs (text only)

- [ ] Migration `003_project_daily_logs.sql`: `project_daily_logs` (`tenant_id`, `project_id`,
      `author_id`, `log_date`, `summary`, `details`, `weather`, `crew_size`, `created_at`),
      tenant-bound with cascade.
- [ ] API: `GET`/`POST` `/protected/projects/:id/daily-logs`; author = admin or field_staff;
      clients read.
- [ ] Field UI: dated log composer + reverse-chronological log list.
- [ ] Client portal: read-only log timeline on the project detail page.
- [ ] Images are **out of scope for this phase** — the schema reserves no binary column.
      Pending a separate decision and an amendment to the asset-path rule.

**Done:** field staff record dated text logs; clients read them; no binary handling exists.

---

## P9 — Realtime chat + push notifications

Largest phase. Requires new dependencies and new infrastructure that does not exist today
(no WebSocket library, no mail library, no notification service in the repo).

- [ ] Amendment already landed in P0; re-verify no document still forbids this.
- [ ] Migration `004_project_messages.sql`: `project_messages` (tenant-bound, cascade,
      `author_id`, `body`, `created_at`) + `project_message_reads` for unread counts.
- [ ] Transport decision (must be recorded as an ADR in `decisions/`): WebSocket vs SSE. The API
      is documented as a stateless cluster, so a Redis pub/sub fan-out is required to survive
      more than one API process. Redis is already a dependency for the tenant cache.
- [ ] New dependency is unavoidable (`ws` or equivalent); it must be justified in the ADR, and
      `npm audit` must stay free of high/critical.
- [ ] `tenant.features.projectChat` flag, admin-gated, defaulting off, surfaced in
      `/app/settings` and honored by a `featureGate`.
- [ ] Push: Web Push (service worker + VAPID) for clients; explicit opt-in, per-tenant scoping,
      and a documented fallback to polling when permission is denied.
- [ ] Access control: only participants of that project (its client, tenant admin/field, and
      the assigned field staff) may read or post. Every message query tenant- and project-bound.
- [ ] Retention and moderation policy documented before ship (message deletion, report path).
- [ ] UI: chat panel on the project page, active projects only, with unread badge, connection
      state, reconnect, and a reduced-motion/no-JS fallback message.
- [ ] Tests: authorization matrix, reconnect behavior, unread counts, feature-flag off path,
      plus e2e for send/receive across two browser contexts.

**Done:** two authenticated participants exchange messages in real time within one tenant and one
project; a third party in the same tenant but outside the project is denied; push opt-in works;
the feature is fully disabled when the tenant flag is off.

---

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| P9 contradicts the stateless-API design in `Architecture.txt` | Rework, or a second service | ADR before code; Redis pub/sub fan-out; keep REST as the source of truth |
| Image expectations resurface in P8 | Rework | Schema carries no binary column; decision recorded in this file |
| `current_phase` denormalization drifts from the stage plan | Wrong progress shown | Single transactional writer; derivation lives in `packages/shared`, unit-tested, and every write re-derives |
| Portal tabs change the a11y surface | axe gate failure | Radix tabs, keyboard walkthrough, a11y spec extended before merge |
| Field connectivity | Lost comments | Retain typed comment on failure; no optimistic-only writes |
