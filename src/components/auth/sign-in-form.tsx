"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  AuthHeader,
  AuthIntroPanel,
  AuthLayout,
  DemoUserCard,
  RedirectIfAuthenticated,
} from "@/components/auth";
import { useAuth } from "@/contexts/auth-provider";
import { DEMO_USERS } from "@/lib/auth/demo-users";
import { fetchGoogleWorkspaceStatus } from "@/components/dashboard/ask-aria/ask-aria-google-client";

export function SignInForm() {
  const { signInDemo } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [demoLoadingId, setDemoLoadingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchGoogleWorkspaceStatus().then(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("googleWorkspace") === "connected") {
        setInfoMessage(
          "Google Workspace connected. Choose a demo role below to enter the app.",
        );
        params.delete("googleWorkspace");
        const next = params.toString();
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}${next ? `?${next}` : ""}`,
        );
      }
      if (params.get("googleSignIn") === "attempted") {
        setInfoMessage(
          "App sign-in with Google is separate from Workspace connect. Choose a demo role below, then connect Google from Ask Aria.",
        );
        params.delete("googleSignIn");
        const next = params.toString();
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}${next ? `?${next}` : ""}`,
        );
      }
    });
  }, []);

  function handleDemoSelect(demoUserId: string) {
    setFormError(null);
    setDemoLoadingId(demoUserId);
    signInDemo(demoUserId);
  }

  return (
    <RedirectIfAuthenticated>
      <AuthLayout intro={<AuthIntroPanel />}>
        <AuthHeader
          eyebrow="CONCEPTUAL CASE STUDY"
          title="Welcome back"
          description="Explore Commerce Intelligence through different roles."
        />

        {formError ? (
          <p className="mb-4 type-small text-error" role="alert">
            {formError}
          </p>
        ) : null}
        {infoMessage ? (
          <p className="mb-4 type-small text-text-secondary" role="status">
            {infoMessage}
          </p>
        ) : null}

        <p className="type-label text-text-secondary">Continue as</p>
        <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Demo personas">
          {DEMO_USERS.map((demoUser) => (
            <DemoUserCard
              key={demoUser.id}
              name={demoUser.name}
              roleLabel={demoUser.roleLabel}
              disabled={demoLoadingId !== null}
              loading={demoLoadingId === demoUser.id}
              onSelect={() => handleDemoSelect(demoUser.id)}
            />
          ))}
        </div>

        <p className="mt-8 text-center type-body text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="type-body-medium text-accent-interactive underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive"
          >
            Sign up
          </Link>
        </p>
      </AuthLayout>
    </RedirectIfAuthenticated>
  );
}
