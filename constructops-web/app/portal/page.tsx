import type { Metadata } from "next";

import { PortalProject } from "@/components/portal/portal-project";
import { coreFetch, requireSession } from "@/lib/core";
import { fullName } from "@/lib/format";
import { rollupProjects } from "@/lib/rollups";
import { getTenantPayload } from "@/lib/tenant";

import type { ChangeOrder, Project } from "@/lib/api-types";

export const metadata: Metadata = {
  title: "Your projects",
  robots: { index: false, follow: false },
};

export default async function PortalPage() {
  const user = await requireSession(["client"]);
  const [{ tenant }, projectsData, ordersData] = await Promise.all([
    getTenantPayload(),
    coreFetch<{ projects: Project[] }>("/protected/projects"),
    coreFetch<{ changeOrders: ChangeOrder[] }>("/protected/change-orders"),
  ]);

  const projects = rollupProjects(projectsData.projects, ordersData.changeOrders);
  const projectWord = projects.length === 1 ? "project" : "projects";

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b-2 border-ink pb-4">
        <p className="type-label text-muted">Client portal</p>
        <h1 className="type-title mt-1 text-[clamp(2rem,6vw,3.5rem)] leading-none">
          Your {projectWord}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Prepared for {fullName(user)} by {tenant.companyName}. Questions about the work?
          Contact the office directly.
        </p>
      </header>

      {!tenant.features.clientPortal ? (
        <div className="border-2 border-revision bg-paper-raised p-4">
          <p className="type-label text-[9px] text-revision">Portal paused</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            The client portal is not available right now. Contact the office for an update on your
            project.
          </p>
        </div>
      ) : projects.length ? (
        <>
          {projects.length > 1 ? (
            <nav aria-label="Your projects" className="border border-line bg-paper-raised p-4">
              <p className="type-label text-[9px] text-muted">On this page</p>
              <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                {projects.map((project) => (
                  <li key={project.id}>
                    <a
                      href={`#project-${project.id}`}
                      className="text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-fast ease-out hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised"
                    >
                      {project.projectName}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div className="flex flex-col gap-14">
            {projects.map((project) => (
              <PortalProject
                key={project.id}
                project={project}
                orders={ordersData.changeOrders.filter(
                  (order) => order.projectId === project.id,
                )}
                companyName={tenant.companyName}
                changeOrdersEnabled={tenant.features.changeOrders}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="border border-line bg-paper-raised p-4">
          <p className="text-sm leading-relaxed text-ink-soft">
            No projects are linked to this account yet. Contact the office if you expected to see
            a project here.
          </p>
        </div>
      )}
    </div>
  );
}
