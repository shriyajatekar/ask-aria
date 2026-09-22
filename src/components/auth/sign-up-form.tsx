"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  AuthButton,
  AuthHeader,
  AuthInput,
  AuthIntroPanel,
  AuthLayout,
  RedirectIfAuthenticated,
} from "@/components/auth";
import { useAuth } from "@/contexts/auth-provider";
import { validateSignUp } from "@/lib/auth/validation";

export function SignUpForm() {
  const router = useRouter();
  const { startSignUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validationError = validateSignUp({ name, email, password, company });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setLoading(true);
    const error = await startSignUp({
      name: name.trim(),
      email: email.trim(),
      password,
      company: company.trim(),
    });
    setLoading(false);

    if (error) {
      setFormError(error);
      return;
    }

    router.push("/role-selection");
  }

  return (
    <RedirectIfAuthenticated>
      <AuthLayout intro={<AuthIntroPanel />}>
        <AuthHeader
          title="Create your workspace"
          description="Connect your commerce data and start finding answers faster."
        />

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <AuthInput
            label="Full name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={loading}
          />
          <AuthInput
            label="Work email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
          />
          <AuthInput
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="At least 8 characters"
            disabled={loading}
          />
          <AuthInput
            label="Company / Organization"
            name="company"
            autoComplete="organization"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            disabled={loading}
          />

          {formError ? (
            <p className="type-small text-error" role="alert">
              {formError}
            </p>
          ) : null}

          <AuthButton
            type="submit"
            loading={loading}
            loadingLabel="Creating workspace…"
          >
            Create workspace
          </AuthButton>
        </form>

        <p className="mt-8 text-center type-body text-text-secondary">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="type-body-medium text-accent-interactive underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive"
          >
            Sign in
          </Link>
        </p>
      </AuthLayout>
    </RedirectIfAuthenticated>
  );
}
