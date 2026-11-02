# ConstructOps Engine — Implementation Plan

Status: proposed, awaiting go-ahead
Sources of truth: `SRS.txt`, `Architecture.txt`, `DB.txt`, `Security-policy.txt`, `LLD.txt`, `rebranding.txt`, `visual-specifications.txt`, `CREATIVE_BRIEF.md`
Design skills: **Impeccable** (`~/.claude/skills/impeccable`, v4.8.0 payload / engine 0.1.18) + **emil-design-eng** (`~/.agents/skills/emil-design-eng`)

---

## 0. Ground truth extracted from the specs

| Area | Decision | Authority |
|---|---|---|
| Runtime | Node.js 20+, TypeScript strict, Express, async error wrapper + global handler | SRS §2, Architecture §3 |
| Data | PostgreSQL, UUIDv4 PKs, snake_case, forced `tenant_id` + `ON DELETE CASCADE`, parameterized SQL only | DB.txt, Security §2–3 |
| Cache | Redis for tenant config, DB fallback, cache-on-miss | Architecture §2 |
| Auth | JWT (HS256), roles `admin` / `field_staff` / `client`, tenant claim must equal resolved host tenant | SRS §5, Security §4–5 |
| Tenancy | Host-based resolution (`subdomain` / `custom_domain`) in middleware, context attached to `req.tenant` | Architecture §2, rebranding §1 |
| Scope | Multi-tenant middleware, RBAC, public estimator, change-order signing loop | SRS §3 |
| Branding | Per-tenant `primary_color`, `secondary_color`, `branding_config` JSONB → CSS custom properties at runtime | rebranding §2–3, visual-specifications |
| Frontend | Next.js App Router, Tailwind, Radix primitives, Lucide icons, responsive web only | LLD §6, SRS §3 |
| Visual QA | Contrast ≥4.5:1 body, focus rings, max 32px logos, motion rules | visual-specifications |

### Conflicts resolved (and why)

| Conflict | Resolution |
|---|---|
| LLD names NestJS/Go, Auth0/Clerk, WebSockets, Stripe, S3 | Rejected. SRS and Architecture mandate Express + custom JWT, and SRS explicitly forbids WebSockets/native/ERP/PDF. Storage is local file paths only. |
| LLD adds `daily_logs`, `punch_items`, `selections`, `invoices`, `company_id` | `daily_logs` was **promoted to scope on 2026-11-01** (text-only, see the MVP boundary amendment). The remainder stays deferred to Phase 2 backlog: DB.txt is "definitive" and the SRS in-scope list covers only tenancy, RBAC, estimator, change orders, stages, daily logs, and messaging. |
| `uuid-ossp` extension vs `gen_random_uuid()` | Use `gen_random_uuid()` (core in PG13+). The extension line is redundant; documented in migration header. |
| SRS says endpoints live under `/api/v1/protected/*` | Honored for every authenticated route. Public routes under `/api/v1/public/*`. |
| Rebranding sample uses `tailwind.config.js` v3 | Use Tailwind 3.4 with CSS-variable color mapping. Do not migrate to v4 in this MVP. |
| Signature storage | `change_orders.signed_by / signed_at / ip_address` + typed legal name and optional SVG data URL stored in an additive `change_order_signatures` table (does not alter DB.txt tables). |
| Audit logging | Additive `audit_events` table (tenant-scoped, cascade). No changes to the four canonical tables. |

### MVP boundary (explicit non-goals)

No native apps, no QuickBooks/Sage sync, no CAD/PDF parsing, no Stripe/ACH payment processing, no punch list, selections hub, or invoicing. CSV export is the only accounting bridge.

**Amended 2026-11-01:** realtime project messaging (WebSockets/SSE + Web Push, per-tenant flag, default off) and text-only project daily logs were promoted from the deferred backlog into scope. Customizable project stages, derived progress, admin project creation, and the client portal Active/Closed split were added as in-scope extensions of `projects.current_phase` and `projects.progress_percentage`. Daily-log images and all binary upload remain out of scope. See `IMPLEMENTATION_TODO.md` for the phased delivery and `SRS.txt` §3 for the amended boundary.

---

## 1. Target architecture

### 1.1 Repository layout

```
ConsClient/
├─ constructops-core/              # Express API (Architecture blueprint, honored)
│  ├─ src/
│  │  ├─ config/                   # env, database (pg + PGlite adapter), redis
│  │  ├─ middleware/               # tenantResolver, authenticate, authorize, featureGate
│  │  ├─ modules/
│  │  │  ├─ tenant/                # public config, branding, pricing matrix
│  │  │  ├─ auth/                  # login, logout, me
│  │  │  ├─ project/
│  │  │  ├─ changeOrder/
│  │  │  ├─ estimator/
│  │  │  └─ audit/
│  │  ├─ utils/                    # asyncHandler, errors, uuid, contrast
│  │  ├─ app.ts
│  │  └─ server.ts
│  ├─ test/
│  └─ package.json
├─ constructops-web/               # Next.js App Router frontend
│  ├─ app/
│  │  ├─ (public)/                 # tenant landing, /estimate, /login
│  │  ├─ (app)/app/                # admin + field workspace
│  │  └─ (portal)/portal/          # client workspace
│  ├─ components/                  # ui primitives, brand shell, motion
│  ├─ lib/                         # api client, tenant context, contrast, format
│  └─ styles/
├─ packages/shared/                # zod contracts + estimator math + role types
├─ infra/
│  ├─ migrations/                  # numbered SQL
│  ├─ seed/                        # demo tenant + users + projects + change orders
│  └─ docker-compose.yml           # postgres + redis (for environments that have Docker)
├─ PRODUCT.md                      # Impeccable product truth
├─ DESIGN.md                       # Impeccable durable visual system
├─ .impeccable/                    # surface briefs, review captures, design.json
└─ package.json                    # npm workspaces
```

No Docker is installed on this machine. Dev/test therefore use:
- **DB:** `@electric-sql/pglite` adapter behind the same repository interface, with migrations executed identically; `pg` Pool for real Postgres.
- **Cache:** `RedisTenantCache` (ioredis) in production, `MemoryTenantCache` (TTL map) in dev/test.
- Both adapters are selected by `DATABASE_URL` / `REDIS_URL` presence. No feature forks.

### 1.2 Request lifecycle (API)

1. `host` normalization (`subdomain.domain.tld`, `custom_domain`, localhost override via `X-Tenant-Host`).
2. Tenant hydration: memory cache → Redis → Postgres → cache write (TTL 1h).
3. `req.tenant` injection; unknown host → 404 JSON, never a stack trace.
4. Auth: httpOnly session cookie → JWT verify → `req.user`.
5. Tenant match: `user.tenant_id === req.tenant.id`, else 403 generic.
6. RBAC middleware per route.
7. Zod body/params validation (UUIDv4 regex on every id).
8. Controller (wrapped in `asyncHandler`) → service → repository (`tenant_id` bound in every query).
9. Global error handler with stable JSON shape.

### 1.3 API surface (MVP)

| Method | Route | Role | Purpose |
|---|---|---|---|
| GET | `/api/v1/public/tenant` | public | Host → branding, feature flags, company name |
| POST | `/api/v1/public/estimate` | public (rate-limited) | Smart quotation calculation |
| POST | `/api/v1/auth/login` | public | Credentials → session cookie |
| POST | `/api/v1/auth/logout` | any | Clear session |
| GET | `/api/v1/protected/me` | any | Session identity + tenant |
| GET | `/api/v1/protected/projects` | all roles | Tenant-scoped list (clients filtered to own) |
| GET | `/api/v1/protected/projects/:id` | all roles | Tenant + ownership scoped detail |
| PATCH | `/api/v1/protected/projects/:id/progress` | admin, field_staff | `current_phase`, `progress_percentage` only |
| GET | `/api/v1/protected/change-orders` | all roles | Tenant scoped |
| POST | `/api/v1/protected/change-orders` | admin | Create draft/pending |
| PATCH | `/api/v1/protected/change-orders/:id` | admin | Edit while pending |
| POST | `/api/v1/protected/change-orders/:id/approve` | client | Signature + IP + timestamp; locks record |
| POST | `/api/v1/protected/change-orders/:id/reject` | client | Reason + timestamp |
| GET/PATCH | `/api/v1/protected/admin/branding` | admin | Theme tokens + assets |
| GET/PATCH | `/api/v1/protected/admin/features` | admin | Feature flags + pricing matrix |
| GET | `/api/v1/protected/projects/:id/stages` | all (client scoped) | Stage plan + update trail |
| PUT | `/api/v1/protected/projects/:id/stages` | admin | Define or replace the stage plan |
| POST | `/api/v1/protected/projects/:id/stages/:stageId/status` | admin, field_staff | Set stage status with a required comment |
| GET/POST | `/api/v1/protected/projects/:id/daily-logs` | read: all, write: admin/field_staff | Text-only dated project logs |
| GET/POST | `/api/v1/protected/projects/:id/messages` | project participants | Realtime project messaging (flag-gated) |

All responses use `{ success, data }` / `{ success: false, error, timestamp }`.

### 1.4 Data model

Canonical DDL from `DB.txt` executed verbatim (minus redundant extension), plus:

- `change_order_signatures` (`change_order_id`, `signed_name`, `signature_svg`, `ip_address`, `user_agent`, `created_at`) — legal evidence, immutable.
- `audit_events` (`tenant_id`, `actor_id`, `entity`, `entity_id`, `action`, `metadata JSONB`, `created_at`) — append-only.
- Indexes exactly as specified, plus `idx_change_orders_project` and `idx_audit_tenant_created`.

---

## 2. Design system plan (Impeccable + Emil)

### 2.1 Surface inventory and modes

| Surface | Mode | Route |
|---|---|---|
| Tenant marketing landing | Persuade | `/` |
| Instant estimator | Persuade (working tool inside) | `/estimate` |
| Login | Operate | `/login` |
| Admin dashboard / projects / change orders / branding | Operate | `/app/*` |
| Field workspace (tablet/phone first) | Operate | `/app/field` |
| Client portal + change-order approval | Operate (trust-critical) | `/portal/*` |

One visual world, committed once in `DESIGN.md`; the public surface carries it hardest, the working surfaces borrow only type, palette, density, and one signature move.

### 2.2 Impeccable sequence (exact commands)

1. `impeccable init` → write `PRODUCT.md` (mechanism, audience, scene, proof, commitments).
2. `impeccable concept-seed --scope direction --mode persuade` → 7 candidates → assigned direction + challengers → user locks one → record `## Direction contract` in the surface brief.
3. `impeccable surface-brief write /` and `surface-brief write /app` for Operate surfaces.
4. Build code-led (Operate) and comp-led only if image generation becomes available (no Gemini key today → code-led public surface, ambition carried by the direction contract).
5. `impeccable critique` → fix → `audit` → `harden` → `adapt` → `optimize` → `polish`.
6. Screenshot rounds at 1440 and 390 (+ any real user viewport), drive all states, then finish review and `impeccable document` → `DESIGN.md` + `.impeccable/design.json`.

**Launcher fallback:** the install-time binary download failed once (GitHub release asset timeout). Before Phase 2 I retry `scripts/impeccable.cmd context`. If it still fails, I send the documented notice and proceed by reading `PRODUCT.md` / `DESIGN.md` / `reference/mode-*.md` directly, as the skill permits. No design decision is blocked by the launcher.

### 2.3 Visual territory (input to the direction round, not a pre-decision)

Construction world references to derive seven candidates from: plan-set and revision-cloud notation, job-site safety marking, permit stamps and municipal paperwork, material sample boards (concrete, plywood, steel, terrazzo), trade catalogs and spec books, framing layout marks, site signage. Explicit ruts to avoid: navy/orange contractor template, cream + serif editorial, generic SaaS card grid, dashboard-with-big-number hero.

Brand source for the demo tenant stays pinned: `#0B1220` navy, `#C2410C` orange, cream `#F6F3ED` (Creative Brief). ConstructOps' own identity is decided in Phase 2 and must survive tenant theming.

### 2.4 Tokens and theming

- Runtime CSS variables: `--primary-color`, `--secondary-color`, `--brand-bg`, `--brand-surface`, `--brand-radius`, `--brand-font`, plus derived `--brand-primary-fg`, `--brand-secondary-fg`.
- Contrast guard in `packages/shared`: WCAG relative luminance → choose black/white foreground; reject tenant colors below 4.5:1 for text use and surface a non-blocking admin warning with a corrected suggestion.
- Tailwind mapping exactly as `rebranding.txt` §2, consumed as `bg-brandPrimary`, `text-brandSecondary`, `rounded-brand`, `font-brand`.
- Motion tokens: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`; durations 100–160ms press, 125–200ms tooltip, 150–250ms dropdown, 200–400ms drawer/modal.
- Browser surfaces themed: selection, caret, scrollbar, focus ring (2px primary + offset), underline offset, tabular numerals.

### 2.5 Emil design-engineering rules applied

| Rule | Application |
|---|---|
| Animate only transform/opacity | All UI motion; no width/height/padding transitions |
| Press feedback | Every pressable at `scale(0.97)`, 160ms ease-out |
| No `scale(0)` | Entrances start at `scale(0.95)` + opacity 0 |
| Origin-aware popovers | Radix `--transform-origin`; modals stay centered |
| Ease-out for entrances, custom curves | Tokens above; never `ease-in` on UI |
| Keyboards are not animated | Command palette, tab switching, table sorting: instant |
| Interruptible transitions > keyframes | Toasts, drawers, inline state changes |
| Reduced motion | Opacity/color only, no positional movement |
| Hover gated | `@media (hover: hover) and (pointer: fine)` |
| Stagger 30–80ms | Feed/card entrances only, never blocking interaction |
| One authored moment per surface | Landing: estimator-to-quote reveal; app: change-order signature handshake |

---

## 3. Build phases

Each phase ends with a working, verifiable state. No phase is "done" on intent.

### Phase 0 — Repository and toolchain baseline (0.5 day)

- `git init`, `.gitignore`, `.editorconfig`, npm workspaces root.
- `constructops-core`, `constructops-web`, `packages/shared` scaffolds; TypeScript strict + path aliases.
- ESLint + Prettier, scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:e2e`, `db:migrate`, `db:seed`.
- `.env.example` matching `Architecture §4` (abort on missing vars in production only).
- `infra/docker-compose.yml` for Postgres 16 + Redis 7 (documented, not required locally).

**Done:** `npm run typecheck` and `npm run lint` pass on empty scaffolds; `npm run dev` starts both apps.

### Phase 1 — Product truth and design direction (1 day)

- `PRODUCT.md`: mechanism ("one deployment, every contractor's own branded workspace"), audience, scene, proof, constraints, out-of-scope list.
- Direction round per Impeccable (7 candidates, assigned roll, challengers, verdicts) → user picks → direction contract.
- `DESIGN.md` skeleton (filled at finish), surface briefs for `/`, `/app`, `/portal`.
- Motion spec + type scale + palette strategy written into the brief.
- Synthetic demo content authored at full fidelity (Santos Construction: projects, change orders, estimator matrix).

**Done:** direction contract confirmed by user; every color/type/motion decision traceable to `DESIGN.md` or a surface brief; no UI code yet.

### Phase 2 — Design system foundation (1.5 days)

- Global CSS variables, Tailwind theme map, self-hosted fonts (chosen in Phase 1, not a training-data default), type scale, spacing rhythm.
- Primitives: Button, Input, Select, Textarea, Checkbox, Dialog, Sheet/Drawer, Popover, Tooltip, Tabs, Table, Badge, Progress, Toast — Radix-based, fully branded, all states (hover, active, focus, disabled, loading, error).
- `BrandShell` (navbar/sidebar variants from `branding_config.layout`), `DataCard`, `BrandButton`, `ProgressBar` per `visual-specifications`.
- Theme provider: server-read tenant config → inline CSS vars; client override for mismatch banner.
- Story/demo route `/_system` (dev-only) showing every primitive and state at 390/768/1440.

**Done:** `/_system` passes contrast + keyboard + reduced-motion checks; no primitive uses `transition: all`; zero stock shadcn styling remains.

### Phase 3 — API core (2 days)

- Config validation (zod), `pg` Pool + PGlite adapter, Redis + memory cache adapters.
- Migrations: canonical schema + additive signature/audit tables + indexes.
- `tenantResolver` (host normalization, cache, DB fallback), `authenticate`, `authorize(role)`, `featureGate`.
- `asyncHandler`, typed `AppError`, global error handler, request logging (pino), helmet, CORS allowlist, rate limits (login, estimate).
- Auth module: bcryptjs hash, HS256 JWT, httpOnly cookie, origin check + CSRF token for mutations, `/me`.

**Done:** migration + seed run on PGlite and Postgres; unit tests for host parsing, JWT, RBAC matrix, contrast guard.

### Phase 4 — API domain modules (2.5 days)

- **Tenant:** public config, branding update, feature flags, pricing matrix update (admin).
- **Estimator:** shared pricing math, server-authoritative calculation, strict validation, per-tenant isolation, rate limit.
- **Projects:** list/detail scoped by tenant and role; field progress update restricted to `current_phase` + `progress_percentage`.
- **Change orders:** draft → pending → approved/rejected state machine; client approve writes signature, IP (IPv4/IPv6), user agent, timestamp; approved/rejected records immutable; audit events on every transition.
- **Audit:** append-only writer + admin read.

**Done:** integration tests cover cross-tenant denial (403), client ownership filtering, invalid UUIDs (400), illegal state transitions (409), approval evidence persistence.

### Phase 5 — Web public surface (2 days)

- Tenant resolution in the App Router root layout; CSS variable injection; favicon/logo; metadata per tenant.
- Landing: committed direction, working estimator entry, real proof (project imagery, process), single primary action, no eyebrow labels, no card-grid scaffold.
- Estimator: multi-step form (scope → dimensions → material tier → review), live math from shared package, accessible errors, instant quote with breakdown, "Request this quote" → lead capture stub (email link, no CRM).
- Login: tenant-aware, workspace mismatch warning path.

**Done:** 1440 + 390 renders verified; estimator totals match server exactly; LCP < 2.5s locally; Lighthouse a11y ≥ 95.

### Phase 6 — Workspace and portal surfaces (3 days)

- App shell (sidebar, topbar, mobile drawer), role-aware navigation.
- Admin dashboard: active projects, budget/change-order exposure, activity from audit events; no hero-metric template.
- Projects list + detail (timeline phases, progress, client, change orders).
- Change-order composer + review screen; status history.
- Field workspace: today's projects, phase/progress update, large touch targets, offline-tolerant form state.
- Client portal: project progress, pending change orders, approval dialog with typed signature + explicit consent, receipt state.
- Settings/branding: color pickers with contrast feedback, radius/font/layout controls, live preview.
- Domain-mismatch banner per `rebranding.txt` §4.

**Done:** all three roles complete their primary job in Playwright; approval evidence visible in DB; no dead controls; empty/loading/error states designed.

### Phase 7 — Motion and interaction polish (1 day)

- Signature moments: estimator → quote reveal (clip-path + stagger, 300–500ms, once); approval handshake (seal/press confirmation, 200–300ms, respects reduced motion).
- Page transitions kept minimal; no keyboard-initiated animation.
- Toasts with interruptible transitions; tooltips instant after first; drawers with momentum + damping.
- Slow-motion and frame-by-frame check; fix all findings in one batch.

**Done:** no animation exceeds 300ms on task surfaces; reduced motion path verified; no layout thrash (DevTools performance trace).

### Phase 8 — Security, hardening, and failure paths (1.5 days)

- Full zod coverage, UUID checks, parameterized-query audit, `tenant_id` audit across repositories.
- 403/404 policy (no schema hints), generic auth errors, login throttling, secure cookie flags.
- CSP (nonce-based), HSTS, frame-ancestors, referrer policy, body limits, file-path-only assets.
- Tenant color contrast enforcement; input overflow/i18n hardening; long names, 10k-char notes, emoji, RTL smoke test.
- Secrets hygiene, `.env` never committed; dependency audit.

**Done:** OWASP-style checklist passes; cross-tenant brute-force script returns only 403/404; `npm audit` no high/critical.

### Phase 9 — Test suite and verification (1.5 days)

- Unit: estimator math, contrast, host parsing, state machine.
- Integration (supertest + PGlite): auth, RBAC, isolation, signatures, rate limits.
- E2E (Playwright): seed → login as each role → estimator quote → change order approve → field progress → cross-tenant denial.
- Axe scans on 6 key routes; contrast assertions; keyboard-only walkthrough.
- Visual captures `.impeccable/review/desktop.png`, `mobile.png`, per-route.

**Done:** `npm test` + `npm run test:e2e` green; axe zero critical/serious; every acceptance criterion below demonstrated.

### Phase 10 — Impeccable finish, docs, handover (1 day)

- `impeccable critique` → `audit` → `polish`; finish review at reviewed scope; act on ship/fix/rebuild/recapture exactly.
- `impeccable document` → token-bearing `DESIGN.md` + `.impeccable/design.json`; raster provenance embedded.
- `README.md`: setup (Postgres/Supabase or PGlite, Redis or memory), migrate, seed, run, test, roles, demo credentials.
- Seed script: `santos` tenant, admin/field/client users, 4 projects, change orders across all states, pricing matrix.
- Final report: what shipped, what was deferred, open risks.

---

## 4. Acceptance criteria (project-level)

1. One deployment serves multiple hosts; branding, feature flags, and estimator matrix change per host with no restart.
2. Every business query is tenant-bound; cross-tenant reads/writes return 403/404 and are covered by tests.
3. `admin` / `field_staff` / `client` match the RBAC matrix exactly, including field-only progress fields and client-only signature rights.
4. Change-order approval persists signer, signature, IP, user agent, timestamp; the record is immutable afterward; audit event written.
5. Estimator: server-authoritative, matches shared math, rejects malformed input, rate-limited.
6. Public site, app, and portal work at 390/768/1440; keyboard complete; WCAG 2.2 AA contrast; reduced motion honored.
7. Tenant colors that fail contrast are blocked with a correction, never rendered as invisible text.
8. No out-of-scope feature (chat, native, ERP, CAD/PDF, payments) exists in code or routes.
9. `typecheck`, `lint`, unit, integration, e2e all green; finish review disposition recorded.
10. `DESIGN.md` + `design.json` describe the shipped system; every raster has provenance.

---

## 5. Risks and fallbacks

| Risk | Impact | Mitigation |
|---|---|---|
| No Docker/Postgres/Redis installed | Cannot run real infra locally | PGlite + memory cache adapters for dev/test; real adapters ship and are selected by env; Supabase/Upstash path documented |
| Impeccable CLI binary download blocked | Direction/comps scripts unavailable | Read `reference/mode-*.md` and follow documented fallback; record `seed: none (unavailable)` if required |
| No image-generation key | Comp-led path unavailable | Code-led build; authored/sourced imagery with provenance; direction contract carries ambition |
| Specs disagree (LLD vs SRS/Architecture) | Scope drift | Conflict table above is binding; LLD extras backlogged |
| Tenant theming breaks accessibility | Legal/UX failure | Shared contrast guard + tests + admin warning |
| Scope is large for one pass | Half-finished surfaces | Phase gates; each phase ends shippable; no Phase N+1 work started early |

---

## 6. Assumptions to confirm (override any before Phase 0)

1. **Two apps, one repo** (`constructops-core` Express API + `constructops-web` Next.js) rather than a single Next.js fullstack app.
2. **Strict SRS MVP**: change orders + estimator + RBAC + tenancy only; LLD extras (daily logs, punch list, selections, invoices, Stripe) deferred.
3. **Public surface is a per-tenant contractor site** (landing + estimator), not a ConstructOps corporate marketing site. A corporate site would be a separate surface.
4. **Demo tenant** is Santos Construction with the pinned navy/orange/cream palette; ConstructOps' own identity is designed fresh.
5. **Local dev may run without Docker** via PGlite + memory cache; production requires Postgres + Redis.
6. **Auth is first-party** (email + password, httpOnly JWT), no Auth0/Clerk.
7. No real photography is available; I will source verified stock or author synthetic material and label/provenance it.

---

## 7. First execution slice (after go-ahead)

1. Phase 0 scaffolding + git init + green typecheck/lint.
2. Phase 1 `PRODUCT.md` and the Impeccable direction round (questions + decision page).
3. Freeze the direction contract, then build Phase 2 primitives and `/_system`.
4. Demo seed, then Phase 3/4 API with tests.
5. Only then public surface, workspace, portal, motion, hardening, finish review.

No UI code is written before the direction contract is confirmed. No backend module is written before migrations and tenant resolver are proven.
