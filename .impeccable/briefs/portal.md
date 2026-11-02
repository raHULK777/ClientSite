# Surface brief — client portal

Mode: **Operate**
Status: contract for Phase 8; not built yet.
World: The Job Set, handed to the client. One job, plainly stated, with a record they can keep.

## Job in the room

A homeowner on a phone, often at night, deciding whether to approve added work. They are not project managers. They need: what changed, why, what it costs, what happens if they say yes, and proof of what they approved. Anxiety is the enemy; density is not the goal.

## Shape

- No app navigation. One project header with contractor identity and a direct contact line.
- **Project summary:** address, status stamp, original contract, approved changes, current total. Plain-language status ("Work is scheduled to start 12 May"), not internal codes.
- **Change orders:** one card per change. Scope in plain language, line items expandable, delta and revised total, attachments. Primary action: Review and approve.
- **Approval:** a focused sheet — summary, line items, terms, signature. Signing requires a name and explicit consent; the record shows timestamp and scope. After signing, the same sheet becomes a stamped receipt, immutable.
- **History:** a ruled timeline of sent, viewed, approved, declined, voided, with dates. No chat.
- **Documents:** the quote and signed change orders as downloadable records.

## Rules

- The client sees only their project. Tenant isolation is enforced server-side; the UI never offers a project switcher.
- Money is always labeled: original, change, revised. No unexplained totals.
- Declining is as easy as approving, and requires no reason.
- No marketing, no upsell, no ConstructOps branding beyond a quiet footer.
- Mobile first; one column at every width up to `720px`. Targets 44px. Signature and consent are keyboard-accessible.

## Motion

One moment: the approval stamp lands and the record settles. 180ms, transform/opacity only, instant under reduced motion. Everything else is quiet.

## Accessibility

AA contrast, visible focus, 44px targets, labeled signature and consent, errors adjacent, status changes announced. The signed record must remain readable without JavaScript-dependent animation.
