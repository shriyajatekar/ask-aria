import {
  beginDemoPortfolioSession,
  clearDemoPortfolioSession,
} from "@/components/dashboard/ask-aria/ask-aria-user-scope";

import {
  demoUserToSessionUser,
  getDemoUserByEmail,
  getDemoUserById,
} from "./demo-users";
import {
  clearPendingSignup,
  clearSession,
  findRegisteredUserByEmail,
  readPendingSignup,
  upsertRegisteredUser,
  writePendingSignup,
  writeSession,
} from "./storage";
import type { PendingSignup, User, UserRole } from "./types";
import { validateSignIn, validateSignUp } from "./validation";

const MOCK_DELAY_MS = 700;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockSignIn(
  email: string,
  password: string,
): Promise<{ user: User } | { error: string }> {
  const validationError = validateSignIn(email, password);
  if (validationError) return { error: validationError };

  await delay(MOCK_DELAY_MS);

  const demoUser = getDemoUserByEmail(email);
  if (demoUser) {
    beginDemoPortfolioSession();
    const user = demoUserToSessionUser(demoUser);
    writeSession(user);
    return { user };
  }

  const registered = findRegisteredUserByEmail(email);
  if (!registered || registered.password !== password) {
    return {
      error: "We couldn't sign you in. Check your email and password, or try a demo workspace.",
    };
  }

  const user: User = {
    id: registered.id,
    name: registered.name,
    email: registered.email,
    role: registered.role,
    company: registered.company,
  };
  writeSession(user);
  return { user };
}

export function mockSignInDemo(demoUserId: string): User | null {
  const demo = getDemoUserById(demoUserId);
  if (!demo) return null;
  beginDemoPortfolioSession();
  const user = demoUserToSessionUser(demo);
  writeSession(user);
  return user;
}

export async function mockStartSignUp(
  pending: PendingSignup,
): Promise<{ ok: true } | { error: string }> {
  const validationError = validateSignUp(pending);
  if (validationError) return { error: validationError };

  await delay(MOCK_DELAY_MS);

  const demoConflict = getDemoUserByEmail(pending.email);
  if (demoConflict) {
    return { error: "This email is reserved for demo access. Use Try demo workspace." };
  }

  const existing = findRegisteredUserByEmail(pending.email);
  if (existing) {
    return { error: "An account with this email already exists. Sign in instead." };
  }

  writePendingSignup(pending);
  return { ok: true };
}

export async function mockCompleteSignUp(
  role: UserRole,
): Promise<{ user: User } | { error: string }> {
  const pending = readPendingSignup();
  if (!pending) {
    return { error: "Your sign-up session expired. Please create your workspace again." };
  }

  await delay(MOCK_DELAY_MS);

  const user: User = {
    id: `user-${crypto.randomUUID()}`,
    name: pending.name.trim(),
    email: pending.email.trim().toLowerCase(),
    role,
    company: pending.company.trim(),
  };

  upsertRegisteredUser({
    ...user,
    password: pending.password,
  });

  writeSession(user);
  clearPendingSignup();
  return { user };
}

export function mockSignOut(): void {
  clearDemoPortfolioSession();
  clearPendingSignup();
  clearSession();
}
