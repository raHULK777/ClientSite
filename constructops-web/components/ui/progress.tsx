"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";

import { cn } from "@/lib/cn";

export const Progress = forwardRef<
  ElementRef<typeof ProgressPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value = 0, ...props }, ref) => {
  const clamped = Math.min(100, Math.max(0, value ?? 0));
  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={clamped}
      className={cn("relative h-2.5 w-full overflow-hidden border border-line-strong bg-paper-sunk", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full bg-brand-primary transition-transform duration-base ease-out"
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});

Progress.displayName = "Progress";

export const ProgressBar = Progress;
