import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export function Stamp({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "inline-flex -rotate-[4deg] flex-col items-center border-2 border-revision px-2.5 py-1",
        "type-stencil text-[11px] uppercase leading-none tracking-[0.14em] text-revision",
        className,
      )}
      {...props}
    />
  );
}

export function RevisionCloud({ className, ...props }: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      viewBox="0 0 200 64"
      fill="none"
      aria-hidden="true"
      className={cn("text-revision", className)}
      {...props}
    >
      <path
        d="M14 33c-5-15 9-24 24-22 7-13 27-15 37-4 13-7 31 0 31 11 15-2 28 7 26 18 16 5 13 21-3 24-9 14-31 14-40 4-13 9-31 4-35-7-14 2-25-7-23-16-7-2-15-5-17-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
    </svg>
  );
}
