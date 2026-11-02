import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { tenantThemeStyle } from "@/components/theme/tenant-theme";
import { getSession, homeForRole } from "@/lib/core";
import { getTenantPayload } from "@/lib/tenant";
import { initials } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSession();
  if (user) redirect(homeForRole(user.role));

  const { next } = await searchParams;
  const { tenant } = await getTenantPayload();

  return (
    <div
      style={tenantThemeStyle(tenant.palette)}
      className="drafting-grid flex min-h-screen flex-col bg-brand-bg text-ink"
    >
      <header className="border-b border-ink bg-brand-surface">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-h-11 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="type-stencil grid h-9 w-9 place-items-center border border-ink bg-brand-primary text-sm text-brand-ink"
            >
              {initials(tenant.companyName)}
            </span>
            <span className="flex min-w-0 flex-col leading-none">
              <span className="type-heading truncate text-base">{tenant.companyName}</span>
              <span className="type-label mt-1 text-[9px] text-muted">Project office</span>
            </span>
          </Link>
          <Link href="/" className="type-label flex min-h-11 items-center text-[10px] text-muted hover:text-ink">
            Public site
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-14">
        <section className="hidden border border-ink bg-brand-primary text-brand-ink lg:block">
          <div className="flex min-h-[32rem] flex-col justify-between p-8">
            <div className="flex items-center justify-between gap-4">
              <p className="type-label text-[10px] opacity-75">Access sheet 01</p>
              <p className="type-stencil text-sm tracking-[0.2em] opacity-75">CO/A-01</p>
            </div>

            <div className="py-10">
              <p className="type-display text-[clamp(3rem,6vw,5rem)]">
                The job set,
                <br />
                opened.
              </p>
              <p className="mt-5 max-w-sm text-sm leading-relaxed opacity-80">
                One record for the office, the field, and the client. Changes are written down,
                priced, and signed in the same place.
              </p>
            </div>

            <div className="border-t border-brand-ink/30 pt-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="type-label text-[9px] opacity-75">Issued for</span>
                <span className="type-label text-[9px]">Construction</span>
                <span className="type-label ml-auto text-[9px] opacity-75">
                  {tenant.subdomain}.constructops
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="border border-ink bg-paper-raised shadow-sheet">
          <div className="flex items-center justify-between gap-4 border-b border-ink px-6 py-3 sm:px-8">
            <p className="type-label text-[10px] text-muted">
              {tenant.companyName} · Project record
            </p>
            <span className="type-label border border-line-strong px-2 py-1 text-[9px] text-muted">
              Secure access
            </span>
          </div>
          <LoginForm
            next={next}
            showDemo={process.env.NODE_ENV !== "production"}
          />
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-6">
          <p className="type-label text-[9px] text-muted">{tenant.companyName}</p>
          <p className="type-label text-[9px] text-muted">Operations record · ConstructOps</p>
        </div>
      </footer>
    </div>
  );
}
