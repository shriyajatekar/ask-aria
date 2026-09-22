"use client";

import { RequireAuth } from "@/components/auth";
import { DashboardProvider } from "@/contexts/dashboard-context";
import type { UserRole } from "@/lib/auth/types";

import { AnalyticsDashboard } from "./analytics-dashboard";
import { AskAriaInvocation } from "./ask-aria";
import { DashboardAppShell } from "./dashboard-app-shell";

export function RoleAnalyticsDashboardPage({
  allowedRole,
}: {
  allowedRole: UserRole;
}) {
  return (
    <RequireAuth allowedRole={allowedRole}>
      <DashboardProvider>
        <AskAriaInvocation>
          <DashboardAppShell>
            <AnalyticsDashboard />
          </DashboardAppShell>
        </AskAriaInvocation>
      </DashboardProvider>
    </RequireAuth>
  );
}
