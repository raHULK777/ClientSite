# ConstructOps

A multi-tenant, white-label workflow platform for remodeling contractors. ConstructOps combines a public estimating experience, an office workspace for projects and change orders, and a client portal for approvals and signed records.

The product is built around host-based tenancy: one deployment can serve multiple contractor brands, each with its own subdomain, palette, feature flags, and pricing matrix. The contractor is the author; ConstructOps stays in the background.

## What it does

- **Public estimator.** A visitor enters project type, size, tier, complexity, and add-ons. The API prices the job from the tenant's matrix and the page renders an itemized, printable quote.
- **Contractor workspace.** Admins and field staff see project rollups, schedules, progress, clients, and change orders. Admins can create and price work; field staff can update field progress.
- **Client portal.** A client sees only the projects linked to their account, reviews pending change orders, signs approvals, and sees the stamped record.
- **Multi-tenant controls.** Tenant resolution by host, per-tenant branding, feature gates, pricing, role-based access, audit events, and contrast-checked foregrounds.

## Stack

- Node.js, TypeScript, npm workspaces
- Express 4 API with Zod validation, JWT cookies, CSRF protection, rate limits, and Pino logging
- PostgreSQL via `pg`, or an embedded PGlite database for local development
- Optional Redis tenant cache, with an in-memory fallback
- Next.js 16 App Router with React 19, Tailwind CSS, Radix primitives, and `next/font`
- Shared pricing, schemas, and contrast logic in `packages/shared`
- Vitest for unit tests, Playwright plus axe-core for end-to-end and accessibility tests

## Repository layout

| Path | Purpose |
| --- | --- |
| `constructops-core/` | Express API, authentication, tenancy, projects, change orders, migrations, seed data |
| `constructops-web/` | Next.js landing page, login, workspace, client portal, `/system` design sheet |
| `packages/shared/` | Shared Zod schemas, estimator, contrast policy, formatting helpers |
| `infra/migrations/` | Versioned SQL migrations |
| `e2e/` | Playwright suites for auth, estimator, field updates, portal approvals, accessibility, and screenshots |
| `DESIGN.md` | Design-system contract, token frontmatter, and durable rules |
| `.impeccable/` | Design briefs, sidecar metadata, and review screenshots |

## Prerequisites

- Node.js 20 or newer (the project is verified on Node 24)
- npm 10 or newer
- Chromium for Playwright if you intend to run browser tests: `npx playwright install chromium`
- Optional: PostgreSQL 14+ and Redis 6+ for production-like runs

Docker is not required. Local development defaults to PGlite and an in-memory tenant cache.

## Quick start

1. Install dependencies from the repository root:

   ```powershell
   npm install
   ```

2. Create the workspace environment files. The API and the web app load environment files from their own working directories, not from the repository root. The root `.env.example` is the canonical reference; copy it to both workspace locations:

   ```powershell
   Copy-Item .env.example constructops-core/.env
   Copy-Item .env.example constructops-web/.env.local
   ```

   For macOS or Linux, use `cp .env.example constructops-core/.env` and `cp .env.example constructops-web/.env.local`.

3. Apply the database schema and load the demo tenant:

   ```powershell
   npm run db:migrate
   npm run db:seed
   ```

   `db:seed` is idempotent for the demo records and also runs migrations. It is intended for local and test environments only.

4. Start the API and web app together:

   ```powershell
   npm run dev
   ```

5. Open:

   - Landing page: <http://localhost:3000>
   - Login: <http://localhost:3000/login>
   - Workspace: <http://localhost:3000/app>
   - Client portal: <http://localhost:3000/portal>
   - Design sheet: <http://localhost:3000/system>
   - API health: <http://localhost:4000/health>

The development tenant is Santos Construction. A request to `localhost` resolves to `DEV_TENANT_HOST=santos.localhost`; you can also browse the tenant directly at <http://santos.localhost:3000>. Most modern browsers resolve `*.localhost` automatically. If yours does not, add `127.0.0.1 santos.localhost` to your hosts file.

## Demo accounts

All demo accounts use the password `SantosDemo!23`.

| Role | Email | Sees |
| --- | --- | --- |
| Admin | `owner@santos.test` | Workspace, projects, change orders, clients, settings |
| Field staff | `field@santos.test` | Project index, field board, projects, change orders |
| Client | `client@santos.test` | Portal for the Santos projects linked to this account |
| Client (other account) | `client2@santos.test` | A separate client scope; useful for tenant and project isolation checks |

Demo projects include `Elm Street Kitchen` (active, Cabinets, 62%), `Harbor Bath` (planning, Permitting, 10%), and `Ridge Addition` (active, Framing, 35%). The seed also creates pending and approved change orders for approval-flow testing.

## Environment variables

The API reads `constructops-core/.env`; Next.js reads `constructops-web/.env.local`. In production, inject environment variables through your process manager or hosting platform rather than committing `.env` files.

### API

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `API_PORT` | `4000` | API listen port |
| `WEB_ORIGIN` | `http://localhost:3000` | Exact browser origin allowed in production; development also permits localhost subdomains on the same protocol and port |
| `DATABASE_URL` | empty | Empty uses PGlite; set a PostgreSQL URL for a shared database. Required in production |
| `REDIS_URL` | empty | Empty uses the in-memory tenant cache; set a Redis URL for shared cache |
| `JWT_SECRET` | development-only secret | At least 32 characters. Must be set in production |
| `JWT_EXPIRES_IN` | `8h` | JWT lifetime |
| `COOKIE_DOMAIN` | empty | Set to the parent domain (for example `.example.com`) when tenants use subdomains |
| `COOKIE_SECURE` | `false` | Must be `true` in production, which requires HTTPS |
| `RATE_LIMIT_DISABLED` | `false` | Test-only escape hatch; never enable in production |
| `TENANT_CACHE_TTL_SECONDS` | `3600` | Tenant cache lifetime |
| `DEV_TENANT_HOST` | `santos.localhost` | Tenant used when the development host is plain `localhost` |
| `PGLITE_DATA_DIR` | `.data/pglite` | PGlite directory, resolved from the API working directory |

Generate a production JWT secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Web

| Variable | Default | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Public fallback API base for server-side calls |
| `API_INTERNAL_URL` | falls back to `NEXT_PUBLIC_API_URL` | Preferred private API URL for the Next.js server and `/api/core` proxy |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `localhost:3000` | Reserved configuration value; current tenant resolution uses the request host |

Browser mutations go through the same-origin `/api/core` proxy, which forwards the tenant host and auth cookies to the API. `API_INTERNAL_URL` is server-side only and is the value to set when the API is reachable on a private network name.

## Tenancy and authentication

- The API resolves the tenant from `X-Tenant-Host`, the `Host` header, or a custom domain mapping. In development, `localhost` falls back to `DEV_TENANT_HOST`.
- The web app forwards the incoming host to the API so tenant branding, feature flags, and pricing follow the address the visitor used.
- Sessions are HTTP-only JWT cookies. Mutations also require the `co_csrf` cookie and a matching `X-CSRF-Token` header.
- Roles are `admin`, `field_staff`, and `client`. Clients see only projects linked to their user record. Cross-tenant project access returns `404` rather than leaking existence.
- `/system` is `noindex, nofollow`. It renders the interactive component sheet and the live tenant contrast check.

## API surface

The API is mounted at `/api/v1` and returns JSON in the form `{ "data": ... }` or `{ "error": "...", "details": ... }`.

| Group | Routes |
| --- | --- |
| Public | `GET /public/tenant`, `POST /public/estimate` |
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Projects | `GET/POST /protected/projects`, `GET/PATCH /protected/projects/:id`, `GET/POST /protected/projects/:id/change-orders` |
| Change orders | `GET /protected/change-orders`, `PATCH /protected/change-orders/:id`, `PATCH /protected/change-orders/:id/approve`, `PATCH /protected/change-orders/:id/reject` |
| Tenant | `GET /protected/tenant`, `PATCH /protected/tenant/branding`, `PATCH /protected/tenant/features`, `PUT /protected/tenant/pricing` |
| Audit | `GET /protected/audit` |
| Health | `GET /health` on the API root |

The web app exposes its own pages and a same-origin proxy at `/api/core/[...path]`. Do not call the private API URL from browser code.

## Scripts

Run these from the repository root.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run API and web together |
| `npm run dev:api` | Run only the API with `tsx watch` |
| `npm run dev:web` | Run only the Next.js app on port 3000 |
| `npm run build` | Build the API bundle and the Next.js production app |
| `npm run typecheck` | TypeScript checks across all workspaces |
| `npm run lint` | ESLint with zero warnings allowed |
| `npm run lint:fix` | ESLint with automatic fixes |
| `npm test` | Unit tests for the core and shared packages |
| `npm run test:e2e` | Full Playwright suite; starts isolated API and web servers |
| `npm run format` | Format the repository with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:seed` | Migrate and load demo data |

### End-to-end tests

`npm run test:e2e` starts its own API on port `4100` and web app on port `3100`, uses a separate PGlite directory at `constructops-core/.data/pglite-e2e`, and disables rate limiting for the test run. The suite is intentionally serial.

The suite covers:

- Authentication and redirects for each role
- Estimator pricing and the public tenant surface
- Field progress updates and drafts
- Client change-order approval and rejection
- Accessibility scans on six routes with a critical/serious axe gate
- Screenshot capture at 1440×900 and 390×844 with a document-overflow assertion

Screenshots are written to `.impeccable/review/`; failure traces and videos are written to `test-results/`. The HTML report is written to `playwright-report/`.

Example targeted runs:

```powershell
npx playwright test e2e/auth.spec.ts
npx playwright test e2e/a11y.spec.ts
npx playwright test e2e/screenshots.spec.ts
```

## Database and reset

With no `DATABASE_URL`, the API uses PGlite in `constructops-core/.data/pglite`. To reset local data, stop the API and delete that directory, then run `npm run db:migrate` and `npm run db:seed` again.

For PostgreSQL, set `DATABASE_URL` in `constructops-core/.env`, create an empty database, and run the migration and seed commands. Migrations are tracked in `schema_migrations` and are safe to re-run. The seed upserts the demo tenant and records by fixed IDs; do not run it against a production database.

## Production notes

- Use PostgreSQL and Redis; PGlite and the in-memory cache are development fallbacks.
- Set `NODE_ENV=production`, a strong `JWT_SECRET` of at least 32 characters, `COOKIE_SECURE=true`, the public `WEB_ORIGIN`, and `COOKIE_DOMAIN` when using tenant subdomains.
- Serve the web app over HTTPS. Secure cookies will not work over plain HTTP.
- Set `API_INTERNAL_URL` to the API's private address for the Next.js server proxy.
- Build once, then run the compiled services:

  ```powershell
  npm ci
  npm run build
  npm run db:migrate
  npm run start -w @constructops/core
  npm run start -w @constructops/web
  ```

- Run the API and web app as separate processes behind your reverse proxy. Route tenant hostnames to the web app; it forwards host identity to the API.
- Review the security policy and audit logging requirements in `Security-policy.txt` before a real deployment.

## Design system

The visual contract lives in `DESIGN.md`: token frontmatter, typography, layout, elevation, shapes, components, and the durable "The Job Set" rules. `.impeccable/design.json` carries the machine-readable sidecar: tonal ramps, shadows, motion, breakpoints, component snippets, and narrative guardrails.

The design is tenant-branded paper and ink: cool paper ground, white sheets, square corners, 1px rules, Archivo for hierarchy, Saira Stencil for stamps, and revision red reserved for actual change. Tenant palettes are data and are checked for contrast before use.
