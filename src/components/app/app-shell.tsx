"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/contexts/auth-provider";
import { getRoleLabel } from "@/lib/auth/role-utils";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AppShell({ children, title, description }: AppShellProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <span className="type-body-medium text-text-primary">
              Commerce Intelligence
            </span>
          </div>
          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="type-body-medium text-text-primary">{user.name}</p>
                <p className="type-small text-text-tertiary">
                  {getRoleLabel(user.role)}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-8 py-10">
        <div className="mb-8 max-w-2xl space-y-2">
          <h1 className="type-h1">{title}</h1>
          {description ? (
            <p className="type-body text-text-secondary">{description}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}
