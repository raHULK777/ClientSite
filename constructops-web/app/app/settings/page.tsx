import type { Metadata } from "next";

import { SettingsForm } from "@/components/app/settings-form";
import { coreFetch, requireSession } from "@/lib/core";
import { formatDateTime } from "@/lib/format";

import type { AdminTenant, AuditEvent, AuditPage } from "@/lib/api-types";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

const ACTION_LABEL: Record<string, string> = {
  "tenant.branding_updated": "Branding updated",
  "tenant.features_updated": "Features updated",
  "tenant.pricing_updated": "Pricing updated",
  "project.created": "Project opened",
  "project.updated": "Project updated",
  "change_order.created": "Change order issued",
  "change_order.updated": "Change order revised",
  "change_order.approved": "Change order approved",
  "change_order.rejected": "Change order declined",
  "auth.login": "Signed in",
};

function actionLabel(action: string): string {
  return (
    ACTION_LABEL[action] ??
    action
      .replace(/[._]/g, " ")
      .replace(/^\w/, (character) => character.toUpperCase())
  );
}

export default async function SettingsPage() {
  await requireSession(["admin"]);
  const [{ tenant }, audit] = await Promise.all([
    coreFetch<{ tenant: AdminTenant }>("/protected/tenant"),
    coreFetch<AuditPage>("/protected/audit?limit=12").catch(
      (): AuditPage => ({ events: [], pagination: { limit: 12, offset: 0, total: 0 } }),
    ),
  ]);

  const events: AuditEvent[] = audit.events;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="type-label text-muted">Workspace record</p>
        <h1 className="type-title mt-1 text-[clamp(2rem,4vw,3.25rem)]">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          The company identity, the public controls, and the record of recent changes. Branding
          must pass contrast before it can be saved.
        </p>
      </header>

      <SettingsForm tenant={tenant} />

      <section aria-labelledby="settings-activity-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-2">
          <div>
            <p className="type-label text-muted">Office record</p>
            <h2 id="settings-activity-heading" className="type-heading mt-1 text-lg">
              Recent activity
            </h2>
          </div>
          <p className="type-label text-[9px] text-muted">
            {audit.pagination.total} {audit.pagination.total === 1 ? "event" : "events"}
          </p>
        </div>

        {events.length ? (
          <ol className="mt-4 max-w-3xl">
            {events.map((event, index) => {
              const title =
                typeof event.metadata.title === "string" ? event.metadata.title : null;
              return (
                <li key={event.id} className="relative flex gap-4 pb-5">
                  <span className="relative flex w-4 shrink-0 justify-center">
                    <span className="mt-1.5 h-2 w-2 border border-ink bg-brand-bg" />
                    {index < events.length - 1 ? (
                      <span className="absolute bottom-0 top-3 w-px bg-line" aria-hidden="true" />
                    ) : null}
                  </span>
                  <div className="min-w-0 pb-1">
                    <p className="type-label text-[9px] text-muted">
                      {formatDateTime(event.createdAt)}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">
                      {actionLabel(event.action)}
                      {title ? <span className="font-normal text-ink-soft"> · {title}</span> : null}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {event.entityType}
                      {event.entityId ? ` · ${event.entityId.slice(0, 8)}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-muted">
            No workspace activity recorded yet.
          </p>
        )}
      </section>
    </div>
  );
}
