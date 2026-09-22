"use client";

import { useEffect, useMemo, useState } from "react";

import { Check, ChevronLeft, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/auth-provider";

import { startGoogleOAuthFlow } from "./ask-aria-google-client";
import { useAskAria } from "./ask-aria-context";
import { AskAriaMonitorsPanel } from "./ask-aria-monitors-panel";
import {
  connectDemoWorkspace,
  isDemoWorkspaceConnected,
  isGoogleWorkspaceEffectivelyConnected,
  type DemoWorkspaceTool,
} from "./ask-aria-tools-storage";

type ToolStatus = "connected" | "available" | "coming_soon";

interface ToolItem {
  id: string;
  label: string;
  status: ToolStatus;
  detailView?: DemoWorkspaceTool;
}

interface ToolCategory {
  id: string;
  label: string;
  items: ToolItem[];
}

function statusLabel(status: ToolStatus): string {
  if (status === "connected") return "Connected";
  if (status === "available") return "Available";
  return "Coming soon";
}

export function AskAriaToolsSheet() {
  const {
    toolsSheetOpen,
    closeToolsSheet,
    toolsSheetFocus,
    setToolsConnectedTick,
    googleOAuthConfigured,
    googleOAuthConnected,
    googleOAuthDocsConnected,
    googleOAuthSheetsConnected,
    googleOAuthGmailConnected,
    refreshGoogleWorkspaceStatus,
  } = useAskAria();
  const { user } = useAuth();
  const [detail, setDetail] = useState<DemoWorkspaceTool | null>(null);
  const [connectedTick, setConnectedTick] = useState(0);

  useEffect(() => {
    if (!toolsSheetOpen) {
      setDetail(null);
      return;
    }
    void refreshGoogleWorkspaceStatus();
    if (toolsSheetFocus) {
      setDetail(toolsSheetFocus);
    }
  }, [toolsSheetOpen, toolsSheetFocus, refreshGoogleWorkspaceStatus]);

  const googleConnected = isGoogleWorkspaceEffectivelyConnected(
    googleOAuthConnected,
    googleOAuthConfigured,
    user?.id,
  );
  const microsoftConnected = isDemoWorkspaceConnected(
    "microsoft_365",
    user?.id,
  );

  const categories: ToolCategory[] = useMemo(
    () => [
      {
        id: "commerce",
        label: "Commerce",
        items: [
          { id: "ci", label: "Commerce Intelligence", status: "connected" },
          {
            id: "amazon-ads",
            label: "Amazon Ads (read-only demo)",
            status: "connected",
          },
          {
            id: "monitoring",
            label: "Monitoring (simulated)",
            status: "connected",
            detailView: "monitoring",
          },
        ],
      },
      {
        id: "workspace",
        label: "Workspace",
        items: [
          {
            id: "google",
            label: "Google Workspace",
            status: googleConnected ? "connected" : "available",
            detailView: "google_workspace",
          },
          {
            id: "microsoft",
            label: "Microsoft 365",
            status: microsoftConnected ? "connected" : "available",
            detailView: "microsoft_365",
          },
        ],
      },
      {
        id: "communication",
        label: "Communication",
        items: [
          {
            id: "gmail",
            label: "Gmail (send)",
            status:
              googleOAuthGmailConnected || googleConnected
                ? "connected"
                : googleOAuthConfigured
                  ? "available"
                  : "coming_soon",
          },
          { id: "slack", label: "Slack", status: "coming_soon" },
          { id: "teams", label: "Microsoft Teams", status: "coming_soon" },
        ],
      },
      {
        id: "workflow",
        label: "Workflow",
        items: [
          { id: "jira", label: "Jira", status: "coming_soon" },
          { id: "asana", label: "Asana", status: "coming_soon" },
        ],
      },
      {
        id: "storage",
        label: "Storage",
        items: [
          { id: "drive", label: "Google Drive", status: googleConnected ? "connected" : "available" },
          { id: "onedrive", label: "OneDrive", status: microsoftConnected ? "connected" : "available" },
        ],
      },
    ],
    [
      googleConnected,
      googleOAuthConfigured,
      googleOAuthGmailConnected,
      microsoftConnected,
      connectedTick,
    ],
  );

  const anyConnected =
    googleConnected ||
    microsoftConnected ||
    categories.some((category) =>
      category.items.some((item) => item.status === "connected"),
    );

  if (!toolsSheetOpen) return null;

  function handleConnectGoogle() {
    if (!user?.id) return;
    if (googleOAuthConfigured) {
      startGoogleOAuthFlow({
        returnTo: window.location.pathname + window.location.search,
        userId: user.id,
      });
      return;
    }
    connectDemoWorkspace("google_workspace", user.id);
    setConnectedTick((value) => value + 1);
    setToolsConnectedTick((value) => value + 1);
  }

  function handleConnectMicrosoft() {
    if (!user?.id) return;
    connectDemoWorkspace("microsoft_365", user.id);
    setConnectedTick((value) => value + 1);
    setToolsConnectedTick((value) => value + 1);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close connected tools"
        className="fixed inset-0 z-[45] bg-black/20"
        onClick={closeToolsSheet}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-aria-tools-title"
        className="fixed z-[46] bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-white shadow-lg md:left-auto md:right-0 md:top-[var(--ci-header-height,6.25rem)] md:bottom-0 md:max-h-none md:w-full md:max-w-[440px] md:rounded-none md:rounded-t-none md:border-l"
      >
        <header className="sticky top-0 flex items-center justify-between gap-2 border-b border-border-subtle bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            {detail ? (
              <button
                type="button"
                aria-label="Back to tools list"
                className="rounded-sm p-1 text-text-secondary hover:text-text-primary"
                onClick={() => setDetail(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div className="min-w-0">
              <h2 id="ask-aria-tools-title" className="type-h3 truncate">
                {detail === "google_workspace"
                  ? "Google Workspace"
                  : detail === "microsoft_365"
                    ? "Microsoft 365"
                    : detail === "monitoring"
                      ? "Monitoring"
                      : "Connected tools"}
              </h2>
              <p className="type-small text-text-secondary">
                {googleOAuthConfigured
                  ? "Google uses server-side OAuth; Microsoft remains demo-only."
                  : "Demo connections — add Google OAuth env vars for real Docs."}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="rounded-sm p-1 text-text-secondary hover:text-text-primary"
            onClick={closeToolsSheet}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {!anyConnected && !detail ? (
          <p className="border-b border-border-subtle px-5 py-3 type-small text-text-tertiary">
            No external tools connected yet. Connect Google Workspace or Microsoft
            365 to simulate reports, spreadsheets, and email actions.
          </p>
        ) : null}

        {detail === "google_workspace" ? (
          <WorkspaceDetail
            title="Google Workspace"
            connected={googleConnected}
            connectedHint={
              googleOAuthConfigured && googleOAuthConnected
                ? [
                    googleOAuthDocsConnected ? "Docs & Drive connected." : null,
                    googleOAuthSheetsConnected
                      ? "Sheets connected."
                      : googleOAuthDocsConnected
                        ? "Sheets not authorized yet — use Connect Google Sheets when exporting."
                        : null,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Connected with Google OAuth."
                : googleConnected
                  ? "Connected for this browser session (demo)."
                  : undefined
            }
            connectLabel={
              googleOAuthConfigured
                ? "Connect with Google"
                : "Connect Google Workspace"
            }
            onConnect={handleConnectGoogle}
            checklist={[
              googleOAuthDocsConnected
                ? "Docs — connected"
                : "Docs — performance reports & executive summaries",
              googleOAuthSheetsConnected
                ? "Sheets — connected"
                : "Sheets — product exports & declining SKU lists",
              "Gmail — draft and send team updates",
              "Calendar — schedule recurring report delivery",
            ]}
          />
        ) : detail === "microsoft_365" ? (
          <WorkspaceDetail
            title="Microsoft 365"
            connected={microsoftConnected}
            connectLabel="Connect Microsoft 365"
            onConnect={handleConnectMicrosoft}
            checklist={[
              "Word — commerce analysis reports",
              "Excel — spreadsheet exports",
              "Outlook — email drafts and sends",
              "Teams — share summaries (coming soon)",
            ]}
          />
        ) : detail === "monitoring" ? (
          <AskAriaMonitorsPanel />
        ) : (
          <div className="px-5 py-3">
            {categories.map((category) => (
              <section key={category.id} className="mb-5 last:mb-2">
                <p className="type-label text-text-tertiary">{category.label}</p>
                <ul className="mt-2 divide-y divide-border-subtle rounded-md border border-border">
                  {category.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={item.status === "coming_soon"}
                        onClick={() => {
                          if (item.detailView) setDetail(item.detailView);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left",
                          item.status !== "coming_soon" &&
                            item.detailView &&
                            "hover:bg-surface-hover",
                          item.status === "coming_soon" && "opacity-60",
                        )}
                      >
                        <span className="type-small text-text-primary">
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            "type-label shrink-0",
                            item.status === "connected" && "text-success",
                            item.status === "available" && "text-text-tertiary",
                            item.status === "coming_soon" && "text-text-tertiary",
                          )}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function WorkspaceDetail({
  connected,
  connectLabel,
  connectedHint,
  onConnect,
  checklist,
}: {
  title: string;
  connected: boolean;
  connectLabel: string;
  connectedHint?: string;
  onConnect: () => void;
  checklist: string[];
}) {
  return (
    <div className="px-5 py-4">
      <ul className="space-y-2">
        {checklist.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 type-small text-text-secondary"
          >
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-tertiary" />
            {line}
          </li>
        ))}
      </ul>
      {connected ? (
        <p className="mt-4 type-small text-success">
          {connectedHint ?? "Connected for this browser session (demo)."}
        </p>
      ) : (
        <Button type="button" size="sm" className="mt-4" onClick={onConnect}>
          {connectLabel}
        </Button>
      )}
    </div>
  );
}
