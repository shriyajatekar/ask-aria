"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-provider";
import { getDashboardPathForRole } from "@/lib/auth/role-utils";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(getDashboardPathForRole(user.role));
    }
  }, [isLoading, router, user]);

  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="type-body text-text-secondary">Loading…</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-8">
      <div className="max-w-lg space-y-6 text-center">
        <p className="type-label uppercase tracking-wide text-text-tertiary">
          Conceptual case study
        </p>
        <h1 className="type-display">Ask Aria</h1>
        <p className="type-body text-text-primary">
          A conversational assistant inside a commerce analytics dashboard: ask
          why a number moved and get a sourced answer, a next step, and a
          confirm-before-send action.
        </p>
        <p className="type-small text-text-secondary">
          Synthetic data across 12 ecommerce &amp; quick-commerce platforms.
          Every answer is calculated from that data. An AI model is only used,
          when connected, to understand unusual phrasing, never to write
          answers. Nothing is ever sent or created for real.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/sign-in">Try the demo</Link>
          </Button>
          <Button asChild variant="tertiary">
            <Link href="/design-system">Design system</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
