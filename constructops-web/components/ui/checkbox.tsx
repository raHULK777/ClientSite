"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/cn";

export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "group -m-3 flex h-11 w-11 shrink-0 items-center justify-center",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
      "disabled:cursor-not-allowed disabled:opacity-45",
      className,
    )}
    {...props}
  >
    <span
      className={cn(
        "flex h-5 w-5 items-center justify-center border border-ink bg-paper-raised text-paper",
        "transition-colors duration-fast ease-out",
        "group-data-[state=checked]:bg-ink group-data-[state=indeterminate]:bg-ink",
      )}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </span>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = "Checkbox";
