import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

function MockPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-accent-subtle px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-accent-interactive" aria-hidden />
        <span className="type-label text-text-primary">Aria</span>
        {title ? (
          <span className="type-small text-text-tertiary">· {title}</span>
        ) : null}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

function MockUserBubble({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-background-secondary px-3 py-2 type-small text-text-primary">
      {children}
    </p>
  );
}

function MockMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 type-small">
      <span className="text-text-tertiary">{label}</span>
      <span className="text-right text-text-primary">{value}</span>
    </div>
  );
}

export function MockAmbiguityFlow() {
  return (
    <MockPanel title="Clarification">
      <MockUserBubble>Why is Amazon bad?</MockUserBubble>
      <p className="type-small text-text-secondary">
        I can look at a few signals — which matters most right now?
      </p>
      <div className="flex flex-wrap gap-2">
        {["Revenue", "ROAS", "Conversion", "Traffic"].map((opt) => (
          <span
            key={opt}
            className="rounded-md border border-border bg-background-secondary px-2.5 py-1 type-small text-text-primary"
          >
            {opt}
          </span>
        ))}
      </div>
      <p className="type-label text-text-tertiary">User chooses → analysis continues</p>
    </MockPanel>
  );
}

export function MockTrustInsight() {
  return (
    <MockPanel title="Insight">
      <p className="type-body font-medium text-text-primary">
        ROAS softened as conversion lagged spend.
      </p>
      <div className="rounded-lg border border-border bg-background-secondary/50 p-3 space-y-2">
        <p className="type-label text-text-tertiary">Evidence</p>
        <div className="grid grid-cols-2 gap-2 type-small">
          <span className="text-text-secondary">Gross sales</span>
          <span className="text-right text-text-primary">−4%</span>
          <span className="text-text-secondary">Orders</span>
          <span className="text-right text-text-primary">−6%</span>
          <span className="text-text-secondary">Conversion</span>
          <span className="text-right text-text-primary">−11%</span>
          <span className="text-text-secondary">Platform movement</span>
          <span className="text-right text-text-primary">Spend +23%</span>
        </div>
      </div>
      <div className="space-y-1 border-t border-border pt-3">
        <MockMetaRow label="Period" value="06 Sep – 30 Sep vs prior" />
        <MockMetaRow label="Scope" value="Amazon · Hair Care" />
        <MockMetaRow label="Source" value="Connected commerce data" />
      </div>
    </MockPanel>
  );
}

export function MockActionChain() {
  const steps = [
    "Insight",
    "Create report",
    "Google Docs",
    "Email draft",
    "Review",
    "Confirm",
    "Send",
    "Monitor",
    "Trigger",
    "Investigate",
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 type-small text-text-secondary">
      {steps.map((s, i) => (
        <span key={s} className="flex items-center gap-1">
          <span className="rounded border border-border bg-white px-2 py-0.5 text-text-primary">
            {s}
          </span>
          {i < steps.length - 1 ? <span className="text-text-tertiary">↓</span> : null}
        </span>
      ))}
    </div>
  );
}

export function MockFlow01SalesChange() {
  return (
    <MockPanel title="FLOW 01">
      <MockUserBubble>Why did sales change?</MockUserBubble>
      <p className="type-body font-medium text-text-primary">
        Three factors contributed to the shift.
      </p>
      <ul className="list-inside list-disc type-small text-text-secondary">
        <li>Buy Box visibility on two SKUs</li>
        <li>Conversion softened while spend rose</li>
        <li>Category mix shifted toward lower-AOV items</li>
      </ul>
    </MockPanel>
  );
}

export function MockFlow02WeeklyReport() {
  return (
    <MockPanel title="FLOW 02">
      <MockUserBubble>Create a weekly performance report.</MockUserBubble>
      <div className="rounded-lg border border-dashed border-border p-3 type-small">
        <p className="font-medium text-text-primary">Google Docs</p>
        <p className="mt-1 text-text-secondary">
          Draft outline ready — confirm to create in your workspace.
        </p>
        <p className="mt-2 type-label text-text-tertiary">Confirm · Cancel</p>
      </div>
      <p className="type-small text-text-secondary">
        Result: document link returned in conversation.
      </p>
    </MockPanel>
  );
}

export function MockFlow03Spreadsheet() {
  return (
    <MockPanel title="FLOW 03">
      <MockUserBubble>
        Create a spreadsheet of underperforming products.
      </MockUserBubble>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-3 gap-px bg-border type-label text-text-tertiary">
          <div className="bg-background-secondary px-2 py-1">SKU</div>
          <div className="bg-background-secondary px-2 py-1">ROAS</div>
          <div className="bg-background-secondary px-2 py-1">Trend</div>
          <div className="bg-white px-2 py-1 text-text-primary">···</div>
          <div className="bg-white px-2 py-1 text-text-primary">2.1</div>
          <div className="bg-white px-2 py-1 text-text-primary">↓</div>
        </div>
      </div>
      <p className="type-small text-text-secondary">Sheets preview → shared file</p>
    </MockPanel>
  );
}

export function MockFlow04Email() {
  return (
    <MockPanel title="FLOW 04">
      <MockUserBubble>Email it to the KAM team.</MockUserBubble>
      <div className="space-y-2 type-small">
        <p className="text-text-secondary">
          <span className="text-text-tertiary">To:</span> kam-team@…
        </p>
        <p className="rounded border border-border bg-background-secondary p-2 text-text-primary">
          Subject: Weekly performance summary…
        </p>
        <p className="type-label text-text-tertiary">
          Draft → Review → Confirm → Send
        </p>
      </div>
    </MockPanel>
  );
}

export function MockFlow05Monitor() {
  return (
    <MockPanel title="FLOW 05">
      <MockUserBubble>Let me know if Amazon ROAS drops below 3.</MockUserBubble>
      <div className="rounded-lg border border-border bg-background-secondary/40 p-3 type-small">
        <p className="text-text-primary">
          Monitor saved{" "}
          <span className="text-text-tertiary">(simulated in prototype)</span>
        </p>
        <p className="mt-2 text-text-secondary">
          Trigger → notification → &ldquo;Investigate&rdquo; opens contextual
          thread
        </p>
      </div>
    </MockPanel>
  );
}

export function MockPermissions() {
  return (
    <div className="rounded-xl border border-border bg-white divide-y divide-border">
      {[
        { tool: "Google Docs", state: "Connected", ok: true },
        { tool: "Google Sheets", state: "Connected", ok: true },
        { tool: "Gmail", state: "Requires connection", ok: false },
      ].map((row) => (
        <div
          key={row.tool}
          className="flex items-center justify-between px-4 py-3 type-small"
        >
          <span className="text-text-primary">{row.tool}</span>
          <span
            className={cn(
              "type-label",
              row.ok ? "text-text-secondary" : "text-text-tertiary",
            )}
          >
            {row.state}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MockHitlMatrix() {
  const rows = [
    { action: "Read", confirm: "No confirmation" },
    { action: "Analyze", confirm: "No confirmation" },
    { action: "Create draft", confirm: "No confirmation" },
    { action: "Create external artifact", confirm: "Confirmation where appropriate" },
    { action: "Send / modify / execute", confirm: "Explicit confirmation" },
    { action: "Monitor", confirm: "Confirmation" },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="grid grid-cols-2 gap-px bg-border type-label text-text-tertiary">
        <div className="bg-background-secondary px-4 py-2">Action</div>
        <div className="bg-background-secondary px-4 py-2">Confirmation</div>
        {rows.map((row) => (
          <div key={row.action} className="contents">
            <div className="bg-white px-4 py-2.5 type-small text-text-primary">
              {row.action}
            </div>
            <div className="bg-white px-4 py-2.5 type-small text-text-secondary">
              {row.confirm}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
