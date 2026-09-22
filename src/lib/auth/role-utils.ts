import type { UserRole } from "./types";

const ROLE_LABELS: Record<UserRole, string> = {
  ANALYST: "Analyst",
  KAM: "Key Account Manager",
  CXO: "CXO",
};

const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  ANALYST: "/dashboard/analyst",
  KAM: "/dashboard/kam",
  CXO: "/dashboard/cxo",
};

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}

export function getDashboardPathForRole(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role];
}

export function isUserRole(value: string): value is UserRole {
  return value === "ANALYST" || value === "KAM" || value === "CXO";
}
