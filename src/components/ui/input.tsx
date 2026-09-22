import * as React from "react";

import { cn } from "@/lib/cn";

export type InputProps = React.ComponentProps<"input">;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-border-strong bg-white px-3",
          "type-body text-text-primary placeholder:text-text-disabled",
          "transition-colors",
          "focus-visible:border-accent-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-interactive/15",
          "disabled:cursor-not-allowed disabled:bg-background-secondary disabled:text-text-disabled",
          "aria-invalid:border-error aria-invalid:focus-visible:ring-error/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
