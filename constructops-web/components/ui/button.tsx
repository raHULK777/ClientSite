import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    "inline-flex select-none items-center justify-center gap-2 border font-body font-semibold",
    "transition-[transform,background-color,border-color,color,filter] duration-fast ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary: "border-transparent bg-brand-primary text-brand-ink hover:brightness-95",
        secondary: "border-ink bg-paper-raised text-ink hover:bg-paper-sunk",
        ghost: "border-transparent bg-transparent text-ink hover:bg-paper-sunk",
        revision: "border-transparent bg-revision text-white hover:brightness-95",
      },
      size: {
        sm: "h-11 px-3 text-xs uppercase tracking-[0.12em]",
        md: "h-12 px-5 text-sm",
        lg: "h-14 px-6 text-sm uppercase tracking-[0.12em]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const content = asChild ? (
      children
    ) : (
      <>
        {loading ? (
          <Loader2
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </>
    );
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {content}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export const BrandButton = Button;

export { buttonVariants };
