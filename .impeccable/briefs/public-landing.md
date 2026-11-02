# Surface brief — public landing + estimator

Mode: **Persuade**
Status: direction locked by the user (2026-10-30)
Seed: none (concept-seed unavailable on this network; seven candidates derived manually, decision board at `decisions/direction.html`)

## Commit

**The Job Set.** The page is the contractor's plan set for the client, not a picture of one. A cool paper sheet with a faint drafting grid, a sheet index as navigation, a title block carrying the contractor's identity, and a live takeoff schedule that prices the job as the visitor answers. Tenant color is the title-block field and the primary action; the tenant's secondary color (or a functional red when contrast fails) is reserved for revisions and totals.

The offer is intelligible in one line, the estimator is the primary action in its working form inside the first viewport, and the page demonstrates something only this product can prove: a branded, itemized quote produced on the spot.

## Design read

- **Audience in the room:** a homeowner on a phone at 8pm comparing two quotes, suspicious of surprise costs; and the contractor's office manager, who wants to look established without commissioning a website.
- **What the page must prove:** this contractor is precise, transparent, and easy to deal with; the price is real and itemized; approval later will be documented, not verbal.
- **How it should feel:** drafted, not decorated. Quiet confidence, visible measurements, plain language, one moment of craft.
- **What must be avoided:** blueprint-blue ground; monospace as costume; neon CTAs; cream editorial pastiche; a house-photo hero with three equal service cards; fabricated proof.

## Direction contract

### World
- Cool paper `#F8F9F9` ground (not cream), faint 22px drafting grid at 5.5% ink.
- Near-black ink `#15202B` for rules and type; muted `#5C6A76` for secondary.
- Tenant primary: title-block field, primary action, selected states.
- Tenant secondary (or `#B3261E` fallback): revision marks, totals, change indicators.
- 1px ink rules; 1px dotted rules inside schedules; dashed revision clouds; title block as a solid dark band with tenant color.
- No fake paper photography, no torn edges, no blueprint texture. The sheet is built from CSS, typography, and rules.

### Type
- **Archivo** variable, self-hosted via `next/font/google`, width axis 62–125.
  - Display/title: width 125, weight 800, uppercase, tight tracking (-0.02em), line-height 0.95.
  - Section heads: width 112, weight 700.
  - Body: width 100, weight 400, 16–18px, line-height 1.55.
  - Labels: width 112, weight 600, uppercase, 11px, letter-spacing 0.12em.
- **Saira Stencil One** only for sheet/project numbers and the approval stamp.
- Tabular numerals everywhere a number is compared (`font-variant-numeric: tabular-nums`).
- No third text family; no monospace for body.

### Composition — first viewport
- Full-height sheet. Top sheet bar: contractor name, sheet number, index tabs (Scope · Takeoff · Terms) as in-page anchors.
- Left column: kicker (revision + location), display title, one-line offer, inline scope chips (kitchen / bath / addition / structural), primary action.
- Right column: live takeoff sheet — line items, allowances, range, revision cloud around the total, stamp.
- Bottom title block: contractor name, license, service area, phone.
- Mobile (`<900px`): sheet bar, title, estimator first, chips and total reachable without scroll; title block becomes a static band below the fold, plus a compact call strip. No fixed overlay covering the form.
- Below the fold: scope detail as drawing notes, process as a dimension-line timeline, material/credential strip, evidence block, footer with license and service area.

### Signature interaction
Answering the estimator **drafts the quote**:
1. Dimension lines extend from the active field (240ms, stagger 40ms).
2. Schedule rows land in sequence (160ms each, translateY 8px + opacity).
3. A revision cloud draws around the total (320ms, SVG stroke).
4. One stamp lands (180ms, scale 1.06 → 1, rotate -4deg).
All transform/opacity, `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. Press feedback `scale(0.97)`. Keyboard changes are instant. `prefers-reduced-motion` swaps every step for an instant state change. This is the surface's one authored moment; everything else is quiet.

### Donor lines (from the direction round)
- **Permit stamp → evidence floor:** signer, timestamp, IP, and scope live in ruled evidence boxes; approvals are stamped receipts.
- **Trade catalog → index discipline:** the estimator is a spec schedule with alternates and an index, not pricing cards.
- **Job signage → distance legibility:** stencil sheet numbers and status marks legible at arm's length in sun.
- **Framing layout → measured margins:** dimension ticks bracket totals and progress.
- **Survey stake → grounding:** project phases sit on a site/contour timeline, not a generic stepper.

### Color behavior under tenant theming
- Tenant palette arrives as CSS variables (`--brand-primary`, `--brand-secondary`, `--brand-bg`, `--brand-surface`).
- The world's paper and ink are fixed; tenant colors replace the title-block field, primary action, selection, and revision marks.
- Contrast guard: body text 4.5:1, large text 3:1; auto-pick foreground; reject and warn in admin when a tenant combination fails.
- Never let the demo tenant's navy/orange/cream become the product's own identity.

## Content rules
- Write as the contractor, not as ConstructOps. ConstructOps never appears on the tenant surface.
- Price lines are concrete; allowances are labeled as allowances; the range is explained.
- No fabricated testimonials, project counts, awards, certifications, or completion times.
- Placeholder imagery is labeled illustrative in the repo with provenance; no fake client logos.
- Plain language: "Price my project," "What's included," "Approve this change."

## Accessibility floor
- WCAG 2.2 AA; 44px minimum targets; visible focus (2px ink ring, 2px offset); labels always visible; inline errors with `aria-describedby`.
- Estimator usable by keyboard and screen reader; totals announced via a polite live region, not on every keystroke (debounced).
- Reduced-motion path for the signature moment; no scroll-jacking.

## Out of scope for this surface
- Image generation (unavailable); fabricated proof; blueprint-blue or dark-mode-first; monospace body; decorative scroll animations; more than one signature moment.
