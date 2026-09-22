import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function CaseStudyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background-secondary text-text-primary">
      {children}
    </div>
  );
}

export function CaseStudyHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background-secondary/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
        <span className="type-label text-text-tertiary">Commerce Intelligence</span>
        <span className="type-small text-text-secondary">Portfolio · Ask Aria</span>
      </div>
    </header>
  );
}

export function CaseStudySection({
  id,
  eyebrow,
  title,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("border-b border-border/60 py-16 md:py-20", className)}
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {eyebrow ? (
          <p className="type-label tracking-wide text-text-tertiary uppercase">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h2 className="mt-3 type-h2 text-balance text-text-primary">{title}</h2>
        ) : null}
        <div className={cn(title || eyebrow ? "mt-8" : "")}>{children}</div>
      </div>
    </section>
  );
}

export function LeadQuote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "type-h3 font-medium leading-snug text-balance text-text-primary",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function BodyCopy({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("type-body leading-relaxed text-text-secondary", className)}>
      {children}
    </p>
  );
}

export function VerticalFlow({
  steps,
  caption,
}: {
  steps: string[];
  caption?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white px-5 py-6">
      <ol className="space-y-0">
        {steps.map((step, i) => (
          <li key={step} className="flex flex-col items-center">
            <span className="w-full rounded-lg border border-border bg-background-secondary px-4 py-2.5 text-center type-small text-text-primary">
              {step}
            </span>
            {i < steps.length - 1 ? (
              <span className="my-1 type-label text-text-tertiary" aria-hidden>
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {caption ? (
        <p className="mt-6 text-center type-body font-medium text-text-primary">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

export function HorizontalCompare({
  before,
  after,
}: {
  before: { label: string; detail: string };
  after: { label: string; detail: string };
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-white p-5">
        <p className="type-label text-text-tertiary">Before</p>
        <p className="mt-2 type-body font-medium text-text-primary">{before.label}</p>
        <p className="mt-2 type-small text-text-secondary">{before.detail}</p>
      </div>
      <div className="rounded-xl border border-border bg-white p-5 ring-1 ring-black/5">
        <p className="type-label text-text-tertiary">After</p>
        <p className="mt-2 type-body font-medium text-text-primary">{after.label}</p>
        <p className="mt-2 type-small text-text-secondary">{after.detail}</p>
      </div>
    </div>
  );
}

export function ProgressionList({
  items,
}: {
  items: { title: string; example: string }[];
}) {
  return (
    <ol className="relative space-y-0">
      {items.map((item, i) => (
        <li key={item.title} className="relative flex gap-4 pb-10 last:pb-0">
          {i < items.length - 1 ? (
            <span
              className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border"
              aria-hidden
            />
          ) : null}
          <span
            className="relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-white type-label text-text-secondary"
            aria-hidden
          >
            {i + 1}
          </span>
          <div>
            <p className="type-body font-medium text-text-primary">{item.title}</p>
            <p className="mt-1 type-small italic text-text-secondary">
              &ldquo;{item.example}&rdquo;
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SubtleSimLabel() {
  return (
    <span className="type-label text-text-tertiary">
      · illustrative / simulated in prototype
    </span>
  );
}
