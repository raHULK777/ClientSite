"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RevisionCloud, Stamp } from "@/components/ui/stamp";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import type { EstimatorOptions } from "@/lib/tenant";

type EstimateLineItem = {
  key: string;
  label: string;
  amountCents: number;
};

type EstimateResult = {
  currency: string;
  lineItems: EstimateLineItem[];
  subtotalCents: number;
  contingencyCents: number;
  totalCents: number;
  range: { lowCents: number; highCents: number };
  assumptions: string[];
};

type EstimateSheetProps = {
  options: EstimatorOptions;
  enabled: boolean;
};

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

function money(cents: number, currency: string): string {
  return currencyFormatter(currency).format(cents / 100);
}

export function EstimateSheet({ options, enabled }: EstimateSheetProps) {
  const firstType = options.projectTypes[0];
  const [projectType, setProjectType] = useState(firstType?.key ?? "");
  const [squareFeet, setSquareFeet] = useState(String(firstType?.minSquareFeet ?? 40));
  const [materialTier, setMaterialTier] = useState(options.materialTiers[0]?.key ?? "");
  const [complexity, setComplexity] = useState(
    options.complexity.find((item) => item.key === "standard")?.key ?? options.complexity[0]?.key ?? "",
  );
  const [addons, setAddons] = useState<string[]>([]);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftVersion, setDraftVersion] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const activeType = useMemo(
    () => options.projectTypes.find((item) => item.key === projectType) ?? firstType,
    [firstType, options.projectTypes, projectType],
  );

  const parsedFeet = Number(squareFeet);
  const rangeError =
    activeType && Number.isFinite(parsedFeet)
      ? parsedFeet < activeType.minSquareFeet || parsedFeet > activeType.maxSquareFeet
        ? `${activeType.label} is priced between ${activeType.minSquareFeet} and ${activeType.maxSquareFeet} square feet.`
        : null
      : "Enter the project area in square feet.";

  useEffect(() => {
    if (!enabled || !projectType || !materialTier || rangeError) {
      setDrafting(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDrafting(true);
      setError(null);

      try {
        const response = await fetch("/api/core/public/estimate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            projectType,
            squareFeet: parsedFeet,
            materialTier,
            complexity,
            addons,
          }),
          signal: controller.signal,
        });
        const body = (await response.json()) as {
          success?: boolean;
          data?: EstimateResult;
          error?: string;
        };
        if (!response.ok || !body.success || !body.data) {
          throw new Error(body.error ?? "The estimate could not be drafted.");
        }
        setResult(body.data);
        setDraftVersion((version) => version + 1);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : "The estimate could not be drafted.");
      } finally {
        if (!controller.signal.aborted) setDrafting(false);
      }
    }, attempt === 0 ? 0 : 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [addons, attempt, complexity, enabled, materialTier, parsedFeet, projectType, rangeError]);

  function chooseType(nextKey: string) {
    const nextType = options.projectTypes.find((item) => item.key === nextKey);
    setProjectType(nextKey);
    if (nextType) {
      setSquareFeet(String(Math.min(Math.max(parsedFeet || nextType.minSquareFeet, nextType.minSquareFeet), nextType.maxSquareFeet)));
    }
  }

  function toggleAddon(key: string, checked: boolean) {
    setAddons((current) => (checked ? [...new Set([...current, key])] : current.filter((item) => item !== key)));
  }

  const totalLabel = result ? money(result.totalCents, result.currency) : "Waiting for dimensions";
  const rangeLabel = result
    ? `${money(result.range.lowCents, result.currency)} to ${money(result.range.highCents, result.currency)}`
    : "The range appears after the first answer.";

  if (!enabled || options.projectTypes.length === 0) {
    return (
      <Sheet className="p-6">
        <p className="type-label text-muted">Estimate sheet</p>
        <h2 className="type-heading mt-2">Online estimating is not open right now.</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Call the office and we will price the scope with you.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet className="relative overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-ink bg-paper-sunk px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="type-label text-muted">Live takeoff</span>
          <span className="type-stencil text-[11px] text-revision">E-01</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="type-data text-[11px] text-ink lg:hidden">
            {result ? totalLabel : "Draft"}
          </span>
          <span className="type-label text-[10px] text-muted">{drafting ? "Drafting" : "Draft"}</span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form
          className="flex flex-col gap-5 border-b border-ink p-4 lg:border-b-0 lg:border-r lg:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            setAttempt((value) => value + 1);
          }}
          aria-describedby="takeoff-note"
        >
          <fieldset>
            <legend className="type-label mb-2 text-ink">Project type</legend>
            <div className="grid grid-cols-2 gap-2">
              {options.projectTypes.map((item) => {
                const selected = item.key === projectType;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => chooseType(item.key)}
                    className={cn(
                      "min-h-11 border px-3 py-2 text-left text-sm font-semibold leading-tight",
                      "transition-[transform,background-color,border-color,color] duration-fast ease-out active:scale-[0.97]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised",
                      selected
                        ? "border-brand-primary bg-brand-primary text-brand-ink"
                        : "border-line-strong bg-paper-raised text-ink hover:border-ink",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Field
            id="square-feet"
            label="Project area"
            hint={
              activeType
                ? `Square feet, ${activeType.minSquareFeet} to ${activeType.maxSquareFeet}.`
                : "Enter the area in square feet."
            }
            error={rangeError ?? undefined}
          >
            <div className="relative">
              <Input
                id="square-feet"
                inputMode="numeric"
                min={activeType?.minSquareFeet}
                max={activeType?.maxSquareFeet}
                value={squareFeet}
                onChange={(event) => setSquareFeet(event.target.value)}
                aria-invalid={Boolean(rangeError)}
                aria-describedby="square-feet-hint square-feet-error"
                className="pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                sq ft
              </span>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="material-tier" label="Finish level">
              <select
                id="material-tier"
                value={materialTier}
                onChange={(event) => setMaterialTier(event.target.value)}
                className="h-11 w-full border border-ink bg-paper-raised px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised"
              >
                {options.materialTiers.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="complexity" label="Site complexity">
              <select
                id="complexity"
                value={complexity}
                onChange={(event) => setComplexity(event.target.value)}
                className="h-11 w-full border border-ink bg-paper-raised px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-raised"
              >
                {options.complexity.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <fieldset>
            <legend className="type-label mb-1 text-ink">Add to the scope</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {options.addons.map((item) => (
                <label
                  key={item.key}
                  htmlFor={`addon-${item.key}`}
                  className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-soft"
                >
                  <Checkbox
                    id={`addon-${item.key}`}
                    checked={addons.includes(item.key)}
                    onCheckedChange={(value) => toggleAddon(item.key, value === true)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-auto flex flex-col gap-2">
            <Button type="submit" size="lg" className="w-full">
              Price my project
            </Button>
            <p id="takeoff-note" className="text-xs leading-relaxed text-muted">
              The draft updates as you answer. No contact details required.
            </p>
          </div>
        </form>

        <div className="flex flex-col p-4 lg:p-5" aria-busy={drafting}>
          <div className="dimension-rule mb-3 border-t border-ink" aria-hidden="true" />

          <div className="flex items-baseline justify-between gap-3">
            <p className="type-label text-muted">Itemized estimate</p>
            <span className="type-stencil text-[11px] text-muted">DRAFT</span>
          </div>

          {result ? (
            <div key={draftVersion} className="mt-3 flex-1">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-ink">
                    <th scope="col" className="type-label py-2 text-[10px] text-muted">
                      Line
                    </th>
                    <th scope="col" className="type-label py-2 text-right text-[10px] text-muted">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.lineItems.map((item, index) => (
                    <tr
                      key={item.key}
                      className="draft-row border-b border-dotted border-line-strong"
                      style={{ "--row-index": index } as CSSProperties}
                    >
                      <th scope="row" className="py-2 pr-3 text-left font-normal text-ink-soft">
                        {item.label}
                      </th>
                      <td className="type-data py-2 text-right text-ink">
                        {money(item.amountCents, result.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="relative mt-5 border-t-2 border-ink pt-4">
                <RevisionCloud className="dimension-line pointer-events-none absolute -left-3 -top-9 h-20 w-52 opacity-80" />
                <div className="relative flex items-end justify-between gap-4">
                  <div>
                    <p className="type-label text-muted">Estimated total</p>
                    <p className="type-data mt-1 text-3xl font-extrabold tracking-tight text-ink">
                      {totalLabel}
                    </p>
                  </div>
                  <Stamp className="stamp-land mb-1 shrink-0">Draft estimate</Stamp>
                </div>
                <p className="type-data mt-3 text-xs text-muted">Range {rangeLabel}</p>
              </div>

              <ul className="mt-5 grid gap-1.5 border-t border-dotted border-line-strong pt-3 text-xs leading-relaxed text-muted">
                {result.assumptions.map((assumption) => (
                  <li key={assumption} className="flex gap-2">
                    <span aria-hidden="true">-</span>
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 flex flex-1 flex-col gap-2" aria-hidden="true">
              {[64, 82, 48, 70, 56].map((width) => (
                <div key={width} className="flex items-center justify-between border-b border-dotted border-line py-2">
                  <span className="h-2 bg-paper-sunk" style={{ width: `${width}%` }} />
                  <span className="h-2 w-14 bg-paper-sunk" />
                </div>
              ))}
              <p className="mt-auto border-t-2 border-line pt-4 text-sm text-muted">
                {rangeError ?? "Answer the takeoff to draft the quote."}
              </p>
            </div>
          )}

          {error ? (
            <p role="alert" className="mt-4 border-l-2 border-revision pl-2 text-xs leading-relaxed text-revision">
              {error}
            </p>
          ) : null}

          <p className="sr-only" aria-live="polite">
            {result
              ? `Estimate updated. Total ${totalLabel}, range ${rangeLabel}.`
              : "Estimate sheet ready."}
          </p>
        </div>
      </div>
    </Sheet>
  );
}
