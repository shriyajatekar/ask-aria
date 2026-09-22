"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-provider";
import { getDashboardPathForRole } from "@/lib/auth/role-utils";
import type { UserRole } from "@/lib/auth/types";

export function RequireAuth({
  children,
  allowedRole,
}: {
  children: ReactNode;
  allowedRole?: UserRole;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    if (allowedRole && user.role !== allowedRole) {
      router.replace(getDashboardPathForRole(user.role));
    }
  }, [allowedRole, isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="type-body text-text-secondary">Loading workspace…</p>
      </div>
    );
  }

  if (!user || (allowedRole && user.role !== allowedRole)) {
    return null;
  }

  return children;
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;
    router.replace(getDashboardPathForRole(user.role));
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="type-body text-text-secondary">Loading…</p>
      </div>
    );
  }

  if (user) return null;

  return children;
}
