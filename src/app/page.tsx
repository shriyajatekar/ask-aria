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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8">
      <div className="max-w-lg space-y-6 text-center">
        <p className="type-label uppercase tracking-wide text-text-tertiary">
          Commerce Intelligence
        </p>
        <h1 className="type-display">Turn commerce data into decisions.</h1>
        <p className="type-body text-text-secondary">
          Sign in to your workspace or explore the design system foundation.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/sign-in">
            <Button>Sign in</Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="secondary">Create workspace</Button>
          </Link>
          <Link href="/design-system">
            <Button variant="tertiary">Design system</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
