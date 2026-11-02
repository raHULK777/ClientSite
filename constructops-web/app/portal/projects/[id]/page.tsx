import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PortalProjectDetail } from "@/components/portal/portal-project-detail";
import { coreFetch, requireSession } from "@/lib/core";
import { CoreApiError } from "@/lib/core";
import { getTenantPayload } from "@/lib/tenant";

import type { AuditEvent, ProjectDetail } from "@/lib/api-types";

export const metadata: Metadata = {
  title: "Project details",
  robots: { index: false, follow: false },
};

export default async function PortalProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSession(["client"]);
  const [{ tenant }, detail] = await Promise.all([
    getTenantPayload(),
    coreFetch<ProjectDetail>(`/protected/projects/${id}`).catch((cause: unknown) => {
      if (cause instanceof CoreApiError && cause.status === 404) notFound();
      throw cause;
    }),
  ]);

  let events: AuditEvent[] = [];
  if (tenant.features.projectChat) {
    try {
      const audit = await coreFetch<{ events: AuditEvent[] }>(`/protected/audit?limit=100`);
      events = audit.events.filter(
        (event) =>
          event.entityId === id ||
          event.metadata.projectId === id ||
          event.metadata.project_id === id,
      );
    } catch {
      events = [];
    }
  }

  return (
    <PortalProjectDetail
      detail={detail}
      user={user}
      events={events}
      projectChatEnabled={tenant.features.projectChat}
    />
  );
}