import type { Metadata } from "next";
import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/app/workspace-shell";
import { tenantThemeStyle } from "@/components/theme/tenant-theme";
import { coreFetch, requireSession } from "@/lib/core";
import { getTenantPayload } from "@/lib/tenant";

import type { Project } from "@/lib/api-types";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await requireSession(["admin", "field_staff"]);
  const [{ tenant }, data] = await Promise.all([
    getTenantPayload(),
    coreFetch<{ projects: Project[] }>("/protected/projects"),
  ]);

  return (
    <div style={tenantThemeStyle(tenant.palette)}>
      <WorkspaceShell tenant={tenant} user={user} projects={data.projects}>
        {children}
      </WorkspaceShell>
    </div>
  );
}
