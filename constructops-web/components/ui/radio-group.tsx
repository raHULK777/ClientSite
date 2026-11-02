"use client";

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

export const RadioGroup = forwardRef<
  ElementRef<typeof RadioGroupPrimitive.Root>,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("grid gap-2", className)} {...props} />
));

RadioGroup.displayName = "RadioGroup";

export const RadioGroupItem = forwardRef<
  ElementRef<typeof RadioGroupPrimitive.Item>,
  ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "group -m-3 flex h-11 w-11 shrink-0 items-center justify-center",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
      "disabled:cursor-not-allowed disabled:opacity-45",
      className,
    )}
    {...props}
  >
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ink bg-paper-raised transition-colors duration-fast ease-out group-data-[state=checked]:border-ink">
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="h-2.5 w-2.5 rounded-full bg-ink" />
      </RadioGroupPrimitive.Indicator>
    </span>
  </RadioGroupPrimitive.Item>
));

RadioGroupItem.displayName = "RadioGroupItem";

export function RadioOption({
  value,
  id,
  label,
  hint,
  children,
}: {
  value: string;
  id: string;
  label: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 border border-line bg-paper-raised px-3 py-3",
        "transition-colors duration-fast ease-out hover:border-ink",
        "has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-paper-sunk",
      )}
    >
      <RadioGroupItem value={value} id={id} />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint ? <span className="text-xs leading-relaxed text-muted">{hint}</span> : null}
        {children}
      </span>
    </label>
  );
}
