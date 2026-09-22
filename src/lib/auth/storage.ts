import type { PendingSignup, RegisteredUser, User } from "./types";
import { isUserRole } from "./role-utils";

const SESSION_KEY = "ci-auth-session";
const PENDING_SIGNUP_KEY = "ci-pending-signup";
const REGISTERED_USERS_KEY = "ci-registered-users";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readSession(): User | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (!parsed?.id || !parsed?.email || !isUserRole(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(user: User): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function readPendingSignup(): PendingSignup | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSignup;
  } catch {
    return null;
  }
}

export function writePendingSignup(pending: PendingSignup): void {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pending));
}

export function clearPendingSignup(): void {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(PENDING_SIGNUP_KEY);
}

export function readRegisteredUsers(): RegisteredUser[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(REGISTERED_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RegisteredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertRegisteredUser(user: RegisteredUser): void {
  if (!isBrowser()) return;
  const users = readRegisteredUsers().filter((entry) => entry.email !== user.email);
  users.push(user);
  window.localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

export function findRegisteredUserByEmail(email: string): RegisteredUser | undefined {
  const normalized = email.trim().toLowerCase();
  return readRegisteredUsers().find(
    (user) => user.email.toLowerCase() === normalized,
  );
}
