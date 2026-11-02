"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Stamp } from "@/components/ui/stamp";
import { apiMutate, ClientApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";

import type { AdminTenant, PaletteForm } from "@/lib/api-types";
import type { TenantFeaturesUpdateInput } from "@constructops/shared";
import { evaluatePalette, parseHex } from "@constructops/shared";

const COLOR_FIELDS: { key: keyof PaletteForm; label: string; hint: string }[] = [
  { key: "primary", label: "Primary", hint: "Top bar and primary buttons." },
  { key: "secondary", label: "Secondary", hint: "Revision marks and ruled accents." },
  { key: "background", label: "Page paper", hint: "The workspace ground." },
  { key: "surface", label: "Raised surface", hint: "Sheets, cards, and forms." },
];

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function ColorField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const valid = parseHex(value) !== null;
  const colorValue = valid ? normalizeHex(value) : "#000000";
  return (
    <Field id={id} label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={colorValue}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-12 shrink-0 cursor-pointer border border-ink bg-paper-raised p-1 disabled:cursor-not-allowed disabled:opacity-45"
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={!valid || undefined}
          aria-describedby={fieldDescribedBy(id, { hint })}
          className="font-mono text-xs uppercase"
        />
      </div>
    </Field>
  );
}

function BrandingForm({ tenant }: { tenant: AdminTenant }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(tenant.companyName);
  const [palette, setPalette] = useState<PaletteForm>({ ...tenant.palette });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const valid = COLOR_FIELDS.every(({ key }) => parseHex(palette[key]) !== null);
  const evaluation = valid
    ? evaluatePalette({
        primary: normalizeHex(palette.primary),
        secondary: normalizeHex(palette.secondary),
        background: normalizeHex(palette.background),
        surface: normalizeHex(palette.surface),
      })
    : null;
  const companyValid = companyName.trim().length >= 2;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (!companyValid) {
      setError("The company name needs at least two characters.");
      return;
    }
    if (!valid || !evaluation?.ok) {
      setError("Resolve the contrast checks before saving the palette.");
      return;
    }
    setPending(true);
    try {
      await apiMutate("/protected/tenant/branding", "PATCH", {
        companyName: companyName.trim(),
        palette: {
          primary: normalizeHex(palette.primary),
          secondary: normalizeHex(palette.secondary),
          background: normalizeHex(palette.background),
          surface: normalizeHex(palette.surface),
        },
      });
      setSaved(true);
      setPending(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ClientApiError ? cause.message : "Branding could not be saved.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div>
        <p className="type-label text-[9px] text-muted">Brand preview</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 border border-ink bg-paper p-3">
          <span
            className="inline-flex min-h-9 items-center border px-3 text-xs font-semibold"
            style={{
              backgroundColor: valid ? normalizeHex(palette.primary) : "#15202B",
              color: evaluation?.foreground.primary ?? "#FFFFFF",
              borderColor: valid ? normalizeHex(palette.primary) : "#15202B",
            }}
          >
            Save record
          </span>
          <Stamp
            className="px-2 py-1 text-[9px]"
            style={{
              color: valid ? normalizeHex(palette.secondary) : "#B3261E",
              borderColor: valid ? normalizeHex(palette.secondary) : "#B3261E",
            }}
          >
            Revised
          </Stamp>
          <span className="text-xs text-ink-soft">{companyName.trim() || "Company name"}</span>
        </div>
      </div>

      <Field
        id="settings-company"
        label="Company name"
        error={!companyValid && companyName.length ? "Use at least two characters." : undefined}
      >
        <Input
          id="settings-company"
          value={companyName}
          onChange={(event) => {
            setCompanyName(event.target.value);
            setSaved(false);
          }}
          onBlur={() => setCompanyName((value) => value.trim())}
          aria-invalid={!companyValid || undefined}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {COLOR_FIELDS.map((field) => (
          <ColorField
            key={field.key}
            id={`settings-${field.key}`}
            label={field.label}
            hint={field.hint}
            value={palette[field.key]}
            onChange={(value) => {
              setPalette((current) => ({ ...current, [field.key]: value }));
              setSaved(false);
            }}
            disabled={pending}
          />
        ))}
      </div>

      <div className="border-t border-line pt-4">
        <p className="type-label text-[9px] text-muted">Contrast gate</p>
        {evaluation ? (
          <ul className="mt-2 flex flex-col divide-y divide-line border border-line">
            {evaluation.checks.map((check) => (
              <li
                key={check.name}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span className="text-xs text-ink-soft">{check.name}</span>
                <span className="flex items-center gap-3">
                  <span className="type-data text-[11px] text-muted">
                    {check.ratio.toFixed(2)}:1
                  </span>
                  <span
                    className={cn(
                      "type-label text-[8px]",
                      check.pass ? "text-ink" : "text-revision",
                    )}
                  >
                    {check.pass ? "Pass" : `Needs ${check.required}:1`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 border border-revision bg-paper px-3 py-2 text-sm text-revision">
            Use six-digit hex colors, for example #0B1220.
          </p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          {evaluation?.ok
            ? "The palette passes AA for body text and controls."
            : "Saving is blocked until every check passes."}
        </p>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {error ? (
          <p className="border border-revision bg-paper px-3 py-2.5 text-sm leading-relaxed text-revision">
            {error}
          </p>
        ) : null}
        {saved && !error ? (
          <p className="type-label border border-ink bg-paper px-3 py-2 text-[9px] text-ink">
            Branding saved
          </p>
        ) : null}
      </div>

      <div className="border-t border-line pt-4">
        <Button type="submit" loading={pending} disabled={!valid || !evaluation?.ok}>
          Save branding
        </Button>
      </div>
    </form>
  );
}

const FEATURE_COPY: {
  key: keyof TenantFeaturesUpdateInput;
  label: string;
  description: string;
  offNote: string;
}[] = [
  {
    key: "estimator",
    label: "Estimator",
    description: "Public pricing widget on the website.",
    offNote: "Hides the public estimator.",
  },
  {
    key: "clientPortal",
    label: "Client portal",
    description: "Clients can see their jobs and sign changes.",
    offNote: "Clients lose access to the portal.",
  },
  {
    key: "changeOrders",
    label: "Change orders",
    description: "Office can issue priced changes for signature.",
    offNote: "Blocks new change orders and client signatures.",
  },
];

function FeaturesForm({ tenant }: { tenant: AdminTenant }) {
  const router = useRouter();
  const [features, setFeatures] = useState<Required<TenantFeaturesUpdateInput>>({
    estimator: tenant.features.estimator,
    clientPortal: tenant.features.clientPortal,
    changeOrders: tenant.features.changeOrders,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      await apiMutate("/protected/tenant/features", "PATCH", features);
      setSaved(true);
      setPending(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ClientApiError ? cause.message : "Features could not be saved.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {FEATURE_COPY.map((feature) => {
          const enabled = features[feature.key];
          return (
            <li key={feature.key}>
              <label className="flex min-h-14 cursor-pointer items-start gap-3 py-3">
                <Checkbox
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    setFeatures((current) => ({
                      ...current,
                      [feature.key]: checked === true,
                    }));
                    setSaved(false);
                  }}
                  disabled={pending}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{feature.label}</span>
                    <span
                      className={cn(
                        "type-label text-[8px]",
                        enabled ? "text-ink" : "text-muted",
                      )}
                    >
                      {enabled ? "On" : "Off"}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {feature.description}
                  </span>
                  {!enabled ? (
                    <span className="mt-1 block text-[11px] leading-relaxed text-revision">
                      {feature.offNote}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div aria-live="polite" aria-atomic="true">
        {error ? (
          <p className="border border-revision bg-paper px-3 py-2.5 text-sm leading-relaxed text-revision">
            {error}
          </p>
        ) : null}
        {saved && !error ? (
          <p className="type-label border border-ink bg-paper px-3 py-2 text-[9px] text-ink">
            Features saved
          </p>
        ) : null}
      </div>

      <div className="border-t border-line pt-4">
        <Button type="submit" loading={pending}>
          Save features
        </Button>
      </div>
    </form>
  );
}

export function SettingsForm({ tenant }: { tenant: AdminTenant }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Sheet className="bg-paper-raised">
        <div className="border-b-2 border-ink px-5 py-3">
          <p className="type-label text-[9px] text-muted">Identity</p>
          <h2 className="type-heading mt-0.5 text-lg">Branding</h2>
        </div>
        <div className="p-5">
          <BrandingForm tenant={tenant} />
        </div>
      </Sheet>

      <Sheet className="bg-paper-raised">
        <div className="border-b-2 border-ink px-5 py-3">
          <p className="type-label text-[9px] text-muted">Controls</p>
          <h2 className="type-heading mt-0.5 text-lg">Features</h2>
        </div>
        <div className="p-5">
          <FeaturesForm tenant={tenant} />
        </div>
      </Sheet>
    </div>
  );
}
