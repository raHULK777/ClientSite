import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChangeOrderForm } from "@/components/app/change-order-form";
import { CoreApiError, coreFetch, requireSession } from "@/lib/core";
import { getTenantPayload } from "@/lib/tenant";

import type { ProjectDetail } from "@/lib/api-types";

export const metadata: Metadata = {
  title: "New change order",
  robots: { index: false, follow: false },
};

export default async function NewChangeOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSession(["admin"]);
  const [{ tenant }, detail] = await Promise.all([
    getTenantPayload(),
    coreFetch<ProjectDetail>(`/protected/projects/${id}`).catch((cause: unknown) => {
      if (cause instanceof CoreApiError && cause.status === 404) notFound();
      throw cause;
    }),
  ]);

  const approvedValue = detail.changeOrders
    .filter((order) => order.status === "approved")
    .reduce((total, order) => total + order.costImpact, 0);

  return (
    <ChangeOrderForm
      mode="create"
      project={detail.project}
      approvedValue={approvedValue}
      changeOrdersEnabled={tenant.features.changeOrders}
    />
  );
}
