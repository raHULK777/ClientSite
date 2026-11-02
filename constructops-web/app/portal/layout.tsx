import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PortalHeader } from "@/components/portal/portal-header";
import { tenantThemeStyle } from "@/components/theme/tenant-theme";
import { requireSession } from "@/lib/core";
import { getTenantPayload } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Client portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const [user, { tenant }] = await Promise.all([
    requireSession(["client"]),
    getTenantPayload(),
  ]);

  return (
    <div
      className="flex min-h-dvh flex-col bg-brand-bg text-brand-bg-ink"
      style={tenantThemeStyle(tenant.palette)}
    >
      <PortalHeader companyName={tenant.companyName} user={user} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-line px-4 py-4 text-center text-[11px] text-muted">
        Client portal by ConstructOps
      </footer>
    </div>
  );
}
