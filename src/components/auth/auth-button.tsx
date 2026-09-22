import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface AuthButtonProps extends ButtonProps {
  loading?: boolean;
  loadingLabel?: string;
}

export function AuthButton({
  loading = false,
  loadingLabel = "Please wait…",
  disabled,
  children,
  className,
  ...props
}: AuthButtonProps) {
  return (
    <Button
      className={cn("w-full", className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}
