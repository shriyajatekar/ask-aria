import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface AuthLayoutProps {
  intro: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AuthLayout({ intro, children, className }: AuthLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-page lg:grid lg:grid-cols-2", className)}>
      <aside className="flex flex-col justify-between border-b border-border bg-background-secondary px-6 py-8 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
        {intro}
      </aside>
      <main className="flex items-center justify-center bg-surface px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}

export function AuthIntroPanel() {
  return (
    <>
      <div className="space-y-6">
        <p className="type-label uppercase tracking-wide text-text-tertiary">
          CONCEPTUAL CASE STUDY
        </p>
        <p className="type-label uppercase tracking-wide text-text-tertiary">
          Commerce Intelligence
        </p>
        <h1 className="type-display max-w-md">
          Turn commerce data into decisions.
        </h1>
        <p className="max-w-md type-body text-text-secondary">
          A precise analytics workspace for teams who need clarity across
          channels, accounts, and performance—without noise.
        </p>
      </div>
      <p className="type-small text-text-tertiary">
        Enterprise-grade commerce intelligence
      </p>
    </>
  );
}
