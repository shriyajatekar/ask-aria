import * as React from "react";

import { cn } from "@/lib/cn";

export type LabelProps = React.ComponentProps<"label">;

function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn("type-label text-text-secondary", className)}
      {...props}
    />
  );
}

export { Label };
