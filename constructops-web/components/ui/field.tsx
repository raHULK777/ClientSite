import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

export function fieldDescribedBy(id: string, options: { hint?: string; error?: string }) {
  return [options.hint ? `${id}-hint` : null, options.error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;
}

export function Field({ id, label, hint, error, optional, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="type-label text-ink">
          {label}
        </label>
        {optional ? <span className="text-[11px] text-muted">Optional</span> : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-xs text-revision">
          <span aria-hidden="true" className="mt-px font-semibold">
            !
          </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
