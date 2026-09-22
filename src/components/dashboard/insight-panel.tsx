"use client";

import { PLATFORM_BY_ID } from "@/data/platforms";
import { SYNTHETIC_ANOMALIES, SYNTHETIC_INSIGHTS } from "@/lib/analytics";
import { formatPercentChange } from "@/lib/dashboard/format-metric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export function InsightPanel() {
  const items = [
    ...SYNTHETIC_INSIGHTS.slice(0, 3).map((insight) => ({
      id: insight.id,
      title: insight.title,
      subtitle: PLATFORM_BY_ID[insight.platformId]?.name ?? insight.platformId,
      change: insight.change,
      body:
        insight.contributors.length > 0
          ? insight.contributors
              .slice(0, 2)
              .map(
                (contributor) =>
                  `${contributor.metric.replaceAll("_", " ")} ${formatPercentChange(contributor.change)}`,
              )
              .join(" · ")
          : "Structured evidence from the analytics layer.",
      action: "Investigate",
      tone: insight.change < 0 ? "negative" : "neutral",
    })),
    ...SYNTHETIC_ANOMALIES.slice(0, 1).map((anomaly) => ({
      id: anomaly.id,
      title: anomaly.description.split(".")[0] ?? "Anomaly detected",
      subtitle: PLATFORM_BY_ID[anomaly.platformId]?.name ?? anomaly.platformId,
      change: -Math.abs(anomaly.magnitude),
      body: anomaly.description,
      action: anomaly.metric.includes("stock") ? "View products" : "Investigate",
      tone: "negative" as const,
    })),
  ];

  return (
    <section aria-labelledby="insights-heading">
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border-subtle px-4 py-3">
          <CardTitle id="insights-heading" className="type-h3">
            What&apos;s changing
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border-subtle p-0">
          {items.map((item) => (
            <article key={item.id} className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="type-body-medium text-text-primary">{item.title}</h3>
                  <p className="type-small text-text-tertiary">{item.subtitle}</p>
                </div>
                <span
                  className={cn(
                    "type-label tabular-nums",
                    item.tone === "negative" ? "text-error" : "text-text-secondary",
                  )}
                >
                  {formatPercentChange(item.change)}
                </span>
              </div>
              <p className="mt-2 type-small text-text-secondary">{item.body}</p>
              <Button variant="secondary" size="sm" className="mt-2">
                {item.action}
              </Button>
            </article>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
