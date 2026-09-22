"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/auth-provider";
import { useDashboard } from "@/contexts/dashboard-context";

import {
  actionConfirmedMessage,
  actionExecutingMessage,
  actionLogLabel,
  actionScheduledMessage,
  draftToEditPrompt,
  mockExecuteAction,
} from "./ask-aria-actions";
import { canConfirmAction } from "./ask-aria-permissions";
import {
  buildProactiveInsight,
  processAskAriaMessage,
} from "./ask-aria-intelligence";
import {
  mapDashboardToAskAriaView,
  toFullContext,
} from "./ask-aria-prompts";
import {
  createReportViaApi,
  createSpreadsheetViaApi,
  sendEmailViaApi,
  fetchGoogleWorkspaceStatus,
  readOAuthResumePayload,
  startGoogleOAuthFlow,
} from "./ask-aria-google-client";
import {
  connectDemoWorkspace,
  isDemoWorkspaceConnected,
  type DemoWorkspaceTool,
} from "./ask-aria-tools-storage";
import type { WorkspaceConnectionState } from "./ask-aria-tool-mapping";
import {
  createConversationId,
  createMessageId,
  loadActionLog,
  loadActiveConversationId,
  loadConversations,
  saveActionLog,
  saveActiveConversationId,
  saveConversations,
} from "./ask-aria-storage";
import { inferLastCapabilityKind } from "./ask-aria-conversation-capability";
import { monitorFromActionDraft } from "./ask-aria-monitor-draft";
import { googleWorkspaceErrorMessage } from "./ask-aria-status";
import { resolveAskAriaWorkspaceId } from "./ask-aria-user-scope";
import type { AriaMonitor } from "@/lib/ask-aria/monitors";
import {
  buildMonitorAlertBody,
  buildMonitorAlertTitle,
  deleteMonitor,
  draftEmailPromptForMonitor,
  investigatePromptForMonitor,
  loadMonitors,
  pauseMonitor,
  resumeMonitor,
  setMonitorStatus,
  upsertMonitor,
} from "@/lib/ask-aria/monitors";
import type {
  AskAriaActionDraft,
  AskAriaActionLogEntry,
  AskAriaClarificationChoice,
  AskAriaConversation,
  AskAriaFullContext,
  AskAriaHandoff,
  AskAriaInvestigationMemory,
  AskAriaMessage,
} from "./ask-aria-types";

export type AskAriaPanelDisplay = "welcome" | "thread";

interface AskAriaContextValue {
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  panelDisplay: AskAriaPanelDisplay;
  inputValue: string;
  setInputValue: (value: string) => void;
  submitQuestion: () => void;
  isSubmitting: boolean;
  messages: AskAriaMessage[];
  conversations: AskAriaConversation[];
  activeConversationId: string | null;
  selectConversation: (id: string) => void;
  startNewConversation: () => void;
  confirmAction: (draft: AskAriaActionDraft) => void;
  cancelAction: (draft: AskAriaActionDraft) => void;
  editAction: (draft: AskAriaActionDraft) => void;
  applyHandoff: (handoff: AskAriaHandoff) => void;
  runProactivePrompt: (prompt: string) => void;
  handleClarificationChoice: (choice: AskAriaClarificationChoice) => void;
  actionLog: AskAriaActionLogEntry[];
  /** Set when selecting a conversation that does not belong to the current user. */
  conversationAccessMessage: string | null;
  toolsSheetOpen: boolean;
  openToolsSheet: (focus?: DemoWorkspaceTool) => void;
  closeToolsSheet: () => void;
  toolsSheetFocus: DemoWorkspaceTool | null;
  setToolsConnectedTick: (value: number | ((current: number) => number)) => void;
  googleOAuthConfigured: boolean;
  googleOAuthConnected: boolean;
  googleOAuthDocsConnected: boolean;
  googleOAuthSheetsConnected: boolean;
  googleOAuthGmailConnected: boolean;
  refreshGoogleWorkspaceStatus: () => Promise<void>;
  monitors: AriaMonitor[];
  dismissedMonitorAlertIds: string[];
  pauseMonitorById: (monitorId: string) => void;
  resumeMonitorById: (monitorId: string) => void;
  deleteMonitorById: (monitorId: string) => void;
  simulateMonitorTrigger: (monitorId: string) => void;
  dismissMonitorAlert: (messageId: string, monitorId: string) => void;
}

const AskAriaContext = createContext<AskAriaContextValue | null>(null);

function conversationTitle(text: string): string {
  const trimmed = text
    .trim()
    .replace(/^(please|can you|could you|help me)\s+/i, "")
    .replace(/\s+/g, " ");
  if (!trimmed) return "New conversation";
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 45)}…`;
}

export function AskAriaProvider({ children }: { children: ReactNode }) {
  const dashboard = useDashboard();
  const { user } = useAuth();
  const role = user?.role ?? "ANALYST";
  const userId = user?.id ?? null;
  const workspaceId = resolveAskAriaWorkspaceId();

  const [open, setOpen] = useState(false);
  const [panelDisplay, setPanelDisplay] =
    useState<AskAriaPanelDisplay>("welcome");
  const [threadConversationId, setThreadConversationId] = useState<
    string | null
  >(null);
  const [draftConversationId, setDraftConversationId] = useState<
    string | null
  >(null);
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conversations, setConversations] = useState<AskAriaConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [actionLog, setActionLog] = useState<AskAriaActionLogEntry[]>([]);
  const [conversationAccessMessage, setConversationAccessMessage] = useState<
    string | null
  >(null);
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const [toolsSheetFocus, setToolsSheetFocus] =
    useState<DemoWorkspaceTool | null>(null);
  const [toolsConnectedTick, setToolsConnectedTick] = useState(0);
  const [googleOAuthConfigured, setGoogleOAuthConfigured] = useState(false);
  const [googleOAuthConnected, setGoogleOAuthConnected] = useState(false);
  const [googleOAuthDocsConnected, setGoogleOAuthDocsConnected] =
    useState(false);
  const [googleOAuthSheetsConnected, setGoogleOAuthSheetsConnected] =
    useState(false);
  const [googleOAuthGmailConnected, setGoogleOAuthGmailConnected] =
    useState(false);
  const proactiveShownForConversation = useRef<Set<string>>(new Set());
  const oauthReturnHandled = useRef(false);
  const monitorDemoAutoShown = useRef(false);
  const [monitors, setMonitors] = useState<AriaMonitor[]>([]);
  const [dismissedMonitorAlertIds, setDismissedMonitorAlertIds] = useState<
    string[]
  >([]);

  const workspaceConnection: WorkspaceConnectionState = useMemo(
    () => ({
      googleOAuthConfigured,
      googleOAuthConnected: googleOAuthDocsConnected,
      googleOAuthDocsConnected,
      googleOAuthSheetsConnected,
      googleOAuthGmailConnected,
      googleDemoConnected: userId
        ? isDemoWorkspaceConnected("google_workspace", userId)
        : false,
      microsoftDemoConnected: userId
        ? isDemoWorkspaceConnected("microsoft_365", userId)
        : false,
    }),
    [
      googleOAuthConfigured,
      googleOAuthDocsConnected,
      googleOAuthSheetsConnected,
      googleOAuthGmailConnected,
      userId,
      toolsConnectedTick,
    ],
  );

  const pushActionLogEntry = useCallback(
    (label: string, status: AskAriaActionLogEntry["status"] = "completed") => {
      setActionLog((current) => {
        const next = [
          {
            id: createMessageId(),
            label,
            status,
            timestamp: Date.now(),
          },
          ...current,
        ];
        if (userId) {
          saveActionLog(userId, next);
        }
        return next;
      });
    },
    [userId],
  );

  const refreshMonitors = useCallback(() => {
    if (!userId) {
      setMonitors([]);
      return;
    }
    setMonitors(loadMonitors(userId));
  }, [userId]);

  useEffect(() => {
    refreshMonitors();
  }, [refreshMonitors, userId]);

  const refreshGoogleWorkspaceStatus = useCallback(async () => {
    const data = await fetchGoogleWorkspaceStatus();
    setGoogleOAuthConfigured(data.configured);
    const docs = data.docsConnected ?? data.connected;
    const sheets = data.sheetsConnected ?? false;
    setGoogleOAuthDocsConnected(docs);
    const gmail = data.gmailConnected ?? false;
    setGoogleOAuthSheetsConnected(sheets);
    setGoogleOAuthGmailConnected(gmail);
    setGoogleOAuthConnected(docs || sheets || gmail);
  }, []);

  const liveView = mapDashboardToAskAriaView(dashboard, role);
  const liveContext = toFullContext(liveView);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const threadConversation = useMemo(
    () =>
      threadConversationId
        ? conversations.find((c) => c.id === threadConversationId) ?? null
        : null,
    [conversations, threadConversationId],
  );

  const threadOwnedByUser =
    threadConversation &&
    userId &&
    threadConversation.userId === userId;

  const messages =
    panelDisplay === "thread" && threadOwnedByUser
      ? threadConversation.messages
      : [];

  const conversationMemory =
    panelDisplay === "thread" && threadOwnedByUser
      ? threadConversation.memory
      : {};

  const reasoningContext: AskAriaFullContext =
    panelDisplay === "thread" && threadOwnedByUser
      ? threadConversation.savedContext
      : liveContext;
  const reasoningRole =
    panelDisplay === "thread" && threadOwnedByUser
      ? threadConversation.role
      : role;

  const clearAskAriaTransientState = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
    setActionLog([]);
    setInputValue("");
    setIsSubmitting(false);
    setPanelDisplay("welcome");
    setThreadConversationId(null);
    setDraftConversationId(null);
    setConversationAccessMessage(null);
    proactiveShownForConversation.current.clear();
    oauthReturnHandled.current = false;
  }, []);

  useEffect(() => {
    if (!userId) {
      clearAskAriaTransientState();
      return;
    }
    setConversationAccessMessage(null);
    setInputValue("");
    setIsSubmitting(false);
    setPanelDisplay("welcome");
    setThreadConversationId(null);
    setDraftConversationId(null);
    proactiveShownForConversation.current.clear();
    oauthReturnHandled.current = false;

    const loaded = loadConversations(userId);
    const storedActive = loadActiveConversationId(userId);
    const active =
      storedActive && loaded.some((conversation) => conversation.id === storedActive)
        ? storedActive
        : (loaded[0]?.id ?? null);
    setConversations(loaded);
    setActiveConversationId(active);
    setActionLog(loadActionLog(userId));
  }, [clearAskAriaTransientState, userId]);

  const upsertConversation = useCallback(
    (conversation: AskAriaConversation) => {
      if (!userId) return;
      const scoped: AskAriaConversation = {
        ...conversation,
        userId,
        workspaceId,
      };
      setConversations((current) => {
        const next = [
          scoped,
          ...current.filter((item) => item.id !== scoped.id),
        ];
        saveConversations(userId, next);
        return next;
      });
      setActiveConversationId(scoped.id);
      saveActiveConversationId(userId, scoped.id);
    },
    [userId, workspaceId],
  );

  const createEmptyConversation = useCallback((): AskAriaConversation => {
    if (!userId) {
      throw new Error("Ask Aria requires a signed-in user.");
    }
    const now = Date.now();
    return {
      id: createConversationId(),
      title: "New conversation",
      createdAt: now,
      updatedAt: now,
      userId,
      workspaceId,
      role,
      messages: [],
      memory: {},
      savedContext: liveContext,
    };
  }, [liveContext, role, userId, workspaceId]);

  const appendMessages = useCallback(
    (
      newMessages: AskAriaMessage[],
      nextMemory: AskAriaInvestigationMemory,
      titleSeed?: string,
      targetConversationId?: string,
    ) => {
      if (!userId) return;
      setConversations((current) => {
        const conversationId = targetConversationId ?? activeConversationId;
        let base =
          conversationId
            ? current.find((item) => item.id === conversationId)
            : undefined;

        if (base && base.userId !== userId) {
          base = undefined;
        }

        if (!base) {
          base = createEmptyConversation();
        }

        const firstUser = newMessages.find((m) => m.kind === "user");
        const title =
          base.title === "New conversation" &&
          (titleSeed || firstUser?.kind === "user")
            ? conversationTitle(
                titleSeed ?? (firstUser as { text: string }).text,
              )
            : base.title;

        const allMessages = [...base.messages, ...newMessages];
        const updated: AskAriaConversation = {
          ...base,
          userId,
          workspaceId,
          title,
          updatedAt: Date.now(),
          messages: allMessages,
          memory: nextMemory,
          lastCapabilityKind:
            inferLastCapabilityKind(allMessages) ?? base.lastCapabilityKind,
        };

        const next = [
          updated,
          ...current.filter((item) => item.id !== updated.id),
        ];
        saveConversations(userId, next);
        saveActiveConversationId(userId, updated.id);
        setActiveConversationId(updated.id);
        return next;
      });
    },
    [activeConversationId, createEmptyConversation, userId, workspaceId],
  );

  const ensureSubmitConversationId = useCallback((): string => {
    if (panelDisplay === "thread" && threadConversationId) {
      return threadConversationId;
    }
    if (draftConversationId) {
      return draftConversationId;
    }
    const created = createEmptyConversation();
    upsertConversation(created);
    setDraftConversationId(created.id);
    proactiveShownForConversation.current.delete(created.id);
    return created.id;
  }, [
    createEmptyConversation,
    draftConversationId,
    panelDisplay,
    threadConversationId,
    upsertConversation,
  ]);

  const closePanel = useCallback(() => {
    setOpen(false);
    setIsSubmitting(false);
  }, []);

  const openPanel = useCallback(() => {
    setOpen(true);
    setPanelDisplay("welcome");
    setThreadConversationId(null);
    setDraftConversationId(null);
  }, []);

  const togglePanel = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  useEffect(() => {
    if (!open || panelDisplay !== "thread" || !threadConversationId) return;
    if (proactiveShownForConversation.current.has(threadConversationId)) return;
    if (messages.length > 0) {
      proactiveShownForConversation.current.add(threadConversationId);
      return;
    }
    const proactive = buildProactiveInsight(reasoningContext);
    if (!proactive) return;
    proactiveShownForConversation.current.add(threadConversationId);
    appendMessages([proactive], conversationMemory, undefined, threadConversationId);
  }, [
    appendMessages,
    conversationMemory,
    messages.length,
    open,
    panelDisplay,
    reasoningContext,
    threadConversationId,
  ]);

  const submitQuestion = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    setIsSubmitting(true);
    const targetConversationId = ensureSubmitConversationId();
    if (panelDisplay === "welcome") {
      setPanelDisplay("thread");
      setThreadConversationId(targetConversationId);
    }
    const conversation =
      conversations.find((item) => item.id === targetConversationId) ?? null;
    const memory = conversation?.memory ?? {};
    const contextForTurn =
      conversation?.savedContext ?? liveContext;
    const roleForTurn = conversation?.role ?? role;
    const result = processAskAriaMessage(
      text,
      contextForTurn,
      memory,
      roleForTurn,
      workspaceConnection,
      {
        recentMessages: conversation?.messages ?? [],
        appUserEmail: user?.email,
        activeMonitors: monitors,
      },
    );
    appendMessages(
      result.messages,
      result.memory,
      text,
      targetConversationId,
    );
    setInputValue("");
    setIsSubmitting(false);
  }, [
    appendMessages,
    conversations,
    ensureSubmitConversationId,
    inputValue,
    liveContext,
    panelDisplay,
    role,
    user?.email,
    workspaceConnection,
    monitors,
  ]);

  const runProactivePrompt = useCallback(
    (prompt: string) => {
      const targetConversationId = ensureSubmitConversationId();
      if (panelDisplay === "welcome") {
        setPanelDisplay("thread");
        setThreadConversationId(targetConversationId);
      }
      const conversation =
        conversations.find((item) => item.id === targetConversationId) ?? null;
      const memory = conversation?.memory ?? {};
      const contextForTurn = conversation?.savedContext ?? liveContext;
      const roleForTurn = conversation?.role ?? role;
      const result = processAskAriaMessage(
        prompt,
        contextForTurn,
        memory,
        roleForTurn,
        workspaceConnection,
        {
          recentMessages: conversation?.messages ?? [],
          appUserEmail: user?.email,
          activeMonitors: monitors,
        },
      );
      appendMessages(
        result.messages,
        result.memory,
        prompt,
        targetConversationId,
      );
      setInputValue("");
    },
    [
      appendMessages,
      conversations,
      ensureSubmitConversationId,
      liveContext,
      panelDisplay,
      role,
      user?.email,
      workspaceConnection,
      monitors,
    ],
  );

  const confirmAction = useCallback(
    (draft: AskAriaActionDraft) => {
      const memory = activeConversation?.memory ?? {};
      const conversationId = activeConversationId ?? undefined;

      if (draft.type === "draft_email") {
        appendMessages(
          [
            {
              id: createMessageId(),
              kind: "assistant_text",
              text:
                "This is a draft for review only. Use Send or confirm send when you're ready to deliver via Gmail.",
              createdAt: Date.now(),
            },
          ],
          { ...memory, pendingActionDraft: draft },
          undefined,
          conversationId,
        );
        return;
      }

      if (draft.validationError) {
        appendMessages(
          [
            {
              id: createMessageId(),
              kind: "action_result",
              draft,
              status: "blocked",
              message: draft.validationError,
              createdAt: Date.now(),
            },
          ],
          { ...memory, pendingActionDraft: draft },
          undefined,
          conversationId,
        );
        return;
      }

      const permission = canConfirmAction(reasoningRole, draft.type);
      if (!permission.allowed) {
        appendMessages(
          [
            {
              id: createMessageId(),
              kind: "action_result",
              draft,
              status: "blocked",
              message: permission.reason ?? "Action blocked.",
              createdAt: Date.now(),
            },
          ],
          { ...memory, pendingActionDraft: draft },
          undefined,
          conversationId,
        );
        return;
      }

      setIsSubmitting(true);
      const nextMemory = {
        ...memory,
        pendingActionDraft: draft,
        topic: "action" as const,
      };
      const confirmed: AskAriaMessage = {
        id: createMessageId(),
        kind: "action_result",
        draft,
        status: "confirmed",
        message: actionConfirmedMessage(draft),
        createdAt: Date.now(),
      };
      appendMessages([confirmed], nextMemory, undefined, conversationId);

      const scheduled: AskAriaMessage = {
        id: createMessageId(),
        kind: "action_result",
        draft,
        status: draft.isImmediate ? "running" : "scheduled",
        message: actionScheduledMessage(draft),
        createdAt: Date.now(),
      };

      window.setTimeout(() => {
        appendMessages([scheduled], nextMemory, undefined, conversationId);
      }, 400);

      window.setTimeout(() => {
        const executing: AskAriaMessage = {
          id: createMessageId(),
          kind: "action_result",
          draft,
          status: "executing",
          message: actionExecutingMessage(draft),
          createdAt: Date.now(),
        };
        appendMessages([executing], nextMemory, undefined, conversationId);
      }, 900);

      window.setTimeout(() => {
        void (async () => {
          let result: AskAriaMessage;
          if (
            draft.type === "generate_report" ||
            draft.type === "schedule_report"
          ) {
            const apiResult = await createReportViaApi(draft, {
              dateRange: reasoningContext.dateRange,
              comparisonPeriod: reasoningContext.comparisonPeriod,
              platformId: draft.platformId ?? reasoningContext.platform,
              brandId: reasoningContext.brandId,
              productId: draft.productId ?? reasoningContext.productId,
            });
            if (apiResult.ok) {
              const title = draft.reportTitle ?? "Commerce analysis report";
              result = {
                id: createMessageId(),
                kind: "action_result",
                draft,
                status: "completed",
                message: "Report generated",
                detailLines: [`${title} is ready in Google Docs.`],
                ctaLabel: "Open report",
                ctaUrl: apiResult.docUrl,
                secondaryCtaLabel: "Share",
                secondaryCtaDisabled: true,
                secondaryCtaHint:
                  "Sharing from the app is not enabled in this phase.",
                createdAt: Date.now(),
              };
            } else if (apiResult.code === "NOT_CONFIGURED") {
              result = mockExecuteAction(draft);
            } else {
              result = {
                id: createMessageId(),
                kind: "action_result",
                draft,
                status: "failed",
                message: googleWorkspaceErrorMessage(
                  "doc",
                  apiResult.code,
                  apiResult.error,
                ),
                createdAt: Date.now(),
              };
            }
          } else if (draft.type === "create_spreadsheet") {
            const apiResult = await createSpreadsheetViaApi(draft, {
              dateRange: reasoningContext.dateRange,
              comparisonPeriod: reasoningContext.comparisonPeriod,
              platformId: draft.platformId ?? reasoningContext.platform,
              brandId: reasoningContext.brandId,
              productId: draft.productId ?? reasoningContext.productId,
            });
            if (apiResult.ok) {
              const rows = draft.spreadsheetRowCount ?? 0;
              result = {
                id: createMessageId(),
                kind: "action_result",
                draft,
                status: "completed",
                message: "Spreadsheet created",
                detailLines: [
                  `${rows} row${rows === 1 ? "" : "s"} exported to Google Sheets.`,
                ],
                ctaLabel: "Open spreadsheet",
                ctaUrl: apiResult.spreadsheetUrl,
                secondaryCtaLabel: "Share",
                secondaryCtaDisabled: true,
                secondaryCtaHint:
                  "Sharing from the app is not enabled in this phase.",
                createdAt: Date.now(),
              };
            } else if (apiResult.code === "NOT_CONFIGURED") {
              result = mockExecuteAction(draft);
            } else {
              result = {
                id: createMessageId(),
                kind: "action_result",
                draft,
                status: "failed",
                message: googleWorkspaceErrorMessage(
                  "sheet",
                  apiResult.code,
                  apiResult.error,
                ),
                createdAt: Date.now(),
              };
            }
          } else if (
            draft.type === "create_monitor" ||
            draft.type === "create_alert"
          ) {
            if (userId) {
              const monitor = monitorFromActionDraft(
                draft,
                userId,
                workspaceId,
              );
              upsertMonitor(userId, monitor);
              refreshMonitors();
              result = {
                id: createMessageId(),
                kind: "action_result",
                draft: { ...draft, monitorId: monitor.id },
                status: "completed",
                message: "Monitor created",
                detailLines: [
                  monitor.label ??
                    draft.monitorRuleLabel ??
                    "Monitor saved for this user.",
                  "Checks are simulated in this prototype — no background cron or push notifications.",
                ],
                createdAt: Date.now(),
              };
            } else {
              result = mockExecuteAction(draft);
            }
          } else if (draft.type === "send_email") {
            const apiResult = await sendEmailViaApi(draft);
            if (apiResult.ok) {
              result = {
                id: createMessageId(),
                kind: "action_result",
                draft: {
                  ...draft,
                  gmailMessageId: apiResult.messageId,
                },
                status: "completed",
                message: "Email sent",
                detailLines: [
                  `To: ${draft.emailRecipients ?? "—"}`,
                  `Subject: ${draft.emailSubject ?? "—"}`,
                ],
                ctaLabel: apiResult.viewUrl ? "View sent email" : undefined,
                ctaUrl: apiResult.viewUrl,
                createdAt: Date.now(),
              };
            } else if (apiResult.code === "NOT_CONFIGURED") {
              result = mockExecuteAction(draft);
            } else {
              result = {
                id: createMessageId(),
                kind: "action_result",
                draft,
                status: "failed",
                message: googleWorkspaceErrorMessage(
                  "email",
                  apiResult.code,
                  apiResult.error,
                ),
                createdAt: Date.now(),
              };
            }
          } else {
            result = mockExecuteAction(draft);
          }
          const completedMessages: AskAriaMessage[] = [result];
          if (
            result.kind === "action_result" &&
            result.status === "completed" &&
            result.ctaUrl
          ) {
            if (
              draft.type === "generate_report" ||
              draft.type === "schedule_report"
            ) {
              completedMessages.push({
                id: createMessageId(),
                kind: "workspace_artifact",
                title: draft.reportTitle ?? "Commerce analysis report",
                artifactKind: "doc",
                ctaUrl: result.ctaUrl,
                createdAt: Date.now(),
              });
            } else if (draft.type === "create_spreadsheet") {
              completedMessages.push({
                id: createMessageId(),
                kind: "workspace_artifact",
                title: draft.spreadsheetTitle ?? "Performance spreadsheet",
                artifactKind: "sheet",
                ctaUrl: result.ctaUrl,
                createdAt: Date.now(),
              });
            }
          }
          appendMessages(
            completedMessages,
            { ...nextMemory, pendingActionDraft: undefined },
            undefined,
            conversationId,
          );
          const status =
            result.kind === "action_result" ? result.status : "failed";
          setActionLog((current) => {
            const next = [
              {
                id: createMessageId(),
                label: actionLogLabel(draft),
                platformId: draft.platformId,
                status,
                timestamp: Date.now(),
              },
              ...current,
            ];
            if (userId) {
              saveActionLog(userId, next);
            }
            return next;
          });
          setIsSubmitting(false);
        })();
      }, 1800);
    },
    [
      activeConversation,
      activeConversationId,
      appendMessages,
      reasoningContext,
      reasoningRole,
      userId,
      workspaceId,
      refreshMonitors,
    ],
  );

  const editAction = useCallback(
    (draft: AskAriaActionDraft) => {
      setInputValue(draftToEditPrompt(draft));
      const memory = activeConversation?.memory ?? {};
      appendMessages(
        [],
        { ...memory, pendingActionDraft: undefined, topic: "action" },
        undefined,
        activeConversationId ?? undefined,
      );
    },
    [activeConversation, activeConversationId, appendMessages],
  );

  const cancelAction = useCallback(
    (draft: AskAriaActionDraft) => {
      const memory = activeConversation?.memory ?? {};
      appendMessages(
        [
          {
            id: createMessageId(),
            kind: "action_result",
            draft,
            status: "cancelled",
            message: "Action cancelled. No changes were scheduled.",
            createdAt: Date.now(),
          },
        ],
        memory,
        undefined,
        activeConversationId ?? undefined,
      );
    },
    [activeConversation, activeConversationId, appendMessages],
  );

  const appendMonitorAlertMessage = useCallback(
    (monitor: AriaMonitor) => {
      const title = buildMonitorAlertTitle(monitor, reasoningContext);
      const bodyLines = buildMonitorAlertBody(monitor, reasoningContext);
      const alertMessage: AskAriaMessage = {
        id: createMessageId(),
        kind: "monitor_alert",
        monitorId: monitor.id,
        title,
        bodyLines,
        investigatePrompt: investigatePromptForMonitor(monitor),
        draftEmailPrompt: draftEmailPromptForMonitor(monitor),
        createdAt: Date.now(),
      };
      appendMessages(
        [alertMessage],
        activeConversation?.memory ?? {},
        undefined,
        activeConversationId ?? undefined,
      );
      setPanelDisplay("thread");
      openPanel();
    },
    [
      activeConversation?.memory,
      activeConversationId,
      appendMessages,
      openPanel,
      reasoningContext,
    ],
  );

  const simulateMonitorTrigger = useCallback(
    (monitorId: string) => {
      if (!userId) return;
      const list = setMonitorStatus(userId, monitorId, "triggered");
      refreshMonitors();
      const monitor = list.find((m) => m.id === monitorId);
      if (monitor) {
        appendMonitorAlertMessage(monitor);
        pushActionLogEntry("Monitor condition triggered (simulated)");
      }
    },
    [
      appendMonitorAlertMessage,
      pushActionLogEntry,
      refreshMonitors,
      userId,
    ],
  );

  const maybeAutoDemoMonitor = useCallback(() => {
    if (!userId || monitorDemoAutoShown.current) return;
    const list = loadMonitors(userId);
    const hasTriggered = list.some((m) => m.status === "triggered");
    const firstActive = list.find((m) => m.status === "active");
    if (!hasTriggered && firstActive) {
      monitorDemoAutoShown.current = true;
      simulateMonitorTrigger(firstActive.id);
    }
  }, [simulateMonitorTrigger, userId]);

  const pauseMonitorById = useCallback(
    (monitorId: string) => {
      if (!userId) return;
      pauseMonitor(userId, monitorId);
      refreshMonitors();
      pushActionLogEntry("Monitor paused");
    },
    [pushActionLogEntry, refreshMonitors, userId],
  );

  const resumeMonitorById = useCallback(
    (monitorId: string) => {
      if (!userId) return;
      resumeMonitor(userId, monitorId);
      refreshMonitors();
      pushActionLogEntry("Monitor updated");
    },
    [pushActionLogEntry, refreshMonitors, userId],
  );

  const deleteMonitorById = useCallback(
    (monitorId: string) => {
      if (!userId) return;
      deleteMonitor(userId, monitorId);
      refreshMonitors();
      pushActionLogEntry("Monitor deleted");
    },
    [pushActionLogEntry, refreshMonitors, userId],
  );

  const dismissMonitorAlert = useCallback(
    (messageId: string, monitorId: string) => {
      setDismissedMonitorAlertIds((current) => [...current, messageId]);
      if (userId) {
        setMonitorStatus(userId, monitorId, "active");
        refreshMonitors();
      }
    },
    [refreshMonitors, userId],
  );

  const openToolsSheet = useCallback(
    (focus?: DemoWorkspaceTool) => {
      setToolsSheetFocus(focus ?? null);
      setToolsSheetOpen(true);
      if (focus === "monitoring") {
        window.setTimeout(() => maybeAutoDemoMonitor(), 300);
      }
    },
    [maybeAutoDemoMonitor],
  );

  const closeToolsSheet = useCallback(() => {
    setToolsSheetOpen(false);
    setToolsSheetFocus(null);
  }, []);

  const handleClarificationChoice = useCallback(
    (choice: AskAriaClarificationChoice) => {
      if (choice.action === "open_tools_sheet") {
        openToolsSheet();
        return;
      }
      if (choice.action === "open_monitors_panel") {
        openToolsSheet("monitoring");
        return;
      }
      if (!choice.followUpText.trim()) {
        return;
      }
      if (
        choice.action === "connect_google_oauth" ||
        choice.action === "connect_google_sheets" ||
        choice.action === "connect_google_gmail"
      ) {
        const memory = activeConversation?.memory ?? {};
        const draft = memory.pendingActionDraft;
        const returnTo = `${window.location.pathname}${window.location.search}`;
        const scopes =
          choice.action === "connect_google_sheets"
            ? "sheets"
            : choice.action === "connect_google_gmail"
              ? "gmail"
              : undefined;
        startGoogleOAuthFlow({
          returnTo: returnTo.includes("?")
            ? `${returnTo}&askAria=resume`
            : `${returnTo}?askAria=resume`,
          conversationId: activeConversationId ?? undefined,
          userId: userId ?? undefined,
          scopes,
          resume: {
            conversationId: activeConversationId ?? undefined,
            pendingActionDraft: draft,
          },
        });
        return;
      }
      if (choice.action === "connect_google_workspace") {
        if (googleOAuthConfigured) {
          startGoogleOAuthFlow({
            returnTo: window.location.pathname + window.location.search,
            conversationId: activeConversationId ?? undefined,
            userId: userId ?? undefined,
          });
          return;
        }
        if (!userId) return;
        connectDemoWorkspace("google_workspace", userId);
        setToolsConnectedTick((value) => value + 1);
        openToolsSheet("google_workspace");
        return;
      }
      if (choice.followUpText.trim()) {
        runProactivePrompt(choice.followUpText);
      }
    },
    [
      activeConversation?.memory,
      activeConversationId,
      googleOAuthConfigured,
      openToolsSheet,
      runProactivePrompt,
      userId,
    ],
  );

  const applyHandoff = useCallback(
    (handoff: AskAriaHandoff) => {
      if (handoff.platformId) {
        dashboard.setPlatform(handoff.platformId);
      }
      if (handoff.analyticsMode) {
        dashboard.setAnalyticsMode(handoff.analyticsMode);
      }
      if (handoff.productId) {
        dashboard.setProductId(handoff.productId);
      }
      if (handoff.prompt?.trim()) {
        runProactivePrompt(handoff.prompt);
      }
    },
    [dashboard, runProactivePrompt],
  );

  const selectConversation = useCallback(
    (id: string) => {
      setConversationAccessMessage(null);
      if (!userId) return;
      const conversation = conversations.find((item) => item.id === id);
      if (!conversation || conversation.userId !== userId) {
        setConversationAccessMessage("This conversation isn't available.");
        return;
      }
      setActiveConversationId(id);
      saveActiveConversationId(userId, id);
      setPanelDisplay("thread");
      setThreadConversationId(id);
      setDraftConversationId(null);
    },
    [conversations, userId],
  );

  const startNewConversation = useCallback(() => {
    if (!userId) return;
    const created = createEmptyConversation();
    upsertConversation(created);
    proactiveShownForConversation.current.delete(created.id);
    setDraftConversationId(created.id);
    setActiveConversationId(created.id);
    saveActiveConversationId(userId, created.id);
    setPanelDisplay("welcome");
    setThreadConversationId(null);
    setConversationAccessMessage(null);
  }, [createEmptyConversation, upsertConversation, userId]);

  useEffect(() => {
    void refreshGoogleWorkspaceStatus();
  }, [refreshGoogleWorkspaceStatus, toolsConnectedTick, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("googleWorkspace") === "connected";
    const oauthError = params.get("googleOAuth") === "error";
    const resume = params.get("askAriaResume") === "1";
    if (!connected && !oauthError && !resume) return;
    if (oauthReturnHandled.current) return;
    oauthReturnHandled.current = true;

    void refreshGoogleWorkspaceStatus().then(() => {
      if (oauthError) {
        const message =
          params.get("googleOAuthMessage") ??
          "Google sign-in did not complete.";
        openPanel();
        appendMessages(
          [
            {
              id: createMessageId(),
              kind: "assistant_text",
              text: message,
              createdAt: Date.now(),
            },
          ],
          activeConversation?.memory ?? {},
          undefined,
          activeConversationId ?? undefined,
        );
      } else if (connected) {
        openPanel();
        const resumePayload = readOAuthResumePayload(userId);
        const memory = activeConversation?.memory ?? {};
        const pending =
          resumePayload?.pendingActionDraft ?? memory.pendingActionDraft;
        const conversationId =
          params.get("conversationId") ??
          resumePayload?.conversationId ??
          activeConversationId ??
          undefined;
        const nextMessages: AskAriaMessage[] = [
          {
            id: createMessageId(),
            kind: "assistant_text",
            text: "Google Workspace is connected. You can create reports in Google Docs.",
            createdAt: Date.now(),
          },
        ];
        if (pending) {
          nextMessages.push({
            id: createMessageId(),
            kind: "action_preview",
            draft: pending,
            createdAt: Date.now(),
          });
        }
        appendMessages(
          nextMessages,
          { ...memory, pendingActionDraft: pending },
          undefined,
          conversationId,
        );
      }

      params.delete("googleWorkspace");
      params.delete("googleOAuth");
      params.delete("googleOAuthMessage");
      params.delete("askAriaResume");
      params.delete("conversationId");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    });
  }, [
    activeConversation?.memory,
    activeConversationId,
    appendMessages,
    openPanel,
    refreshGoogleWorkspaceStatus,
    userId,
  ]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePanel, open]);

  const value = useMemo(
    () => ({
      open,
      openPanel,
      closePanel,
      togglePanel,
      panelDisplay,
      inputValue,
      setInputValue,
      submitQuestion,
      isSubmitting,
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
      toolsSheetOpen,
      openToolsSheet,
      closeToolsSheet,
      toolsSheetFocus,
      setToolsConnectedTick,
      googleOAuthConfigured,
      googleOAuthConnected,
      googleOAuthDocsConnected,
      googleOAuthSheetsConnected,
      googleOAuthGmailConnected,
      refreshGoogleWorkspaceStatus,
      monitors,
      dismissedMonitorAlertIds,
      pauseMonitorById,
      resumeMonitorById,
      deleteMonitorById,
      simulateMonitorTrigger,
      dismissMonitorAlert,
    }),
    [
      open,
      openPanel,
      closePanel,
      togglePanel,
      panelDisplay,
      inputValue,
      submitQuestion,
      isSubmitting,
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
      toolsSheetOpen,
      openToolsSheet,
      closeToolsSheet,
      toolsSheetFocus,
      googleOAuthConfigured,
      googleOAuthConnected,
      googleOAuthDocsConnected,
      googleOAuthSheetsConnected,
      googleOAuthGmailConnected,
      refreshGoogleWorkspaceStatus,
      monitors,
      dismissedMonitorAlertIds,
      pauseMonitorById,
      resumeMonitorById,
      deleteMonitorById,
      simulateMonitorTrigger,
      dismissMonitorAlert,
    ],
  );

  return (
    <AskAriaContext.Provider value={value}>{children}</AskAriaContext.Provider>
  );
}

export function useAskAria(): AskAriaContextValue {
  const context = useContext(AskAriaContext);
  if (!context) {
    throw new Error("useAskAria must be used within AskAriaProvider.");
  }
  return context;
}

export function useAskAriaDashboardView() {
  const dashboard = useDashboard();
  const { user } = useAuth();
  return mapDashboardToAskAriaView(dashboard, user?.role ?? "ANALYST");
}
