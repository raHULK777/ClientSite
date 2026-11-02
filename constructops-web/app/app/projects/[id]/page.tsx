import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectSheet } from "@/components/app/project-sheet";
import { CoreApiError, coreFetch, requireSession } from "@/lib/core";
import { getTenantPayload } from "@/lib/tenant";

import type { AuditEvent, AuditPage, ProjectDetail } from "@/lib/api-types";

export const metadata: Metadata = {
  title: "Project sheet",
  robots: { index: false, follow: false },
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireSession(["admin", "field_staff"]);
  const [{ tenant }, detail] = await Promise.all([
    getTenantPayload(),
    coreFetch<ProjectDetail>(`/protected/projects/${id}`).catch((cause: unknown) => {
      if (cause instanceof CoreApiError && cause.status === 404) notFound();
      throw cause;
    }),
  ]);

  let events: AuditEvent[] = [];
  if (user.role === "admin") {
    try {
      const audit = await coreFetch<AuditPage>("/protected/audit?limit=100");
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
    <ProjectSheet
      detail={detail}
      user={user}
      events={events}
      changeOrdersEnabled={tenant.features.changeOrders}
    />
  );
}
