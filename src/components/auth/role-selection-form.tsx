"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, BriefcaseBusiness, Building2 } from "lucide-react";

import {
  AuthButton,
  AuthHeader,
  AuthLayout,
  RedirectIfAuthenticated,
  RoleCard,
} from "@/components/auth";
import { useAuth } from "@/contexts/auth-provider";
import { readPendingSignup } from "@/lib/auth/storage";
import type { UserRole } from "@/lib/auth/types";

const ROLE_OPTIONS: {
  role: UserRole;
  title: string;
  description: string;
  icon: typeof BarChart3;
}[] = [
  {
    role: "ANALYST",
    title: "Analyst",
    description:
      "Investigate performance, explore metrics and find answers faster.",
    icon: BarChart3,
  },
  {
    role: "KAM",
    title: "Key Account Manager",
    description:
      "Monitor multiple accounts, identify opportunities and prepare client-ready insights.",
    icon: BriefcaseBusiness,
  },
  {
    role: "CXO",
    title: "CXO",
    description:
      "See the business picture across brands, channels and markets.",
    icon: Building2,
  },
];

export function RoleSelectionForm() {
  const router = useRouter();
  const { completeSignUp } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const pending = readPendingSignup();
    if (!pending) {
      router.replace("/sign-up");
      return;
    }
    setReady(true);
  }, [router]);

  async function handleContinue() {
    if (!selectedRole) {
      setFormError("Select how you will use Commerce Intelligence.");
      return;
    }

    setFormError(null);
    setLoading(true);
    const error = await completeSignUp(selectedRole);
    setLoading(false);
    if (error) setFormError(error);
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="type-body text-text-secondary">Loading…</p>
      </div>
    );
  }

  return (
    <RedirectIfAuthenticated>
      <AuthLayout
        intro={
          <div className="space-y-6">
            <p className="type-label uppercase tracking-wide text-text-tertiary">
              Commerce Intelligence
            </p>
            <h1 className="type-h1 max-w-md">Personalize your workspace</h1>
            <p className="max-w-md type-body text-text-secondary">
              Your role helps us prioritize the views and workflows you see
              first. You can refine this later in settings.
            </p>
          </div>
        }
      >
        <AuthHeader title="How will you use Commerce Intelligence?" />

        <div className="space-y-3" role="group" aria-label="Select your role">
          {ROLE_OPTIONS.map((option) => (
            <RoleCard
              key={option.role}
              title={option.title}
              description={option.description}
              icon={option.icon}
              selected={selectedRole === option.role}
              onSelect={() => {
                setSelectedRole(option.role);
                setFormError(null);
              }}
            />
          ))}
        </div>

        {formError ? (
          <p className="mt-4 type-small text-error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="mt-8">
          <AuthButton
            type="button"
            onClick={handleContinue}
            loading={loading}
            loadingLabel="Continuing…"
            disabled={!selectedRole}
          >
            Continue
          </AuthButton>
        </div>
      </AuthLayout>
    </RedirectIfAuthenticated>
  );
}
