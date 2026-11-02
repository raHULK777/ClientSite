import type { Metadata } from "next";

import { ProjectForm } from "@/components/app/project-form";
import { coreFetch, requireSession } from "@/lib/core";
import { getTenantPayload } from "@/lib/tenant";

import type { ClientAccount } from "@/lib/api-types";

export const metadata: Metadata = {
  title: "New job",
  robots: { index: false, follow: false },
};

export default async function NewProjectPage() {
  const user = await requireSession(["admin"]);
  const [{ tenant: _tenant }, clientsData] = await Promise.all([
    getTenantPayload(),
    coreFetch<{ clients: ClientAccount[] }>("/protected/clients"),
  ]);

  return (
    <ProjectForm
      mode="create"
      clients={clientsData.clients}
      currentUserId={user.id}
      changeOrdersEnabled={_tenant.features.changeOrders}
    />
  );
}