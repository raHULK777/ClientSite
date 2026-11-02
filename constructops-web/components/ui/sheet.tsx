import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export function Sheet({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("relative border border-ink bg-paper shadow-sheet", className)}
      {...props}
    />
  );
}

export function SheetBar({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ink bg-paper px-4 py-2.5",
        "type-label text-[10px] text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function SheetIndex({
  items,
  active,
  className,
}: {
  items: string[];
  active: string;
  className?: string;
}) {
  return (
    <nav aria-label="Sheet index" className={cn("flex flex-wrap gap-3", className)}>
      {items.map((item) => {
        const isActive = item === active;
        return (
          <span
            key={item}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 pb-0.5",
              isActive ? "border-revision text-ink" : "border-transparent text-muted",
            )}
          >
            {item}
          </span>
        );
      })}
    </nav>
  );
}

export function TitleBlock({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-ink bg-ink px-4 py-3",
        "type-label text-[10px] text-paper",
        className,
      )}
      {...props}
    />
  );
}

export function Rule({ className, ...props }: ComponentPropsWithoutRef<"hr">) {
  return <hr className={cn("border-0 border-t border-ink", className)} {...props} />;
}

export function DottedRule({ className, ...props }: ComponentPropsWithoutRef<"hr">) {
  return <hr className={cn("border-0 border-t border-dotted border-line-strong", className)} {...props} />;
}
