# Surface brief — contractor app

Mode: **Operate**
Status: contract for Phases 6–7; not built yet.
World: The Job Set, opened. The product is the desk the plan set lives on — index, schedule, stamps, and money.

## Job in the room

The owner or office manager is between calls. They need today's status, the next change order to send, and the money on each job without opening three tabs. They are not browsing; they are working. Accuracy and speed beat delight, but the surface should still feel like their firm, not generic SaaS.

## Shell

- Left index rail (`240px`): tenant wordmark, project index, Change orders, Clients, Settings. Active item is a ruled index tab, not a colored pill. Collapses to a drawer under `768px`.
- Topbar (`64px`): current sheet title, project number, role chip, account menu. No global search until there is enough data to justify it.
- Ground is `paper`; content sits on raised sheets with 1px ink rules. Tenant primary fills the title band and selection; tenant secondary marks revisions and money changes.
- Empty states are drawing notes ("No change orders on this job yet"), not illustrations.

## Screens

1. **Projects index.** Dense schedule: project, client, status stamp, contract value, approved changes, revised value, updated. Sort and filter by status. Primary action: New project. Status uses stamps, not colored dots.
2. **Project sheet.** Title block first (client, address, contract, revised total), then tabs: Takeoff, Change orders, Activity. The takeoff is the estimator's schedule, editable inline with keyboard-first rows.
3. **Change order builder.** Two columns: scope and line items on the left, live revised contract on the right. Revision cloud hugs the delta. Save draft, send to client, void. Sending is the one authored moment: the row settles, the stamp lands, the revised total re-tallies.
4. **Settings.** Branding (palette with contrast verdicts and preview), team and roles, company details, service area and license. Palette changes preview live on a miniature title block before saving.
5. **Clients.** Simple list and detail; no CRM pipeline.

## States

- Every table: loading skeleton that preserves column rhythm, empty note, error with retry, success.
- Every mutation: inline busy state on the initiating control, optimistic only where reversible; toasts for outcomes, never for trivia.
- Permissions: `field_staff` sees assigned projects and can draft change orders but cannot send or edit money; `client` never enters this shell.
- Destructive actions require a typed or stamped confirmation, not a red button alone.

## Motion

Fast and functional. 140ms state changes, 220ms panel reveals, transform/opacity only. The change-order send is the surface's one authored moment. Reduced motion is instant. No page-load choreography.

## Accessibility

Keyboard-first schedules; visible focus; 44px targets; labels above inputs; errors adjacent and in a live region; totals announced on change; AA contrast against tenant palettes or the palette is rejected.
