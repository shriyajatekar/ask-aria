"use client";

import { useMemo, useState } from "react";

import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

import type {
  AskAriaConversation,
  AskAriaConversationCapabilityKind,
} from "./ask-aria-types";
import { inferLastCapabilityKind } from "./ask-aria-conversation-capability";

const NEW_CONVERSATION_TITLE = "New conversation";
const POPOVER_LIST_THRESHOLD = 6;
const EXPANDED_MAX_HEIGHT_PX = 120;

function conversationHasUserMessage(conversation: AskAriaConversation): boolean {
  return conversation.messages.some((message) => message.kind === "user");
}

function displayTitle(conversation: AskAriaConversation): string | null {
  if (!conversationHasUserMessage(conversation)) return null;

  const trimmedTitle = conversation.title.trim();
  if (
    trimmedTitle === NEW_CONVERSATION_TITLE ||
    trimmedTitle.toLowerCase() === "untitled conversation" ||
    !trimmedTitle
  ) {
    const firstUser = conversation.messages.find(
      (message) => message.kind === "user",
    );
    if (!firstUser || firstUser.kind !== "user") return null;
    const text = firstUser.text.trim();
    if (!text) return null;
    return text.length > 56 ? `${text.slice(0, 54)}…` : text;
  }

  return conversation.title;
}

function isListableConversation(conversation: AskAriaConversation): boolean {
  return displayTitle(conversation) !== null;
}

function startOfDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatLastActivity(updatedAt: number): string {
  const diffMs = Date.now() - updatedAt;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(updatedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function capabilityBadge(
  conversation: AskAriaConversation,
): AskAriaConversationCapabilityKind | undefined {
  return (
    conversation.lastCapabilityKind ??
    inferLastCapabilityKind(conversation.messages)
  );
}

function groupLabelForDate(
  updatedAt: number,
  todayStart: number,
  yesterdayStart: number,
): string {
  const day = startOfDayMs(new Date(updatedAt));
  if (day === todayStart) return "Today";
  if (day === yesterdayStart) return "Yesterday";
  return new Date(updatedAt)
    .toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    .toUpperCase();
}

function groupConversations(conversations: AskAriaConversation[]) {
  const now = new Date();
  const todayStart = startOfDayMs(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const listable = conversations.filter(isListableConversation);
  const buckets = new Map<string, AskAriaConversation[]>();

  for (const conversation of listable) {
    const label = groupLabelForDate(
      conversation.updatedAt,
      todayStart,
      yesterdayStart,
    );
    const existing = buckets.get(label) ?? [];
    existing.push(conversation);
    buckets.set(label, existing);
  }

  const order = ["Today", "Yesterday"];
  const groups: Array<{ label: string; items: AskAriaConversation[] }> = [];

  for (const label of order) {
    const items = buckets.get(label);
    if (items?.length) {
      groups.push({ label, items });
      buckets.delete(label);
    }
  }

  const olderLabels = [...buckets.keys()].sort((a, b) => {
    const aTime = buckets.get(a)?.[0]?.updatedAt ?? 0;
    const bTime = buckets.get(b)?.[0]?.updatedAt ?? 0;
    return bTime - aTime;
  });

  for (const label of olderLabels) {
    const items = buckets.get(label);
    if (items?.length) groups.push({ label, items });
  }

  return groups;
}

function ConversationList({
  groups,
  activeId,
  onSelect,
  className,
}: {
  groups: Array<{ label: string; items: AskAriaConversation[] }>;
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 type-label text-text-tertiary">{group.label}</p>
          <ul className="space-y-1">
            {group.items.map((conversation) => {
              const title = displayTitle(conversation);
              if (!title) return null;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 text-left transition-colors",
                      activeId === conversation.id
                        ? "border-accent-interactive bg-accent-subtle"
                        : "border-border hover:bg-surface-hover",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate type-small text-text-primary">
                        {title}
                      </p>
                      {capabilityBadge(conversation) ? (
                        <span
                          className="shrink-0 rounded border border-border px-1 type-label text-text-tertiary"
                        >
                          {capabilityBadge(conversation)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 type-label text-text-tertiary">
                      {formatLastActivity(conversation.updatedAt)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AskAriaConversationHistory({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: AskAriaConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const groups = useMemo(() => groupConversations(conversations), [conversations]);
  const listableCount = useMemo(
    () => groups.reduce((count, group) => count + group.items.length, 0),
    [groups],
  );
  const activeTitle = useMemo(() => {
    if (!activeId) return null;
    const active = conversations.find((conversation) => conversation.id === activeId);
    return active ? displayTitle(active) : null;
  }, [activeId, conversations]);

  const usePopoverForFullList = listableCount > POPOVER_LIST_THRESHOLD;

  function handleSelect(id: string) {
    onSelect(id);
    setPopoverOpen(false);
    setExpanded(false);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex min-w-0 flex-1 items-center gap-1 text-left"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          )}
          <span className="type-label text-text-tertiary">Recent</span>
          {listableCount > 0 ? (
            <span className="type-small text-text-secondary">
              ({listableCount})
            </span>
          ) : null}
          {!expanded && activeTitle ? (
            <span className="truncate type-small text-text-tertiary">
              · {activeTitle}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onNew}
          className="shrink-0 rounded-md border border-border px-2 py-0.5 type-label text-text-secondary transition-colors hover:bg-surface-hover"
        >
          New
        </button>
      </div>

      {listableCount === 0 ? (
        <p className="type-small text-text-tertiary">No saved conversations yet.</p>
      ) : null}

      {expanded && listableCount > 0 ? (
        <div
          className="overflow-y-auto pr-0.5"
          style={{ maxHeight: EXPANDED_MAX_HEIGHT_PX }}
        >
          {usePopoverForFullList ? (
            <div className="space-y-2">
              <ConversationList
                groups={groups.slice(0, 1)}
                activeId={activeId}
                onSelect={handleSelect}
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPopoverOpen((value) => !value)}
                  className="type-label text-text-secondary underline-offset-2 hover:underline"
                >
                  Browse all conversations
                </button>
                {popoverOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="Close conversation list"
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={() => setPopoverOpen(false)}
                    />
                    <div
                      className="absolute left-0 top-full z-40 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-white p-2 shadow-md"
                      role="dialog"
                      aria-label="All recent conversations"
                    >
                      <ConversationList
                        groups={groups}
                        activeId={activeId}
                        onSelect={handleSelect}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <ConversationList
              groups={groups}
              activeId={activeId}
              onSelect={handleSelect}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
