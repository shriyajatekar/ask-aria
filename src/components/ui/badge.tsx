import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-sm border px-2 py-0.5",
    "type-label whitespace-nowrap",
  ],
  {
    variants: {
      variant: {
        default:
          "border-border bg-background-secondary text-text-secondary",
        outline: "border-border bg-white text-text-secondary",
        success:
          "border-transparent bg-success-subtle text-success",
        warning:
          "border-transparent bg-warning-subtle text-warning",
        error: "border-transparent bg-error-subtle text-error",
        info: "border-transparent bg-info-subtle text-info",
        dark: "border-transparent bg-accent-interactive text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
