"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

interface AuthInputProps extends ComponentProps<"input"> {
  label: string;
  error?: string;
  hint?: string;
}

export function AuthInput({
  label,
  error,
  hint,
  id,
  type = "text",
  className,
  ...props
}: AuthInputProps) {
  const inputId = id ?? props.name;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword && showPassword ? "text" : type;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <input
          id={inputId}
          type={resolvedType}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            "flex h-10 w-full rounded-md border border-border-strong bg-surface px-3",
            "type-body text-text-primary placeholder:text-text-disabled",
            "transition-colors",
            "focus-visible:border-accent-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-interactive/15",
            "disabled:cursor-not-allowed disabled:bg-background-secondary disabled:text-text-disabled",
            "aria-invalid:border-error aria-invalid:focus-visible:ring-error/20",
            isPassword && "pr-10",
            className,
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-text-tertiary",
              "hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive",
            )}
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="type-small text-text-tertiary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="type-small text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
