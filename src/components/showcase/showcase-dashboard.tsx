"use client";

import { cn } from "@/lib/cn";

import {
  SHOWCASE_CHANNELS,
  SHOWCASE_FLIPKART_ROAS,
  SHOWCASE_KPIS,
  SHOWCASE_PERIODS,
} from "./showcase-data";

export function ShowcaseDashboard({
  highlightFlipkart,
}: {
  highlightFlipkart: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 lg:p-4">
      <p className="type-label text-text-tertiary">
        Conceptual redesign · An evolved dashboard concept demonstrating how
        contextual conversational intelligence can be embedded directly into an
        enterprise analytics workflow.
      </p>

      <section className="rounded-xl border border-border bg-white px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex gap-1.5">
            <span className="rounded-md bg-accent-interactive px-2.5 py-1 type-label text-white">
              Summary
            </span>
            <span className="rounded-md border border-border px-2.5 py-1 type-label text-text-secondary">
              Comparison
            </span>
          </div>
          <div className="flex items-center gap-2 type-small text-text-secondary">
            <span className="type-label text-text-tertiary">Current Period</span>
            <span className="rounded-md border border-border bg-background-secondary px-2 py-1 tabular-nums">
              {SHOWCASE_PERIODS.current}
            </span>
            <span className="type-label text-text-tertiary">VS</span>
            <span className="type-label text-text-tertiary">
              Comparison Period
            </span>
            <span className="rounded-md border border-border bg-background-secondary px-2 py-1 tabular-nums">
              {SHOWCASE_PERIODS.comparison}
            </span>
          </div>
          <div className="ml-auto flex gap-2">
            {["Platform", "Brand", "Filters"].map((label) => (
              <span
                key={label}
                className="rounded-md border border-border px-2 py-1 type-label text-text-secondary"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-1.5 type-small text-text-secondary">
          All brands · All categories · All sub-categories · All products
        </p>
      </section>

      <section className="min-h-0 flex-1 rounded-xl border border-border bg-white shadow-sm">
        <div className="border-b border-border-subtle px-3 py-2">
          <h2 className="type-h3">Metric Trends</h2>
        </div>
        <div className="space-y-3 p-3">
          <div>
            <p className="mb-2 type-label font-medium text-text-primary">
              Frequently used metrics
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {SHOWCASE_KPIS.map((name, index) => (
                <div
                  key={name}
                  className={cn(
                    "rounded-md border px-2 py-2",
                    index === 3
                      ? "border-accent-interactive bg-background-secondary ring-1 ring-accent-interactive/20"
                      : "border-border bg-white",
                  )}
                >
                  <p className="type-label text-text-secondary">{name}</p>
                  <p className="mt-0.5 type-metric text-[15px] text-text-primary">
                    {index === 3 ? "24.2%" : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "rounded-lg border border-border-subtle bg-background-secondary/40 p-3 transition-shadow",
              highlightFlipkart &&
                "ring-2 ring-accent-primary ring-offset-2 ring-offset-white",
            )}
          >
            <p className="type-label text-text-tertiary">
              Platform performance · current period
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <PlatformMetricCard
                name="Flipkart"
                metric="ROAS"
                from="₹4.8"
                to="₹3.9"
                change="↓ 18%"
                emphasized={highlightFlipkart}
              />
              <PlatformMetricCard
                name="Amazon"
                metric="ROAS"
                from="₹3.4"
                to="₹3.6"
                change="↑ 6%"
              />
              <PlatformMetricCard
                name="Myntra"
                metric="ROAS"
                from="₹2.9"
                to="₹2.8"
                change="↓ 3%"
              />
            </div>
            <svg
              viewBox="0 0 480 120"
              className="mt-4 h-28 w-full text-text-primary"
              role="img"
              aria-label="Platform trend chart"
            >
              <line x1="40" x2="460" y1="100" y2="100" stroke="#E6E8EF" />
              {[0, 1, 2, 3, 4].map((index) => {
                const x = 40 + index * 105;
                const hFlip = [72, 68, 58, 52, 48][index];
                const hAmz = [44, 46, 48, 50, 52][index];
                return (
                  <g key={index}>
                    <rect
                      x={x}
                      y={100 - hFlip}
                      width={28}
                      height={hFlip}
                      fill="#111827"
                      rx={2}
                    />
                    <rect
                      x={x + 34}
                      y={100 - hAmz}
                      width={28}
                      height={hAmz}
                      fill="#737887"
                      rx={2}
                    />
                  </g>
                );
              })}
              <text x="40" y="118" className="fill-[#737887] text-[10px]">
                Flipkart vs Amazon (weekly)
              </text>
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlatformMetricCard({
  name,
  metric,
  from,
  to,
  change,
  emphasized = false,
}: {
  name: string;
  metric: string;
  from: string;
  to: string;
  change: string;
  emphasized?: boolean;
}) {
  const isDown = change.includes("↓");
  return (
    <div
      className={cn(
        "rounded-lg border bg-white px-3 py-2",
        emphasized ? "border-accent-primary/40" : "border-border",
      )}
    >
      <p className="type-label text-text-secondary">{name}</p>
      <p className="mt-1 type-small text-text-tertiary">{metric}</p>
      <p className="mt-1 flex items-baseline gap-2 type-body tabular-nums">
        <span>{from}</span>
        <span className="text-text-tertiary">→</span>
        <span className="font-medium">{to}</span>
        <span
          className={cn(
            "type-small",
            isDown ? "text-error" : "text-success",
          )}
        >
          {change}
        </span>
      </p>
    </div>
  );
}

export function ShowcaseChannelTabs({
  activeChannel,
  onChannelChange,
}: {
  activeChannel: string;
  onChannelChange: (channel: string) => void;
}) {
  return (
    <div className="overflow-x-auto border-b border-border bg-white">
      <div
        className="flex h-11 min-w-max items-center gap-1 px-4 lg:px-6"
        role="tablist"
      >
        {SHOWCASE_CHANNELS.map((channel) => (
          <button
            key={channel}
            type="button"
            role="tab"
            aria-selected={activeChannel === channel}
            onClick={() => onChannelChange(channel)}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 type-label transition-colors",
              activeChannel === channel
                ? "bg-accent-interactive text-white"
                : "text-text-secondary hover:bg-surface-hover",
            )}
          >
            {channel}
          </button>
        ))}
      </div>
    </div>
  );
}
