import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border px-2 py-1 type-label text-[10px] leading-none",
  {
    variants: {
      variant: {
        draft: "border-line-strong bg-paper text-muted",
        pending: "border-revision bg-paper text-revision",
        approved: "border-ink bg-ink text-paper",
        rejected: "border-revision bg-revision text-white",
        brand: "border-brand-primary bg-brand-primary text-brand-ink",
      },
    },
    defaultVariants: {
      variant: "draft",
    },
  },
);

export type BadgeProps = ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
