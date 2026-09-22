"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  mockCompleteSignUp,
  mockSignIn,
  mockSignInDemo,
  mockSignOut,
  mockStartSignUp,
} from "@/lib/auth/mock-auth";
import { getDashboardPathForRole } from "@/lib/auth/role-utils";
import {
  beginDemoPortfolioSession,
  getDemoPortfolioSessionId,
  isDemoPortfolioUser,
} from "@/components/dashboard/ask-aria/ask-aria-user-scope";
import { syncAppSessionCookie } from "@/lib/auth/app-session-client";
import { readSession } from "@/lib/auth/storage";
import type { PendingSignup, User, UserRole } from "@/lib/auth/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInDemo: (demoUserId: string) => void;
  startSignUp: (pending: PendingSignup) => Promise<string | null>;
  completeSignUp: (role: UserRole) => Promise<string | null>;
  signOut: () => void;
  redirectForUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = readSession();
    if (session && isDemoPortfolioUser(session.id) && !getDemoPortfolioSessionId()) {
      beginDemoPortfolioSession();
    }
    setUser(session);
    void syncAppSessionCookie(session?.id ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void syncAppSessionCookie(user?.id ?? null);
  }, [user, isLoading]);

  const redirectForUser = useCallback(
    (sessionUser: User) => {
      router.push(getDashboardPathForRole(sessionUser.role));
    },
    [router],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await mockSignIn(email, password);
      if ("error" in result) return result.error;
      setUser(result.user);
      redirectForUser(result.user);
      return null;
    },
    [redirectForUser],
  );

  const signInDemo = useCallback(
    (demoUserId: string) => {
      const sessionUser = mockSignInDemo(demoUserId);
      if (!sessionUser) return;
      setUser(sessionUser);
      redirectForUser(sessionUser);
    },
    [redirectForUser],
  );

  const startSignUp = useCallback(async (pending: PendingSignup) => {
    const result = await mockStartSignUp(pending);
    if ("error" in result) return result.error;
    return null;
  }, []);

  const completeSignUp = useCallback(
    async (role: UserRole) => {
      const result = await mockCompleteSignUp(role);
      if ("error" in result) return result.error;
      setUser(result.user);
      redirectForUser(result.user);
      return null;
    },
    [redirectForUser],
  );

  const signOut = useCallback(() => {
    mockSignOut();
    setUser(null);
    router.push("/sign-in");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signInDemo,
      startSignUp,
      completeSignUp,
      signOut,
      redirectForUser,
    }),
    [
      user,
      isLoading,
      signIn,
      signInDemo,
      startSignUp,
      completeSignUp,
      signOut,
      redirectForUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
