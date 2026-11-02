# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed by the supplied specifications, not delegated: Node.js 20+ / TypeScript / Express / PostgreSQL / Redis / JWT for the API, and Next.js (App Router) / Tailwind / Radix primitives for the web surface. The scaffolding is in place; alternatives named in LLD(1) (NestJS, Go, Auth0/Clerk) are rejected by SRS and Architecture.

## Users

**Primary — contractor owner / office manager.** Runs a 5–50 person specialty contracting business (remodeling, concrete, roofing, mechanical). Sits at a laptop in the office or trailer, quotes work, manages several active jobs, issues change orders, and chases client approvals by phone and text. Measured by whether jobs stay profitable and clients stay calm.

**Secondary — field staff (superintendent / foreman).** On site, phone in one hand, gloves on, direct sun or dust, intermittent signal. Updates the current phase and progress; does not price work.

**Secondary — client (homeowner or property manager).** Non-technical, often anxious about surprise costs. Reviews project progress and change orders on a phone and approves with a signature. May arrive from a text link, not a login habit.

## Product Purpose

Give each contractor a branded workspace at their own domain where they can quote work, run projects, issue change orders, and collect client approvals without printing, scanning, or phone tag. Success is a client approving a change order on their phone, with the contractor's identity intact and no call required.

## Positioning

The tenant is the product surface: host-resolved branding, pricing matrix, roles, and client experience are tenant data, not per-customer deployments. One codebase serves every contractor's domain without forks, rebuilds, or a "powered by" strip.

## Operating Context

Work happens between an office, a truck, and a job site. Plans, permits, material selections, and change orders are the documents of record. Clients make decisions in the evening, on a phone, often while comparing two contractor quotes. Field updates happen in sunlight and gloves. Connectivity is unreliable. A change order is a financial and legal artifact, not a notification.

## Capabilities and Constraints

In scope: host-based tenant resolution, per-tenant branding and feature flags, role-based access (`admin`, `field_staff`, `client`), a public tenant-branded landing page, an instant quotation estimator driven by a per-tenant pricing matrix, project tracking, and the change-order draft → pending → approved/rejected signature loop with IP and timestamp evidence.

In scope by amendment (2026-11-01): admin-created projects with a customizable ordered stage plan; a derived progress bar per project; field stage transitions that require a comment; a client portal split into Active Projects and Closed Projects with a per-project progress view; text-only daily logs authored by the field; and per-project realtime messaging between client and field/office with Web Push notifications, gated per tenant by an `enable_project_chat` flag that defaults off.

Out of scope for this build: native apps, ERP/accounting sync, CAD/PDF parsing, payment processing, punch lists, selections hub, and invoicing. CSV export is the only accounting bridge. Daily-log images and any binary upload or object storage remain out of scope under the `SRS.txt` asset-path prohibition.

Technical constraints: PostgreSQL with mandatory `tenant_id` scoping, parameterized SQL, JWT sessions, Redis-or-memory tenant cache, WCAG 2.2 AA, no fabricated commercial claims.

Open product decisions: whether the estimator ends in a stored lead or a mailto handoff (this build uses a mailto handoff with a persisted estimate summary); whether client accounts are invited or self-created (this build invites them from a project).

## Brand Commitments

Product name: ConstructOps (the engine); the customer-facing surface always leads with the tenant's name, never ConstructOps.

Demo tenant: **Santos Construction**, with the pinned palette from the creative brief — navy `#0B1220`, orange `#C2410C`, cream `#F6F3ED`. These are tenant data and must not become the product's own identity by accident.

No real customer logos, testimonials, benchmarks, or case studies exist. They must not be invented.

## Evidence on Hand

Synthetic demo data only: tenants, users, projects, change orders, and a pricing matrix authored for the demo. Imagery is stock placeholder to be replaced later; every placeholder must be labeled as illustrative in the repository and carry a provenance record. No press, awards, certifications, or customer counts are available.

## Product Principles

1. **The tenant's brand is the interface; ConstructOps recedes.** Product chrome never competes with the contractor's identity.
2. **Every money decision carries evidence.** Price, scope, signer, timestamp, and IP are visible and durable, never implied.
3. **The field is the hardest room.** One hand, bright sun, gloves, bad signal: design for that before the desktop.
4. **Trust is a design material.** No surprise totals, no hidden state, no dead ends; a client can always see what they are approving and what happens next.
5. **One deployment, no forks.** Tenancy and permissions are enforced at every layer, not decorated at the edge.

## Accessibility & Inclusion

WCAG 2.2 AA is the floor. Mobile-first for field and client surfaces; 44px minimum touch targets; visible focus; reduced-motion path for every animated moment; plain language for clients; tenant colors that fail contrast are rejected with a correction rather than rendered as unreadable text.
