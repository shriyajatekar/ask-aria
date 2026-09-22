"use client";

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { PLATFORM_BY_ID } from "@/data/platforms";
import type { AriaMonitor } from "@/lib/ask-aria/monitors";
import {
  formatMonitorCondition,
  formatMonitorFrequency,
} from "@/lib/ask-aria/monitors";

import { useAskAria } from "./ask-aria-context";

export function AskAriaMonitorsPanel() {
  const {
    monitors,
    pauseMonitorById,
    resumeMonitorById,
    deleteMonitorById,
    simulateMonitorTrigger,
    runProactivePrompt,
    isSubmitting,
  } = useAskAria();

  const active = useMemo(
    () => monitors.filter((m) => m.status !== "paused"),
    [monitors],
  );

  if (!monitors.length) {
    return (
      <div className="space-y-4 px-1 py-2">
        <p className="type-small text-text-secondary">
          No monitors yet. Background checks are{" "}
          <span className="font-medium text-text-primary">simulated</span> in
          this prototype — nothing runs on a schedule.
        </p>
        <ul className="list-disc space-y-1 pl-5 type-small text-text-secondary">
          <li>Alert when Amazon ROAS falls below 3</li>
          <li>Monitor Flipkart sales below ₹10L</li>
          <li>Watch orders change below -10%</li>
        </ul>
        <Button
          type="button"
          size="sm"
          disabled={isSubmitting}
          onClick={() =>
            runProactivePrompt(
              "Monitor Amazon ROAS and alert me if it falls below 3",
            )
          }
        >
          Create monitor
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-1 py-2">
      <p className="type-small text-text-secondary">
        Simulated monitoring — use{" "}
        <span className="font-medium text-text-primary">Simulate trigger</span>{" "}
        to demo alerts with live dashboard numbers. No cron, push, or email
        automation.
      </p>
      <ul className="space-y-2">
        {monitors.map((monitor) => (
          <MonitorRow
            key={monitor.id}
            monitor={monitor}
            onPause={() => pauseMonitorById(monitor.id)}
            onResume={() => resumeMonitorById(monitor.id)}
            onDelete={() => deleteMonitorById(monitor.id)}
            onSimulate={() => simulateMonitorTrigger(monitor.id)}
          />
        ))}
      </ul>
      {active.length === 0 ? (
        <p className="type-small text-text-tertiary">
          All monitors are paused.
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={isSubmitting}
        onClick={() =>
          runProactivePrompt(
            "Monitor Amazon ROAS and alert me if it falls below 3",
          )
        }
      >
        Create monitor
      </Button>
    </div>
  );
}

function MonitorRow({
  monitor,
  onPause,
  onResume,
  onDelete,
  onSimulate,
}: {
  monitor: AriaMonitor;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onSimulate: () => void;
}) {
  const statusLabel =
    monitor.status === "triggered"
      ? "Triggered (demo)"
      : monitor.status === "paused"
        ? "Paused"
        : "Active";

  return (
    <li className="rounded-md border border-border px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="type-small font-medium text-text-primary">
            {formatMonitorCondition(monitor)}
          </p>
          <p className="type-small text-text-tertiary">
            {monitor.platformId
              ? PLATFORM_BY_ID[monitor.platformId]?.name ?? monitor.platformId
              : "All platforms"}{" "}
            · {formatMonitorFrequency(monitor.frequency).split(" (")[0]} ·{" "}
            {statusLabel}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {monitor.status === "paused" ? (
          <Button type="button" size="sm" variant="secondary" onClick={onResume}>
            Resume
          </Button>
        ) : (
          <Button type="button" size="sm" variant="secondary" onClick={onPause}>
            Pause
          </Button>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={onDelete}>
          Delete
        </Button>
        <Button type="button" size="sm" onClick={onSimulate}>
          Simulate trigger
        </Button>
      </div>
    </li>
  );
}
