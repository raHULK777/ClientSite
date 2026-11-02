import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "h-11 w-full border border-ink bg-paper-raised px-3 font-body text-base text-ink",
          "placeholder:text-muted/70",
          "transition-colors duration-fast ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          "disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:text-muted",
          "aria-[invalid=true]:border-revision aria-[invalid=true]:ring-revision",
          "type-data",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
