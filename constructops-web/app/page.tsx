import type { Metadata } from "next";
import Link from "next/link";

import { EstimateSheet } from "@/components/landing/estimate-sheet";
import { tenantThemeStyle } from "@/components/theme/tenant-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, TitleBlock } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { getTenantPayload } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { tenant } = await getTenantPayload();
  return {
    title: `${tenant.companyName} | Residential remodeling estimates`,
    description: `Kitchen, bath, addition, and structural work priced line by line by ${tenant.companyName}.`,
    icons: tenant.logoUrl ? { icon: tenant.logoUrl } : undefined,
    openGraph: {
      title: tenant.companyName,
      description: "A line-item estimate, drafted before the first call.",
      type: "website",
    },
  };
}

const scopeNotes = [
  {
    code: "A-01",
    scope: "Kitchen",
    included: "Layout, cabinets, counters, lighting, and finish carpentry.",
    allowance: "Appliances and slab stone are selected with a labeled allowance.",
  },
  {
    code: "A-02",
    scope: "Bath",
    included: "Waterproofing, tile, fixtures, ventilation, and trim.",
    allowance: "The fixture package is priced as a named allowance.",
  },
  {
    code: "A-03",
    scope: "Addition",
    included: "Framing, envelope, insulation, and interior finishes.",
    allowance: "Foundation conditions are confirmed after a site walk.",
  },
  {
    code: "A-04",
    scope: "Structural",
    included: "Beam and post repair, connections, and inspection coordination.",
    allowance: "Engineering is scoped separately when the span requires it.",
  },
];

const processSteps = [
  {
    number: "01",
    title: "Walk the scope",
    detail: "We measure the rooms and name the unknowns before anything is priced.",
  },
  {
    number: "02",
    title: "Draft the takeoff",
    detail: "Every line carries a label, so the total is made of visible parts.",
  },
  {
    number: "03",
    title: "Approve changes",
    detail: "A change order is signed, timed, and kept with the project record.",
  },
  {
    number: "04",
    title: "Build the job",
    detail: "The office and the field work from the same approved set.",
  },
];

const jobSet = [
  {
    code: "J-114",
    name: "Elm Street Kitchen",
    phase: "Cabinets",
    progress: 62,
    status: "Active",
  },
  {
    code: "J-118",
    name: "Harbor Bath",
    phase: "Permitting",
    progress: 10,
    status: "Planning",
  },
  {
    code: "J-121",
    name: "Ridge Addition",
    phase: "Framing",
    progress: 35,
    status: "Active",
  },
];

function PlanPlate({ variant }: { variant: "kitchen" | "bath" | "addition" }) {
  return (
    <svg
      viewBox="0 0 240 132"
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <rect x="1" y="1" width="238" height="130" opacity="0.18" strokeDasharray="2 4" />
      {variant === "kitchen" ? (
        <>
          <path d="M24 24h86v24H24zM24 84h58v24H24z" />
          <path d="M110 24h106v84H110z" />
          <path d="M128 40h70v52h-70z" strokeDasharray="4 4" />
          <circle cx="163" cy="66" r="14" />
          <path d="M24 48h86M82 84v24M110 66h106" strokeDasharray="2 3" />
          <path d="M16 18v96M34 18v6M34 108v6" strokeWidth="0.75" />
        </>
      ) : null}
      {variant === "bath" ? (
        <>
          <path d="M24 24h76v44H24zM24 68h44v40H24z" />
          <path d="M100 24h116v84H100z" />
          <circle cx="44" cy="46" r="10" />
          <path d="M24 68h44M68 36v32" />
          <path d="M124 92h68v16h-68z" strokeDasharray="4 4" />
          <path d="M16 18v96M34 18v6M34 108v6" strokeWidth="0.75" />
        </>
      ) : null}
      {variant === "addition" ? (
        <>
          <path d="M24 24h94v84H24z" />
          <path d="M118 24h98v84h-98z" strokeDasharray="4 4" />
          <path d="M118 24v84M142 24v84M166 24v84M190 24v84M118 52h98M118 80h98" strokeWidth="0.75" />
          <path d="M24 52h94M24 80h94" strokeWidth="0.75" />
          <path d="M16 18v96M34 18v6M34 108v6" strokeWidth="0.75" />
        </>
      ) : null}
    </svg>
  );
}

export default async function HomePage() {
  const { tenant, estimator } = await getTenantPayload();
  const showEstimator = tenant.features.estimator && estimator.enabled && estimator.options;

  return (
    <main style={tenantThemeStyle(tenant.palette)} data-tenant-theme="">
      <a
        href="#takeoff"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:border focus:border-ink focus:bg-paper focus:px-4 focus:py-3 focus:text-sm focus:font-semibold"
      >
        Skip to the estimate
      </a>

      <header className="border-b border-ink bg-paper">
        <div className="mx-auto flex min-h-16 max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="type-stencil flex h-9 w-9 items-center justify-center bg-brand-primary text-lg text-brand-ink">
              {tenant.companyName.slice(0, 1)}
            </span>
            <div>
              <p className="type-label text-ink">{tenant.companyName}</p>
              <p className="text-[11px] text-muted">Residential remodeling</p>
            </div>
          </div>

          <nav aria-label="Estimate sheet index" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href="#takeoff" className="type-label inline-flex min-h-11 items-center border-b-2 border-brand-secondary pb-0.5 text-ink">
              Estimate
            </a>
            <a href="#scope" className="type-label inline-flex min-h-11 items-center border-b-2 border-transparent pb-0.5 text-muted hover:text-ink">
              Scope
            </a>
            <a href="#process" className="type-label inline-flex min-h-11 items-center border-b-2 border-transparent pb-0.5 text-muted hover:text-ink">
              Process
            </a>
            <a href="#terms" className="type-label inline-flex min-h-11 items-center border-b-2 border-transparent pb-0.5 text-muted hover:text-ink">
              Terms
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <p className="type-stencil hidden text-[11px] text-muted md:block">Sheet 01 / E-01</p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="drafting-grid border-b border-ink">
        <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10 lg:py-12">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <p className="type-label flex flex-wrap items-center gap-x-3 gap-y-1 text-revision">
                <span>Sheet 01</span>
                <span aria-hidden="true" className="h-px w-8 bg-revision" />
                <span>Residential remodeling</span>
              </p>
              <h1 className="type-display mt-5 max-w-[12ch] text-ink">
                Know the number before the work starts.
              </h1>
              <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-ink-soft sm:text-lg">
                Kitchen, bath, addition, and structural work priced line by line. Allowances are
                named, contingency is visible, and the estimate is yours to keep.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild size="lg">
                  <a href="#takeoff">Price my project</a>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <a href="#scope">What&apos;s included</a>
                </Button>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-ink pt-4 text-xs">
              <div>
                <dt className="type-label text-muted">Estimate basis</dt>
                <dd className="mt-1 text-ink">Measured scope</dd>
              </div>
              <div>
                <dt className="type-label text-muted">Changes</dt>
                <dd className="mt-1 text-ink">Approved in writing</dd>
              </div>
              <div>
                <dt className="type-label text-muted">Allowances</dt>
                <dd className="mt-1 text-ink">Labeled, never hidden</dd>
              </div>
              <div>
                <dt className="type-label text-muted">Records</dt>
                <dd className="mt-1 text-ink">Signer and timestamp</dd>
              </div>
            </dl>
          </div>

          <div id="takeoff" className="scroll-mt-6">
            {showEstimator ? (
              <EstimateSheet
                options={estimator.options!}
                enabled
              />
            ) : (
              <Sheet className="p-6">
                <p className="type-label text-muted">Estimate sheet</p>
                <h2 className="type-heading mt-2">Online estimating is not open right now.</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  The office can price the scope directly. Add contact details in the workspace to
                  open this sheet.
                </p>
              </Sheet>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="type-stencil text-[10px] text-revision">REV 01</span>
              <span>
                Sample workspace. Figures are illustrative and update as you answer.
              </span>
            </p>
          </div>
        </div>
      </section>

      <TitleBlock className="mx-auto max-w-[1400px] !border-t-0 bg-brand-primary text-brand-ink">
        <span className="type-stencil text-xs">{tenant.companyName}</span>
        <span className="text-brand-ink opacity-70">Residential remodeling</span>
        <span className="text-brand-ink opacity-70">Estimates are illustrative</span>
        <span className="text-brand-ink opacity-70">Demo workspace</span>
        <span className="type-stencil ml-auto text-xs">E-01</span>
      </TitleBlock>

      <section id="scope" className="scroll-mt-6 border-b border-ink bg-paper-raised">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
            <div>
              <p className="type-label text-revision">Drawing notes</p>
              <h2 className="type-title mt-3 max-w-[14ch] text-ink">What the estimate covers</h2>
              <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-ink-soft">
                Scope is written in plain language. If a number depends on a selection or a site
                condition, it is called an allowance and kept visible.
              </p>
            </div>

            <div className="border border-ink bg-paper">
              <div className="hidden grid-cols-[72px_100px_minmax(0,1.3fr)_minmax(0,1fr)] border-b-2 border-ink bg-paper-sunk px-3 py-2 sm:grid">
                <span className="type-label text-[10px] text-muted">Note</span>
                <span className="type-label text-[10px] text-muted">Scope</span>
                <span className="type-label text-[10px] text-muted">Included</span>
                <span className="type-label text-[10px] text-muted">Allowance</span>
              </div>
              {scopeNotes.map((note) => (
                <div
                  key={note.code}
                  className="grid gap-2 border-b border-dotted border-line-strong px-3 py-4 last:border-b-0 sm:grid-cols-[72px_100px_minmax(0,1.3fr)_minmax(0,1fr)] sm:gap-0"
                >
                  <span className="type-stencil text-[11px] text-revision">{note.code}</span>
                  <span className="text-sm font-semibold text-ink">{note.scope}</span>
                  <span className="pr-3 text-sm leading-relaxed text-ink-soft">{note.included}</span>
                  <span className="text-sm leading-relaxed text-muted">{note.allowance}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="process" className="scroll-mt-6 border-b border-ink bg-paper">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:py-16">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="type-label text-revision">Dimension line</p>
              <h2 className="type-title mt-3 text-ink">From first measure to approved change</h2>
            </div>
            <p className="max-w-[36ch] text-sm leading-relaxed text-muted">
              No verbal extras. The set carries the scope, the price, and the approval record.
            </p>
          </div>

          <ol className="mt-10 grid gap-x-6 gap-y-8 md:grid-cols-4">
            {processSteps.map((step, index) => (
              <li key={step.number} className="relative border-t border-ink pt-4">
                <span
                  aria-hidden="true"
                  className="absolute -top-1 left-0 h-2 w-px bg-ink"
                />
                <div className="flex items-baseline justify-between gap-3">
                  <span className="type-stencil text-sm text-revision">{step.number}</span>
                  {index < processSteps.length - 1 ? (
                    <span aria-hidden="true" className="hidden h-px flex-1 bg-line-strong md:block" />
                  ) : null}
                </div>
                <h3 className="type-heading mt-3 text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-ink bg-paper-sunk">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:py-16">
          <div>
            <p className="type-label text-revision">Evidence floor</p>
            <h2 className="type-title mt-3 max-w-[15ch] text-ink">
              Approval is a record, not a text message
            </h2>
            <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-ink-soft">
              When scope changes, the client signs the amount and the work. The signed change order
              keeps the signer, time, scope, and consent together with the job.
            </p>
          </div>

          <div className="relative border border-ink bg-paper p-5 shadow-sheet">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Signer", "Name on the approval"],
                ["Timestamp", "Date the record was made"],
                ["Scope", "The exact change and amount"],
                ["Consent", "Explicit approval, not assumed"],
              ].map(([label, detail], index) => (
                <div key={label} className="border border-line-strong bg-paper-raised p-3">
                  <p className="type-label text-[10px] text-muted">
                    {String(index + 1).padStart(2, "0")} / {label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink">{detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-dotted border-line-strong pt-4">
              <p className="max-w-[34ch] text-xs leading-relaxed text-muted">
                A stamped receipt for the office and the client, kept with the project.
              </p>
              <Stamp>Recorded</Stamp>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink bg-paper">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:py-16">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="type-label text-revision">Project index</p>
              <h2 className="type-title mt-3 text-ink">A representative job set</h2>
            </div>
            <p className="max-w-[38ch] text-sm leading-relaxed text-muted">
              Plans and phases from the demo workspace. The drawings below are illustrative, not
              photographs of completed work.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {jobSet.map((job, index) => (
              <article key={job.code} className="border border-ink bg-paper-raised">
                <div className="flex items-center justify-between gap-3 border-b border-ink px-3 py-2">
                  <span className="type-stencil text-[11px] text-revision">{job.code}</span>
                  <Badge variant={job.status === "Active" ? "approved" : "draft"}>{job.status}</Badge>
                </div>
                <div className="h-36 border-b border-ink bg-paper p-3 text-ink/70">
                  <PlanPlate variant={index === 0 ? "kitchen" : index === 1 ? "bath" : "addition"} />
                </div>
                <div className="p-4">
                  <h3 className="type-heading text-ink">{job.name}</h3>
                  <div className="mt-3 flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-muted">{job.phase}</span>
                    <span className="type-data text-ink">{job.progress}%</span>
                  </div>
                  <Progress
                    value={job.progress}
                    aria-label={`${job.name} progress`}
                    className="mt-2 h-1.5"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="terms" className="scroll-mt-6 border-b border-ink bg-paper-raised">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:py-14">
          <div>
            <p className="type-label text-revision">Estimate terms</p>
            <h2 className="type-title mt-3 text-ink">What the number means</h2>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              [
                "Early estimate, not a contract",
                "The draft prices the described scope before a site walk. A signed proposal comes next.",
              ],
              [
                "Contingency is separate",
                "The line is shown in the schedule and included in the total, never folded into a rate.",
              ],
              [
                "Allowances are named",
                "Selections that are not final are listed with the amount reserved for them.",
              ],
              [
                "Site conditions can change scope",
                "Permits, access, and existing construction are confirmed before work is scheduled.",
              ],
            ].map(([term, detail]) => (
              <div key={term} className="border-t border-ink pt-3">
                <dt className="text-sm font-semibold text-ink">{term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer>
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
          <div className="flex flex-col justify-between gap-6 border-t-2 border-ink pt-5 sm:flex-row sm:items-start">
            <div>
              <p className="type-stencil text-sm text-ink">{tenant.companyName}</p>
              <p className="mt-2 max-w-[42ch] text-xs leading-relaxed text-muted">
                Demonstration workspace. Estimates, projects, and approvals shown here are sample
                records.
              </p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
              <a href="#takeoff" className="type-label inline-flex min-h-11 items-center text-muted hover:text-ink">
                Estimate
              </a>
              <a href="#scope" className="type-label inline-flex min-h-11 items-center text-muted hover:text-ink">
                Scope
              </a>
              <a href="#terms" className="type-label inline-flex min-h-11 items-center text-muted hover:text-ink">
                Terms
              </a>
              <Link href="/login" className="type-label inline-flex min-h-11 items-center text-muted hover:text-ink">
                Sign in
              </Link>
              <Link href="/system" className="type-label inline-flex min-h-11 items-center text-muted hover:text-ink">
                System sheet
              </Link>
            </nav>
          </div>
        </div>
        <TitleBlock className="!border-t bg-brand-primary text-brand-ink">
          <span className="type-stencil text-xs">{tenant.companyName}</span>
          <span className="text-brand-ink opacity-70">Sample workspace</span>
          <span className="text-brand-ink opacity-70">Estimates are illustrative</span>
          <span className="type-stencil ml-auto text-xs">2026 / E-01</span>
        </TitleBlock>
      </footer>
    </main>
  );
}
