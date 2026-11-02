import type { Metadata } from "next";

import { FieldBoard } from "@/components/app/field-board";
import { coreFetch, requireSession } from "@/lib/core";
import { formatDate } from "@/lib/format";

import type { Project } from "@/lib/api-types";

export const metadata: Metadata = { title: "Field copy" };

export default async function FieldPage() {
  const user = await requireSession(["admin", "field_staff"]);
  const { projects } = await coreFetch<{ projects: Project[] }>("/protected/projects");
  const siteWork = projects.filter((project) => project.status !== "completed");
  const active = siteWork.filter((project) => project.status === "active").length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-label text-muted">Field copy</p>
          <h1 className="type-title mt-1 text-[clamp(2rem,4vw,3.25rem)]">Today&rsquo;s site work</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            {active} active {active === 1 ? "job" : "jobs"} on site. Update the phase and progress
            from the job; the office sees it on the project sheet.
          </p>
        </div>
        <p className="type-label border border-line-strong px-2 py-1 text-[9px] text-muted">
          Site copy as of {formatDate(new Date().toISOString())}
        </p>
      </header>

      <FieldBoard projects={siteWork} user={user} />
    </div>
  );
}
