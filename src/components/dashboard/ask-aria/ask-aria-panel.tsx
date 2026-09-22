"use client";

import { useMemo, useState } from "react";

import { ChevronDown, ChevronUp, X } from "lucide-react";

import { cn } from "@/lib/cn";

import { AskAriaActionHistory } from "./ask-aria-action-history";
import { AskAriaConnectedToolsLink } from "./ask-aria-connected-tools";
import { AskAriaToolsSheet } from "./ask-aria-tools-sheet";
import { useAskAria } from "./ask-aria-context";
import { AskAriaConversationHistory } from "./ask-aria-conversation-history";
import { AskAriaInput } from "./ask-aria-input";
import { AskAriaMessageList } from "./ask-aria-response-cards";
import { AskAriaCommandCenter } from "./ask-aria-command-center";
import { AskAriaContextualSuggestions } from "./ask-aria-contextual-suggestions";
import { AskAriaSuggestions } from "./ask-aria-suggestions";
import { AskAriaWelcomeState } from "./ask-aria-welcome";

function shouldShowSuggestions(
  panelDisplay: "welcome" | "thread",
  messageCount: number,
  lastIsAssistant: boolean,
): boolean {
  if (panelDisplay === "welcome") return true;
  if (messageCount === 0) return true;
  if (messageCount <= 2) return true;
  if (messageCount < 10 && lastIsAssistant) return true;
  return false;
}

export function AskAriaPanel() {
  const {
    open,
    closePanel,
    panelDisplay,
    messages,
    conversations,
    activeConversationId,
    selectConversation,
    startNewConversation,
    confirmAction,
    cancelAction,
    editAction,
    applyHandoff,
    runProactivePrompt,
    handleClarificationChoice,
    actionLog,
    conversationAccessMessage,
  } = useAskAria();

  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);

  const lastIsAssistant = useMemo(() => {
    const last = messages[messages.length - 1];
    return last ? last.kind !== "user" : false;
  }, [messages]);

  const showSuggestions =
    panelDisplay === "thread" &&
    shouldShowSuggestions(panelDisplay, messages.length, lastIsAssistant);

  if (!open) return null;

  const panelTop = "top-[var(--ci-header-height,6.25rem)]";
  const panelHeight =
    "h-[calc(100dvh-var(--ci-header-height,6.25rem))] max-md:h-auto max-md:max-h-[88vh]";

  return (
    <>
      <button
        type="button"
        aria-label="Close Ask Aria"
        className={cn(
          "fixed z-40 bg-black/10",
          panelTop,
          "bottom-0 left-0 right-0",
        )}
        onClick={closePanel}
      />

      <aside
        id="ask-aria-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-aria-panel-title"
        className={cn(
          "fixed z-40 flex min-h-0 min-w-0 flex-col bg-surface shadow-md",
          panelTop,
          panelHeight,
          "right-0 bottom-0 w-full max-w-[440px] border-l border-border",
          "max-md:top-auto max-md:rounded-t-2xl max-md:border-t",
          "max-md:bottom-0 max-md:left-0 max-md:max-w-none",
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border-subtle px-4 py-4 sm:px-5">
          <div>
            <h2 id="ask-aria-panel-title" className="type-h3">
              Ask Aria
            </h2>
            <p className="type-small text-text-secondary">
              Your commerce intelligence assistant
            </p>
            <AskAriaConnectedToolsLink
              onOpenCommandCenter={() => setCommandCenterOpen(true)}
            />
          </div>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close Ask Aria panel"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-interactive"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-border-subtle px-5 py-2">
          <AskAriaConversationHistory
            conversations={conversations}
            activeId={
              panelDisplay === "thread" ? activeConversationId : null
            }
            onSelect={selectConversation}
            onNew={startNewConversation}
          />
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5">
          {commandCenterOpen ? (
            <AskAriaCommandCenter onBack={() => setCommandCenterOpen(false)} />
          ) : panelDisplay === "welcome" ? (
            <AskAriaWelcomeState />
          ) : (
            <>
              {conversationAccessMessage ? (
                <p
                  className="type-small text-text-secondary"
                  role="status"
                >
                  {conversationAccessMessage}
                </p>
              ) : null}
              <AskAriaMessageList
                messages={messages}
                onConfirmAction={confirmAction}
                onCancelAction={cancelAction}
                onEditAction={editAction}
                onHandoff={applyHandoff}
                onProactivePrompt={runProactivePrompt}
                onClarificationChoice={handleClarificationChoice}
              />
              <AskAriaContextualSuggestions visible />
              <AskAriaActionHistory entries={actionLog} />
            </>
          )}
        </div>

        {showSuggestions ? (
          <div className="shrink-0 border-t border-border-subtle px-5 py-2">
            <button
              type="button"
              onClick={() => setSuggestionsExpanded((value) => !value)}
              className="flex w-full items-center justify-between gap-2 text-left"
              aria-expanded={suggestionsExpanded}
            >
              <span className="type-label text-text-tertiary">
                Explore another question
              </span>
              {suggestionsExpanded ? (
                <ChevronUp className="h-4 w-4 text-text-tertiary" />
              ) : (
                <ChevronDown className="h-4 w-4 text-text-tertiary" />
              )}
            </button>
            {suggestionsExpanded ? (
              <div className="mt-2 max-h-40 overflow-y-auto">
                <AskAriaSuggestions compact visible />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="relative z-10 mt-auto shrink-0">
          <AskAriaInput />
        </div>
        <AskAriaToolsSheet />
      </aside>
    </>
  );
}
