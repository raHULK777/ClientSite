"use client";

import { ChevronDown, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiMutate } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { fullName, initials, jobNumber, ROLE_LABEL } from "@/lib/format";

import type { Project, SessionUser } from "@/lib/api-types";
import type { PublicTenant } from "@/lib/tenant";

type NavItem = {
  href: string;
  label: string;
  roles: SessionUser["role"][];
};

const NAV: NavItem[] = [
  { href: "/app", label: "Project index", roles: ["admin", "field_staff"] },
  { href: "/app/field", label: "Field", roles: ["admin", "field_staff"] },
  { href: "/app/change-orders", label: "Change orders", roles: ["admin", "field_staff"] },
  { href: "/app/clients", label: "Clients", roles: ["admin", "field_staff"] },
  { href: "/app/users", label: "Users", roles: ["admin"] },
  { href: "/app/settings", label: "Settings", roles: ["admin"] },
];

function navigationFor(role: SessionUser["role"]): NavItem[] {
  const items = NAV.filter((item) => item.roles.includes(role));
  if (role !== "field_staff") return items;
  const field = items.find((item) => item.href === "/app/field");
  return field ? [field, ...items.filter((item) => item !== field)] : items;
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveSheet(pathname: string, projects: Project[]) {
  if (pathname === "/app") return { label: "Project index", detail: "All jobs on the board" };

  const projectMatch = /^\/app\/projects\/([^/]+)(\/.*)?$/.exec(pathname);
  if (projectMatch) {
    const id = projectMatch[1] ?? "";
    const tail = projectMatch[2] ?? "";
    const project = projects.find((entry) => entry.id === id);
    const detail = project
      ? `${jobNumber(project.id)} Â· ${project.projectName}`
      : jobNumber(id);
    if (tail.startsWith("/change-orders")) {
      return {
        label: tail.split("/").filter(Boolean).length > 1 ? "Change order record" : "Change order builder",
        detail,
      };
    }
    return { label: "Project sheet", detail };
  }

  if (pathname.startsWith("/app/field")) {
    return { label: "Field copy", detail: "Today's site work" };
  }
  if (pathname.startsWith("/app/change-orders")) {
    return { label: "Change orders", detail: "All jobs" };
  }
  if (pathname.startsWith("/app/clients")) {
    return { label: "Clients", detail: "Workspace directory" };
  }
if (pathname.startsWith("/app/settings")) {
    return { label: "Settings", detail: "Workspace record" };
  }
  if (pathname.startsWith("/app/users")) {
    return { label: "Users", detail: "Workspace accounts" };
  }
  return { label: "Workspace", detail: "Project office" };
}

function Wordmark({ tenant }: { tenant: PublicTenant }) {
  return (
    <Link href="/app" className="flex min-h-11 items-center gap-2.5 pr-8">
      <span
        aria-hidden="true"
        className="type-stencil grid h-9 w-9 shrink-0 place-items-center border border-ink bg-brand-primary text-sm text-brand-ink"
      >
        {initials(tenant.companyName)}
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="type-heading truncate text-base text-ink">{tenant.companyName}</span>
        <span className="type-label mt-1 text-[9px] text-muted">Project office</span>
      </span>
    </Link>
  );
}

function RailContent({
  tenant,
  user,
  projects,
  pathname,
  onNavigate,
}: {
  tenant: PublicTenant;
  user: SessionUser;
  projects: Project[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-ink px-4 py-4">
        <Wordmark tenant={tenant} />
      </div>

      <nav aria-label="Workspace" className="px-2 py-3">
        <ul className="flex flex-col">
          {navigationFor(user.role).map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center border-l-2 px-3 type-label text-[10px]",
                    "transition-colors duration-fast ease-out",
                    active
                      ? "border-brand-primary bg-paper-sunk text-ink"
                      : "border-transparent text-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-h-0 flex-1 border-t border-line px-2 py-3">
        <div className="flex items-center justify-between gap-2 px-3 pb-2">
          <p className="type-label text-[9px] text-muted">Project index</p>
          <span className="type-data text-[10px] text-muted">{projects.length}</span>
        </div>
        {projects.length ? (
          <ul className="flex max-h-[42vh] flex-col overflow-y-auto">
            {projects.map((project) => {
              const href = `/app/projects/${project.id}`;
              const active = pathname.startsWith(href);
              return (
                <li key={project.id}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block min-h-11 border-l-2 px-3 py-2",
                      "transition-colors duration-fast ease-out",
                      active
                        ? "border-brand-secondary bg-brand-surface"
                        : "border-transparent hover:border-line-strong hover:bg-brand-surface/70",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="type-stencil text-[10px] text-muted">
                        {jobNumber(project.id)}
                      </span>
                      <span className="type-label text-[8px] text-muted">
                        {project.status === "active"
                          ? "Active"
                          : project.status === "planning"
                            ? "Planning"
                            : "Complete"}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm leading-snug text-ink">
                      {project.projectName}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">
                      {project.currentPhase}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-3 py-2 text-xs leading-relaxed text-muted">
            No jobs on the board yet. The office can start one from the project index.
          </p>
        )}
      </div>

      <div className="border-t border-ink px-4 py-3">
        <p className="type-label text-[9px] text-muted">{ROLE_LABEL[user.role]} seat</p>
        <p className="mt-1 truncate text-sm text-ink">{fullName(user)}</p>
        <p className="truncate text-[11px] text-muted">{user.email}</p>
      </div>
    </div>
  );
}

function AccountMenu({
  user,
  onSignOut,
  signingOut,
}: {
  user: SessionUser;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 items-center gap-2 border border-transparent px-2 text-brand-ink",
            "transition-colors duration-fast ease-out hover:border-brand-ink/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary",
          )}
        >
          <span className="sr-only">Account menu</span>
          <span className="type-label hidden max-w-[9rem] truncate text-[10px] sm:block">
            {fullName(user)}
          </span>{" "}
          <span className="type-stencil grid h-8 w-8 place-items-center border border-brand-ink/50 text-[10px]">
            {initials(fullName(user))}
          </span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="type-label text-[9px] text-muted">{ROLE_LABEL[user.role]} seat</p>
        <p className="mt-1 type-heading text-base">{fullName(user)}</p>
        <p className="truncate text-xs text-muted">{user.email}</p>
        <div className="mt-3 border-t border-line pt-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            disabled={signingOut}
            className={cn(
              "flex min-h-11 w-full items-center gap-2 px-1 text-left text-sm text-ink",
              "transition-colors duration-fast ease-out hover:text-revision",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
              "disabled:opacity-45",
            )}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {signingOut ? "Signing out" : "Sign out"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function WorkspaceShell({
  tenant,
  user,
  projects,
  children,
}: {
  tenant: PublicTenant;
  user: SessionUser;
  projects: Project[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const sheet = resolveSheet(pathname, projects);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiMutate("/auth/logout", "POST", {});
    } catch {
      // Clear the client anyway; the server cookie expires with the session.
    }
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen bg-brand-bg text-ink">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[120] focus:border focus:border-ink focus:bg-paper-raised focus:px-4 focus:py-3 focus:text-sm"
      >
        Skip to workspace
      </a>

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden h-screen border-r-2 border-ink bg-brand-bg lg:sticky lg:top-0 lg:block">
          <RailContent
            tenant={tenant}
            user={user}
            projects={projects}
            pathname={pathname}
          />
        </aside>

        <div className="flex min-h-screen min-w-0 flex-col">
          <header className="sticky top-0 z-30 border-b border-ink bg-brand-primary text-brand-ink">
            <div className="flex h-16 items-center gap-2 px-3 sm:gap-4 sm:px-5">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center lg:hidden",
                  "transition-colors duration-fast ease-out hover:bg-brand-ink/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary",
                )}
                aria-label="Open workspace menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="type-label text-[9px] text-brand-ink/65">{sheet.label}</p>
                <p className="type-heading truncate text-base leading-tight">{sheet.detail}</p>
              </div>

              <span className="type-label hidden border border-brand-ink/40 px-2 py-1 text-[9px] sm:inline-flex">
                {ROLE_LABEL[user.role]}
              </span>

              <AccountMenu user={user} onSignOut={signOut} signingOut={signingOut} />
            </div>
          </header>

          <main id="workspace-main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>

          <footer className="border-t border-line px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="type-label text-[9px] text-muted">
                {tenant.companyName} Â· Project record
              </p>
              <p className="type-label text-[9px] text-muted">ConstructOps</p>
            </div>
          </footer>
        </div>
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="!left-0 !top-0 !h-dvh !w-[280px] !max-w-[85vw] !translate-x-0 !translate-y-0 overflow-y-auto !border-y-0 !border-l-0 !border-r-2 !p-0">
          <DialogTitle className="sr-only">Workspace menu</DialogTitle>
          <RailContent
            tenant={tenant}
            user={user}
            projects={projects}
            pathname={pathname}
            onNavigate={() => setDrawerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

