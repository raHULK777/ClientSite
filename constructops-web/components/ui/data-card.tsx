import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function DataCard({
  label,
  value,
  detail,
  badge,
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border border-ink bg-paper-raised", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-dotted border-line-strong px-4 py-3">
        <p className="type-label text-muted">{label}</p>
        {badge}
      </div>
      <div className="px-4 py-4">
        <p className="type-data text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-none text-ink">
          {value}
        </p>
        {detail ? <p className="mt-2 text-xs leading-relaxed text-ink-soft">{detail}</p> : null}
      </div>
      {footer ? (
        <div className="border-t border-line px-4 py-2.5 text-xs text-muted">{footer}</div>
      ) : null}
    </div>
  );
}
