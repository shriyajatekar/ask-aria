import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "type-body-medium",
    "rounded-md transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive",
  ],
  {
    variants: {
      variant: {
        primary:
          "border border-transparent bg-accent-interactive text-white hover:bg-primary-hover",
        secondary:
          "border border-border bg-white text-text-primary hover:bg-surface-hover",
        tertiary:
          "border border-transparent bg-transparent text-text-primary hover:bg-surface-hover",
        destructive:
          "border border-error bg-white text-error hover:bg-error-subtle",
      },
      size: {
        default: "h-10 px-4",
        compact: "px-2 py-1.5 text-[13px] leading-5",
        sm: "h-8 px-3 text-[13px] leading-5",
        icon: "h-10 w-10 shrink-0 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
