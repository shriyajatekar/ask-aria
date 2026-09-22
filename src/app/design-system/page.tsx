import Link from "next/link";

import { DesignSystemShowcase } from "@/components/design-system/design-system-showcase";
import { Button } from "@/components/ui/button";

export default function DesignSystemPage() {
  return (
    <div className="min-h-full bg-background-secondary">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="type-body-medium text-text-primary hover:text-text-secondary"
            >
              Commerce Intelligence
            </Link>
            <span className="text-border-strong">/</span>
            <span className="type-body text-text-secondary">Design system</span>
          </div>
          <Link href="/">
            <Button variant="tertiary" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-8 py-10">
        <div className="mb-10 max-w-3xl space-y-3">
          <h1 className="type-h1">UI foundation</h1>
          <p className="type-body text-text-secondary">
            Reusable primitives and tokens for Commerce Intelligence. Semantic
            colors appear only for system states, not brand identity.
          </p>
        </div>

        <DesignSystemShowcase />
      </main>
    </div>
  );
}
