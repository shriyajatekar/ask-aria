export const USER_ROLES = ["ANALYST", "KAM", "CXO"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
}

export interface PendingSignup {
  name: string;
  email: string;
  password: string;
  company: string;
}

export interface RegisteredUser extends User {
  password: string;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
}
