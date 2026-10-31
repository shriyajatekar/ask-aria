"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileText, Mail, Sheet, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-provider";

import { useAskAria } from "./ask-aria-context";

/**
 * Simulated "Connect Google Workspace" flow for the public demo: choose an
 * account → review permissions → connected. It shows how the real step would
 * feel without touching anyone's Google account, and says so on every screen.
 * Deliberately styled as Ask Aria, not as Google's own sign-in page.
 */
export function AskAriaDemoConnect() {
  const { demoConnectOpen, closeDemoConnect, completeDemoConnect } = useAskAria();
  const { user } = useAuth();
  const [step, setStep] = useState<"account" | "permissions" | "done">("account");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Each step moves focus to its heading so screen readers announce it.
  useEffect(() => {
    if (demoConnectOpen) headingRef.current?.focus();
  }, [demoConnectOpen, step]);

  if (!demoConnectOpen) return null;

  const close = () => {
    setStep("account");
    closeDemoConnect();
  };
  const finish = () => {
    setStep("account");
    completeDemoConnect();
  };
  const email = user?.email ?? "you@demo.commerce-intelligence.io";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-connect-heading"
      className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/20 p-4 motion-safe:animate-enter"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-4 shadow-md">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-sm bg-accent-subtle px-1.5 py-0.5 type-small text-accent-interactive">
            Demo · no real Google account is used
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Cancel connecting"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-hover"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {step === "account" ? (
          <>
            <h3 id="demo-connect-heading" ref={headingRef} tabIndex={-1} className="mt-3 type-h3 outline-none">
              Connect Google Workspace
            </h3>
            <p className="mt-1 type-small">Choose the account Ask Aria should create reports in.</p>
            <button
              type="button"
              onClick={() => setStep("permissions")}
              className="mt-3 flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left hover:bg-surface-hover"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle type-label text-accent-interactive"
                aria-hidden
              >
                {(user?.name ?? "Y").slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block type-body-medium">{user?.name ?? "You"}</span>
                <span className="block truncate type-small">{email}</span>
              </span>
            </button>
            <p className="mt-2 type-small text-text-tertiary">
              In the real product this is Google&apos;s own sign-in screen.
            </p>
          </>
        ) : step === "permissions" ? (
          <>
            <h3 id="demo-connect-heading" ref={headingRef} tabIndex={-1} className="mt-3 type-h3 outline-none">
              Ask Aria would like to
            </h3>
            <ul className="mt-2 space-y-2">
              {[
                { icon: FileText, text: "Create Google Docs for reports" },
                { icon: Sheet, text: "Create Google Sheets for exports" },
                { icon: Mail, text: "Send email you've confirmed" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 type-body">
                  <Icon className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
            <p className="mt-2 type-small">
              Ask Aria only creates or sends something after you confirm it. You can disconnect any time
              in Tools.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={close}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={() => setStep("done")}>
                Allow
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 id="demo-connect-heading" ref={headingRef} tabIndex={-1} className="mt-3 flex items-center gap-2 type-h3 outline-none">
              <Check className="h-5 w-5 text-accent-interactive" aria-hidden />
              Connected
            </h3>
            <p className="mt-1 type-small">
              {email} is connected (demo). Continue to review what Aria will create.
            </p>
            <div className="mt-3 flex justify-end">
              <Button type="button" size="sm" onClick={finish}>
                Continue
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
