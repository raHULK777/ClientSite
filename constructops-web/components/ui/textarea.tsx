import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>(
  ({ className, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full resize-y border border-ink bg-paper-raised px-3 py-2.5 font-body text-base text-ink",
          "placeholder:text-muted/70",
          "transition-colors duration-fast ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          "disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:text-muted",
          "aria-[invalid=true]:border-revision",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
