import type { Metadata } from "next";

import {
  contrastRatio,
  evaluatePalette,
  pickForeground,
} from "@constructops/shared";

import { BrandShell } from "@/components/shell/brand-shell";
import { InteractiveDemo } from "@/components/system/interactive-demo";
import { TenantTheme } from "@/components/theme/tenant-theme";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/ui/data-card";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Schedule,
  ScheduleAmount,
  ScheduleBody,
  ScheduleCell,
  ScheduleHead,
  ScheduleHeaderCell,
  ScheduleRow,
  ScheduleTable,
} from "@/components/ui/schedule";
import {
  Sheet,
  SheetBar,
  SheetIndex,
  TitleBlock,
} from "@/components/ui/sheet";
import { RevisionCloud, Stamp } from "@/components/ui/stamp";

export const metadata: Metadata = {
  title: "System sheet",
  robots: { index: false, follow: false },
};

const demoPalette = {
  primary: "#0B1220",
  secondary: "#C2410C",
  background: "#F6F3ED",
  surface: "#FFFFFF",
};

const swatches = [
  { name: "Paper", value: "#F8F9F9", role: "Page ground" },
  { name: "Ink", value: "#15202B", role: "Rules, type" },
  { name: "Muted", value: "#5C6A76", role: "Secondary type" },
  { name: "Line", value: "#C9D0D5", role: "Hairlines" },
  { name: "Revision", value: "#B3261E", role: "Change marks" },
  { name: "Brand primary", value: "#0B1220", role: "Title block, action" },
  { name: "Brand secondary", value: "#C2410C", role: "Revision marks" },
  { name: "Brand background", value: "#F6F3ED", role: "Tenant surface" },
  { name: "Brand surface", value: "#FFFFFF", role: "Tenant raised" },
];

const takeoffRows = [
  { item: "Demo and protection", qty: "1", rate: "2,400", total: "2,400" },
  { item: "Cabinetry", qty: "18 lf", rate: "436", total: "7,850" },
  { item: "Quartz counter", qty: "42 sf", rate: "74", total: "3,120" },
  { item: "Backsplash", qty: "18 sf", rate: "54", total: "980" },
  { item: "Electrical allowance", qty: "1", rate: "1,900", total: "1,900" },
];

const paletteResult = evaluatePalette(demoPalette);

function SectionHead({ n, title, sheet }: { n: string; title: string; sheet: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-2">
      <h2 className="type-heading">
        <span className="text-muted">{n}</span> · {title}
      </h2>
      <span className="type-label text-[10px] text-muted">{sheet}</span>
    </div>
  );
}

export default function SystemPage() {
  return (
    <TenantTheme palette={demoPalette} className="min-h-screen bg-paper">
      <main>
      <div className="drafting-grid">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          <header className="border-b-2 border-ink pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="type-label text-revision">System sheet · 00</p>
              <p className="type-label text-[10px] text-muted">
                Rev. 01 · {new Date().toISOString().slice(0, 10)}
              </p>
            </div>
            <h1 className="type-display mt-4 text-[clamp(2.4rem,7vw,5rem)]">
              The job set
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
              Tokens, type, controls, and schedule parts for the ConstructOps surfaces. Paper is
              fixed; tenant color enters as the title-block field, primary action, and revision
              mark. Every control meets the 44px target and keeps a visible focus ring.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="brand">Direction locked</Badge>
              <Badge variant="approved">WCAG 2.2 AA floor</Badge>
              <Badge variant="draft">Seed: none</Badge>
            </div>
          </header>

          <section className="mt-14">
            <SectionHead n="01" title="Type" sheet="A-101" />
            <Sheet className="mt-5">
              <SheetBar>
                <span className="font-semibold text-ink">Santos Construction</span>
                <span>A-101</span>
                <SheetIndex
                  className="ml-auto"
                  items={["Scope", "Takeoff", "Terms"]}
                  active="Scope"
                />
              </SheetBar>
              <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="type-label text-revision">Residential · Rev. 04</p>
                  <p className="type-display mt-2 text-[clamp(2.2rem,5vw,4rem)]">
                    Additions &amp; remodels
                  </p>
                  <p className="type-title mt-6 text-2xl">Takeoff sheet</p>
                  <p className="type-heading mt-4">Room-by-room scope</p>
                  <p className="type-body mt-3 max-w-prose text-ink-soft">
                    Archivo carries the page at three widths: expanded for the title, normal for
                    reading, and slightly wide for labels. Numbers are always tabular so two
                    columns can be compared without the decimal drifting.
                  </p>
                  <p className="type-label mt-6 text-muted">Allowances are labeled</p>
                </div>
                <div className="border-l border-ink pl-6">
                  <p className="type-label text-muted">Stencil · sheet numbers only</p>
                  <p className="type-stencil mt-2 text-3xl text-ink">2026-014</p>
                  <p className="type-label mt-6 text-muted">Data</p>
                  <p className="type-data mt-2 text-2xl font-semibold">$28,400.00</p>
                  <p className="mt-1 text-xs text-muted">Range $28–34k · 5 line items</p>
                  <div className="mt-8">
                    <Stamp>Ready to review</Stamp>
                  </div>
                </div>
              </div>
              <TitleBlock>
                <span className="font-semibold">Santos Construction</span>
                <span>Lic. 884-201</span>
                <span>East Bay, CA</span>
                <span className="ml-auto">510 · 555 · 0142</span>
              </TitleBlock>
            </Sheet>
          </section>

          <section className="mt-14">
            <SectionHead n="02" title="Palette and contrast" sheet="A-102" />
            <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {swatches.map((swatch) => {
                  const fg = pickForeground(swatch.value);
                  const ratio = contrastRatio(fg, swatch.value);
                  return (
                    <div key={swatch.name} className="border border-line bg-paper-raised">
                      <div
                        className="flex h-16 items-end justify-end p-2"
                        style={{ background: swatch.value, color: fg }}
                      >
                        <span className="type-data text-[10px] font-semibold">
                          {ratio.toFixed(1)}:1
                        </span>
                      </div>
                      <div className="border-t border-line px-2.5 py-2">
                        <p className="text-xs font-semibold text-ink">{swatch.name}</p>
                        <p className="type-data text-[10px] text-muted">{swatch.value}</p>
                        <p className="mt-1 text-[10px] leading-tight text-muted">{swatch.role}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="type-label text-muted">Demo tenant checks</p>
                  <Badge variant={paletteResult.ok ? "approved" : "rejected"}>
                    {paletteResult.ok ? "Pass" : "Fail"}
                  </Badge>
                </div>
                <Schedule>
                  <ScheduleTable>
                    <ScheduleHead>
                      <tr>
                        <ScheduleHeaderCell>Check</ScheduleHeaderCell>
                        <ScheduleHeaderCell className="text-right">Ratio</ScheduleHeaderCell>
                        <ScheduleHeaderCell className="text-right">Floor</ScheduleHeaderCell>
                        <ScheduleHeaderCell className="text-right">Result</ScheduleHeaderCell>
                      </tr>
                    </ScheduleHead>
                    <ScheduleBody>
                      {paletteResult.checks.map((check) => (
                        <ScheduleRow key={check.name}>
                          <ScheduleCell className="text-xs">{check.name}</ScheduleCell>
                          <ScheduleAmount className="text-xs">{check.ratio}</ScheduleAmount>
                          <ScheduleAmount className="text-xs text-muted">
                            {check.required}
                          </ScheduleAmount>
                          <ScheduleCell className="text-right">
                            <span
                              className={
                                check.pass
                                  ? "type-label text-[10px] text-ink"
                                  : "type-label text-[10px] text-revision"
                              }
                            >
                              {check.pass ? "Pass" : "Fail"}
                            </span>
                          </ScheduleCell>
                        </ScheduleRow>
                      ))}
                    </ScheduleBody>
                  </ScheduleTable>
                </Schedule>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  A tenant combination that fails is rejected in admin with the failing pair and
                  ratio, not rendered as unreadable text. Foreground on the title block and the
                  primary action is chosen by contrast, not assumed.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-14">
            <SectionHead n="03" title="Actions and status" sheet="A-103" />
            <div className="mt-5 grid gap-8 lg:grid-cols-2">
              <div>
                <p className="type-label mb-3 text-muted">Buttons · min 44px</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button>Price my project</Button>
                  <Button variant="secondary">Review takeoff</Button>
                  <Button variant="ghost">Terms</Button>
                  <Button variant="revision">Approve change</Button>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button size="sm">Small · 44</Button>
                  <Button size="md">Medium · 48</Button>
                  <Button size="lg">Large · 56</Button>
                  <Button loading>Pricing</Button>
                  <Button disabled>Disabled</Button>
                </div>
                <p className="mt-3 text-xs text-muted">
                  Press feedback is a 0.97 scale; keyboard activation does not animate the press.
                </p>
              </div>
              <div>
                <p className="type-label mb-3 text-muted">Status · never color alone</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="draft">Draft</Badge>
                  <Badge variant="pending">Pending signature</Badge>
                  <Badge variant="approved">Approved</Badge>
                  <Badge variant="rejected">Rejected</Badge>
                </div>
                <div className="mt-6 flex items-center gap-6">
                  <Stamp>Approved</Stamp>
                  <div className="relative inline-block">
                    <span className="type-data text-xl font-semibold">$28–34k</span>
                    <RevisionCloud className="absolute -inset-x-6 -inset-y-4 h-[calc(100%+2rem)] w-[calc(100%+3rem)]" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-14">
            <SectionHead n="04" title="Fields" sheet="A-104" />
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Field id="field-normal" label="Project address">
                <Input id="field-normal" placeholder="1420 Cypress St" />
              </Field>
              <Field
                id="field-hint"
                label="Square footage"
                hint="Interior conditioned area, rounded to the nearest 10."
              >
                <Input
                  id="field-hint"
                  inputMode="numeric"
                  placeholder="1,240"
                  aria-describedby={fieldDescribedBy("field-hint", {
                    hint: "Interior conditioned area, rounded to the nearest 10.",
                  })}
                />
              </Field>
              <Field
                id="field-error"
                label="Client email"
                error="Enter a complete address, like name@example.com."
              >
                <Input
                  id="field-error"
                  type="email"
                  defaultValue="dana@"
                  aria-invalid="true"
                  aria-describedby={fieldDescribedBy("field-error", {
                    error: "Enter a complete address, like name@example.com.",
                  })}
                />
              </Field>
            </div>
          </section>

          <section className="mt-14">
            <SectionHead n="05" title="Takeoff schedule" sheet="A-105" />
            <div className="mt-5 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <Schedule>
                <ScheduleTable>
                  <ScheduleHead>
                    <tr>
                      <ScheduleHeaderCell>Item</ScheduleHeaderCell>
                      <ScheduleHeaderCell className="text-right">Qty</ScheduleHeaderCell>
                      <ScheduleHeaderCell className="text-right">Rate</ScheduleHeaderCell>
                      <ScheduleHeaderCell className="text-right">Total</ScheduleHeaderCell>
                    </tr>
                  </ScheduleHead>
                  <ScheduleBody>
                    {takeoffRows.map((row) => (
                      <ScheduleRow key={row.item}>
                        <ScheduleCell>{row.item}</ScheduleCell>
                        <ScheduleAmount className="text-ink-soft">{row.qty}</ScheduleAmount>
                        <ScheduleAmount className="text-ink-soft">{row.rate}</ScheduleAmount>
                        <ScheduleAmount>{row.total}</ScheduleAmount>
                      </ScheduleRow>
                    ))}
                    <ScheduleRow className="border-t-2 border-ink border-dotted">
                      <ScheduleCell className="font-semibold text-ink" colSpan={3}>
                        Estimated range · allowances included
                      </ScheduleCell>
                      <ScheduleAmount className="text-base font-semibold">
                        $28–34k
                      </ScheduleAmount>
                    </ScheduleRow>
                  </ScheduleBody>
                </ScheduleTable>
              </Schedule>
              <div className="flex flex-col justify-between border border-ink bg-paper-raised p-5">
                <div>
                  <p className="type-label text-muted">Margin notes</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    Demo, cabinets, counters, and backsplash are fixed. Electrical is an
                    allowance until the island layout is confirmed on site.
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <Badge variant="pending">Allowance flagged</Badge>
                  <Stamp className="text-[9px]">Rev. 04</Stamp>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-14">
            <SectionHead n="06" title="Interactive parts" sheet="A-106" />
            <div className="mt-6">
              <InteractiveDemo />
            </div>
          </section>

          <section className="mt-14">
            <SectionHead n="07" title="Workspace shell and data" sheet="A-107" />
            <div className="mt-5 overflow-hidden border border-ink">
              <BrandShell
                layout="topbar"
                className="min-h-0"
                tenant={{ name: "Santos Construction", license: "Lic. 884-201" }}
                role="Admin"
                nav={[
                  { href: "#", label: "Projects", active: true },
                  { href: "#", label: "Change orders" },
                  { href: "#", label: "Clients" },
                  { href: "#", label: "Settings" },
                ]}
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <DataCard
                    label="Active projects"
                    value="4"
                    detail="2 in rough-in, 1 finish, 1 closeout"
                    footer="Updated 8 min ago"
                  />
                  <DataCard
                    label="Approved changes"
                    value="$11,860"
                    badge={<Badge variant="approved">Current</Badge>}
                    detail="Across 3 projects this month"
                    footer="Signed by client, immutable"
                  />
                  <DataCard
                    label="Awaiting signature"
                    value="2"
                    badge={<Badge variant="pending">Action</Badge>}
                    detail="$6,240 held until approved"
                    footer="Oldest waiting 2 days"
                  />
                </div>
                <div className="mt-4 grid gap-4 border border-line bg-paper-raised p-4 sm:grid-cols-2">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <p className="type-label text-muted">Rough-in</p>
                      <span className="type-data text-xs text-ink">68%</span>
                    </div>
                    <Progress value={68} aria-label="Rough-in progress" className="mt-3" />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <p className="type-label text-muted">Finish</p>
                      <span className="type-data text-xs text-ink">24%</span>
                    </div>
                    <Progress value={24} aria-label="Finish progress" className="mt-3" />
                  </div>
                </div>
              </BrandShell>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Topbar and sidebar variants read from the same tenant token set. The shell never
              invents a second brand color; chrome, active nav, and progress all resolve to the
              tenant&rsquo;s primary.
            </p>
          </section>

          <section className="mt-14">
            <SectionHead n="08" title="Motion" sheet="A-108" />
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="border border-line bg-paper-raised p-4">
                <p className="type-label text-muted">Easing</p>
                <p className="type-data mt-1 text-sm">cubic-bezier(.23, 1, .32, 1)</p>
              </div>
              <div className="border border-line bg-paper-raised p-4">
                <p className="type-label text-muted">Durations</p>
                <p className="type-data mt-1 text-sm">120 / 200 / 320 ms</p>
              </div>
              <div className="border border-line bg-paper-raised p-4">
                <p className="type-label text-muted">Reduced motion</p>
                <p className="mt-1 text-sm text-ink-soft">Every step becomes an instant state change.</p>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted">
              One authored moment per surface: the estimate drafts itself. Everything else is
              quiet. Transform and opacity only; no layout animation; keyboard changes are
              instant.
            </p>
          </section>

          <footer className="mt-16 flex flex-wrap justify-between gap-3 border-t border-ink pt-4">
            <span className="type-label text-[10px] text-muted">
              ConstructOps · system sheet 00
            </span>
            <span className="type-label text-[10px] text-muted">
              Direction: The Job Set · picked 2026-10-30
            </span>
          </footer>
        </div>
      </div>
      </main>
    </TenantTheme>
  );
}
