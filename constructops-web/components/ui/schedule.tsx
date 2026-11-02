import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export function Schedule({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("w-full overflow-x-auto border border-ink bg-paper-raised", className)}
      {...props}
    />
  );
}

export function ScheduleTable({ className, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <table
      className={cn("w-full border-collapse text-left text-sm", className)}
      {...props}
    />
  );
}

export function ScheduleHead({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return <thead className={cn("border-b-2 border-ink", className)} {...props} />;
}

export function ScheduleBody({ className, ...props }: ComponentPropsWithoutRef<"tbody">) {
  return <tbody className={className} {...props} />;
}

export function ScheduleRow({ className, ...props }: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn("border-b border-dotted border-line-strong last:border-b-0", className)}
      {...props}
    />
  );
}

export function ScheduleHeaderCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      scope="col"
      className={cn("type-label px-3 py-2 text-[10px] font-semibold text-muted", className)}
      {...props}
    />
  );
}

export function ScheduleCell({ className, ...props }: ComponentPropsWithoutRef<"td">) {
  return <td className={cn("px-3 py-2.5 align-top text-ink-soft", className)} {...props} />;
}

export function ScheduleAmount({ className, ...props }: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className={cn("type-data px-3 py-2.5 text-right align-top text-ink", className)}
      {...props}
    />
  );
}
