"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { useAuth } from "@/contexts/auth-provider";
import { cn } from "@/lib/cn";

import { useAskAria } from "./ask-aria/ask-aria-context";
import type { DemoWorkspaceTool } from "./ask-aria/ask-aria-tools-storage";
import { DashboardSidebarNav } from "./dashboard-sidebar-nav";

export function DashboardMobileNavDrawer() {
  const { user } = useAuth();
  const { openPanel, openToolsSheet } = useAskAria();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function closeDrawer() {
    setOpen(false);
  }

  function openAskAria() {
    closeDrawer();
    openPanel();
  }

  function openTools(focus?: DemoWorkspaceTool) {
    closeDrawer();
    openToolsSheet(focus);
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:bg-surface-hover lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </button>

      {open ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-[45] bg-black/20 lg:hidden"
          onClick={closeDrawer}
        />
      ) : null}

      <aside
        id="dashboard-mobile-nav"
        aria-hidden={!open}
        className={cn(
          "fixed bottom-0 left-0 z-[46] flex w-[min(252px,88vw)] flex-col border-r border-border bg-surface shadow-md transition-transform duration-200 lg:hidden",
          "top-[var(--ci-header-height)]",
          open ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
          <span className="type-label text-text-tertiary">Menu</span>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close navigation menu"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <DashboardSidebarNav
            collapsed={false}
            role={user?.role}
            onNavigate={closeDrawer}
          />
        </div>

        <div className="shrink-0 border-t border-border-subtle p-3">
          <p className="mb-2 type-label text-text-tertiary">Ask Aria</p>
          <nav
            className="flex flex-col gap-1"
            aria-label="Ask Aria shortcuts"
          >
            <button
              type="button"
              onClick={openAskAria}
              className="rounded-md px-3 py-2.5 text-left type-body-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Open Ask Aria
            </button>
            <button
              type="button"
              onClick={() => openTools()}
              className="rounded-md px-3 py-2.5 text-left type-body-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Tools
            </button>
            <button
              type="button"
              onClick={() => openTools("monitoring")}
              className="rounded-md px-3 py-2.5 text-left type-body-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              Monitors
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
}
