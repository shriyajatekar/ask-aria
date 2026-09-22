"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BarChart3, LayoutDashboard, Megaphone } from "lucide-react";

import type { UserRole } from "@/lib/auth/types";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  disabled?: boolean;
  isActive?: (pathname: string) => boolean;
};

const PERFORMANCE_PATHS = [
  "/dashboard/analyst",
  "/dashboard/kam",
  "/dashboard/cxo",
];

function performancePathForRole(role: UserRole | undefined): string {
  if (role === "KAM") return "/dashboard/kam";
  if (role === "CXO") return "/dashboard/cxo";
  return "/dashboard/analyst";
}

function buildNavItems(performanceHref: string): NavItem[] {
  return [
    {
      label: "Overview",
      icon: LayoutDashboard,
      href: performanceHref,
    },
    {
      label: "Analytics",
      icon: BarChart3,
      href: performanceHref,
      isActive: (pathname) => PERFORMANCE_PATHS.includes(pathname),
    },
    {
      label: "Campaigns",
      icon: Megaphone,
      href: "#",
      disabled: true,
    },
  ];
}

/**
 * Removed sidebar entries (still available in-product):
 * - Trends, Comparison → Analytics control card (Summary / Comparison modes)
 * - Keyword, Placement, Match Type, Targeting, Ad Type → metric workspace / future campaign analytics
 * - Brand, Category, Product, SKU → analytics-control-card + dashboard filters dialog
 * - Geography → dashboard filters dialog
 */
export function DashboardSidebarNav({
  collapsed,
  role,
  onNavigate,
}: {
  collapsed: boolean;
  role: UserRole | undefined;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = buildNavItems(performancePathForRole(role));

  return (
    <nav className="flex-1 space-y-0.5 p-3" aria-label="Main navigation">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = item.isActive?.(pathname) ?? false;
          return (
            <li key={item.label}>
              <SidebarNavLink
                item={item}
                active={active}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SidebarNavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const className = cn(
    "flex items-center rounded-md py-2 type-body-medium transition-colors",
    collapsed ? "justify-center px-2" : "gap-2 px-3",
    active
      ? "bg-background-tertiary text-text-primary"
      : "text-text-secondary hover:bg-surface-hover",
    item.disabled && "pointer-events-none opacity-50",
  );

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed ? <span>{item.label}</span> : null}
      {collapsed ? <span className="sr-only">{item.label}</span> : null}
    </>
  );

  if (item.disabled) {
    return (
      <span
        className={className}
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        aria-disabled="true"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={className}
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={() => onNavigate?.()}
    >
      {content}
    </Link>
  );
}
