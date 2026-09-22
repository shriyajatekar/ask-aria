"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-provider";
import { useDashboard } from "@/contexts/dashboard-context";
import { getRoleLabel } from "@/lib/auth/role-utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";

import { AnalyticsControlCard } from "./analytics-control-card";
import { DashboardMobileNavDrawer } from "./dashboard-mobile-nav-drawer";
import { DashboardNotificationCenter } from "./dashboard-notification-center";
import { DashboardSidebarNav } from "./dashboard-sidebar-nav";
import { PlatformNavigationHeader } from "./platform-navigation-header";

const SIDEBAR_COLLAPSED_KEY = "ci-sidebar-collapsed";
const SIDEBAR_WIDTH_EXPANDED = 252;
const SIDEBAR_WIDTH_COLLAPSED = 68;

export function DashboardAppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { platform, setPlatform } = useDashboard();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "false") {
      setSidebarCollapsed(false);
    } else if (stored === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.sessionStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  const sidebarWidth = sidebarCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background [--ci-header-height:6.25rem]">
      <div className="fixed inset-x-0 top-0 z-50 isolate bg-surface">
        <header className="border-b border-border">
          <div className="flex h-14 items-center gap-2 px-4 lg:gap-4 lg:px-6">
            <DashboardMobileNavDrawer />
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-0 sm:items-center sm:gap-3">
              <div className="min-w-0">
                <span className="type-body-medium whitespace-nowrap text-text-primary">
                  Commerce Intelligence
                </span>
                <span className="type-small text-text-tertiary">
                  {" "}
                  · CONCEPTUAL CASE STUDY
                </span>
              </div>
              <span className="hidden h-4 w-px bg-border md:block" />
              {user ? (
                <span className="hidden type-small text-text-secondary md:inline">
                  {user.name}
                  <span className="text-text-tertiary">
                    {" "}
                    · {getRoleLabel(user.role)}
                  </span>
                </span>
              ) : (
                <span className="hidden type-body text-text-secondary md:inline">
                  Demo Workspace
                </span>
              )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1">
              <DashboardNotificationCenter />
              <Button variant="tertiary" size="icon" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Button>
              {user ? (
                <UserProfileMenu
                  name={user.name}
                  roleLabel={getRoleLabel(user.role)}
                  onSignOut={signOut}
                />
              ) : null}
            </div>
          </div>
        </header>

        <PlatformNavigationHeader
          platform={platform}
          onPlatformChange={setPlatform}
        />
      </div>

      <aside
        className={cn(
          "fixed bottom-0 left-0 z-40 hidden min-w-0 flex-col border-r border-border bg-surface lg:flex",
          "top-[var(--ci-header-height)]",
        )}
        style={{ width: sidebarWidth }}
      >
        <div className="flex flex-1 flex-col">
          <DashboardSidebarNav collapsed={sidebarCollapsed} role={user?.role} />
        </div>

        <div className="shrink-0 border-t border-border-subtle p-3">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center rounded-md border border-border px-2 py-2 type-label text-text-secondary transition-colors hover:bg-surface-hover",
              sidebarCollapsed ? "justify-center" : "gap-2",
            )}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <main
        className={cn(
          "min-h-screen min-w-0 overflow-x-hidden overflow-y-auto px-4 pb-4 lg:px-6 lg:pb-5",
          "pt-[var(--ci-header-height)]",
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[252px]",
        )}
      >
        <div className="flex min-w-0 flex-col gap-4 pt-3">
          <AnalyticsControlCard />
          {children}
        </div>
      </main>
    </div>
  );
}

function UserProfileMenu({
  name,
  roleLabel,
  onSignOut,
}: {
  name: string;
  roleLabel: string;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ml-1 flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-left transition-colors hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive"
          aria-label="Open user menu"
        >
          <span className="hidden text-right sm:block">
            <span className="block type-body-medium text-text-primary">{name}</span>
            <span className="block type-small text-text-tertiary">{roleLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-text-tertiary" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>
          <div className="space-y-0.5">
            <p className="type-body-medium text-text-primary">{name}</p>
            <p className="type-small font-normal text-text-tertiary">{roleLabel}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Profile</DropdownMenuItem>
        <DropdownMenuItem disabled>Preferences</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
