import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ShellNavItem = {
  href: string;
  label: string;
  active?: boolean;
};

export type ShellTenant = {
  name: string;
  license?: string;
  layout?: "sidebar" | "topbar";
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Wordmark({ tenant, compact = false }: { tenant: ShellTenant; compact?: boolean }) {
  return (
    <a href="/" className="flex min-h-11 items-center gap-2.5">
      <span
        aria-hidden="true"
        className="type-stencil grid h-9 w-9 shrink-0 place-items-center border border-current text-sm"
      >
        {initials(tenant.name)}
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className={cn("type-heading truncate text-current", compact ? "text-sm" : "text-base")}>
          {tenant.name}
        </span>
        <span className="type-label mt-1 text-[9px] opacity-80">
          {tenant.license ?? "Licensed contractor"}
        </span>
      </span>
    </a>
  );
}

function NavList({
  items,
  orientation,
  label,
}: {
  items: ShellNavItem[];
  orientation: "horizontal" | "vertical";
  label: string;
}) {
  return (
    <nav aria-label={label} className={cn(orientation === "horizontal" && "w-full")}>
      <ul
        className={cn(
          orientation === "horizontal"
            ? "flex gap-1 overflow-x-auto"
            : "flex flex-col gap-1",
        )}
      >
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "type-label flex min-h-11 items-center text-[10px]",
                orientation === "horizontal"
                  ? "border-b-2 px-3"
                  : "border-l-2 px-3",
                item.active
                  ? "border-current text-current"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function RoleChip({ role }: { role: string }) {
  return (
    <span className="type-label whitespace-nowrap border border-current px-2 py-1 text-[9px]">
      {role}
    </span>
  );
}

export function BrandShell({
  tenant,
  nav,
  role,
  actions,
  children,
  layout = tenant.layout ?? "sidebar",
  className,
}: {
  tenant: ShellTenant;
  nav: ShellNavItem[];
  role: string;
  actions?: ReactNode;
  children: ReactNode;
  layout?: "sidebar" | "topbar";
  className?: string;
}) {
  if (layout === "topbar") {
    return (
      <div className={cn("min-h-screen bg-brand-bg text-ink", className)}>
        <header className="border-b-2 border-ink bg-brand-primary text-brand-ink">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
            <Wordmark tenant={tenant} compact />
            <div className="order-last w-full sm:order-none sm:ml-4 sm:w-auto">
              <NavList items={nav} orientation="horizontal" label="Primary" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              {actions}
              <RoleChip role={role} />
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-brand-bg text-ink", className)}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b-2 border-ink bg-brand-primary px-4 py-2 text-brand-ink lg:hidden">
        <Wordmark tenant={tenant} compact />
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <RoleChip role={role} />
        </div>
        <div className="order-last w-full">
          <NavList items={nav} orientation="horizontal" label="Primary" />
        </div>
      </header>
      <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen flex-col border-r-2 border-ink bg-brand-primary text-brand-ink lg:flex">
          <div className="border-b border-white/15 px-4 py-4">
            <Wordmark tenant={tenant} />
          </div>
          <div className="flex-1 px-2 py-4">
            <NavList items={nav} orientation="vertical" label="Primary" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-white/15 px-4 py-4">
            <RoleChip role={role} />
            {actions}
          </div>
        </aside>
        <div className="min-w-0">
          <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
