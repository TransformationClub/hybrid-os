"use client";

import { useParams } from "next/navigation";
import { useRef, useEffect, useState, useCallback } from "react";
import {
  Bot,
  Send,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  ArrowRight,
  GripVertical,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Target,
  BarChart3,
  Zap,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Plus,
  X,
  Pencil,
  Save,
} from "lucide-react";
import { useOrchestratorChat } from "@/hooks/use-chat";
import { saveChatMessage, getChatHistory } from "@/lib/chat/actions";
import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from "ai";
import { ToolPartRenderer } from "@/components/chat/tool-part-renderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Citations, type CitationSource } from "@/components/chat/citations";

// ===========================================================================
// Mock data (centralized)
// ===========================================================================

import {
  type ChatMsg,
  mockChatMessages as chatMessages,
  mockCampaignBrief as campaignBrief,
  mockStrategyProposal as strategyProposal,
  mockIcpSummary as icpSummary,
  mockKeyMessages as keyMessages,
  type KanbanColumn,
  type WorkCard,
  mockKanbanColumns as kanbanColumns,
  mockMetrics as metrics,
  mockAlerts as alerts,
} from "@/lib/mock-data";
import {
  getWorkItems,
  moveWorkItem,
  linkKnowledge,
  unlinkKnowledge,
  getLinkedKnowledge,
} from "@/lib/initiatives/actions";
import type { WorkItem, KnowledgeObject } from "@/types";
import { useRealtimeWorkItems } from "@/hooks/use-realtime-work-items";
import { ActivityFeed } from "@/components/initiatives/activity-feed";
import { PresenceIndicator } from "@/components/collaboration/presence-indicator";
import { usePresence } from "@/hooks/use-presence";
import type { AppEvent } from "@/types";

// ===========================================================================
// Sub-components
// ===========================================================================

function ChatPanel({ initiativeId }: { initiativeId: string }) {
  const [persistedMessages, setPersistedMessages] = useState<UIMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load persisted chat history on mount
  useEffect(() => {
    let cancelled = false;
    getChatHistory(initiativeId).then((result) => {
      if (cancelled) return;
      if (result.data && result.data.length > 0) {
        const restored: UIMessage[] = result.data.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: (msg.parts as UIMessage["parts"]) ?? [
            { type: "text" as const, text: msg.content },
          ],
        }));
        setPersistedMessages(restored);
      }
      setHistoryLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initiativeId]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, status, sendMessage } =
    useOrchestratorChat({
      initiativeId,
      ...(persistedMessages.length > 0
        ? { initialMessages: persistedMessages }
        : {}),
    });

  // Persist messages when assistant finishes streaming
  const prevStatusRef = useRef(status);
  const savedMsgCountRef = useRef(persistedMessages.length);

  useEffect(() => {
    const wasStreaming =
      prevStatusRef.current === "streaming" ||
      prevStatusRef.current === "submitted";
    const isNowReady = status === "ready";
    prevStatusRef.current = status;

    if (!wasStreaming || !isNowReady) return;
    if (messages.length === 0) return;

    // Find unsaved messages (everything after what we've already saved)
    const unsaved = messages.slice(savedMsgCountRef.current);
    savedMsgCountRef.current = messages.length;

    // Save each unsaved message
    for (const msg of unsaved) {
      if (msg.role !== "user" && msg.role !== "assistant") continue;
      const textContent = msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");

      saveChatMessage({
        initiativeId,
        workspaceId: "mock-workspace", // TODO: wire to real workspace from initiative
        role: msg.role,
        content: textContent,
        parts: msg.parts as unknown[],
      });
    }
  }, [status, messages, initiativeId]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // When persisted messages exist, skip mock messages as fallback
  const hasPersisted = persistedMessages.length > 0;

  // Combine mock history (fallback) with live messages
  const allMessages = [
    ...(!hasPersisted
      ? chatMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          agent: msg.agent,
          time: msg.time,
          isMock: true,
          sources: msg.sources as CitationSource[] | undefined,
          toolParts: undefined as UIMessagePart<UIDataTypes, UITools>[] | undefined,
        }))
      : []),
    ...messages.map((msg) => {
      // Extract sources from searchKnowledge tool results (v6: type is "tool-searchKnowledge" or "dynamic-tool")
      const sources: CitationSource[] = [];
      const toolParts: UIMessagePart<UIDataTypes, UITools>[] = [];
      for (const part of msg.parts) {
        // Detect tool parts: static ("tool-<name>") or dynamic ("dynamic-tool")
        const isStaticTool = part.type.startsWith("tool-");
        const isDynamicTool = part.type === "dynamic-tool";
        if (isStaticTool || isDynamicTool) {
          const toolPart = part as Record<string, unknown>;
          toolParts.push(part);
          // Extract search knowledge sources
          const toolName = isDynamicTool
            ? (toolPart.toolName as string)
            : part.type.slice(5);
          if (
            toolName === "searchKnowledge" &&
            toolPart.state === "output-available" &&
            toolPart.output &&
            typeof toolPart.output === "object"
          ) {
            const output = toolPart.output as { results?: CitationSource[] };
            if (output.results) {
              for (const r of output.results) {
                sources.push({
                  title: r.title,
                  path: r.path,
                  type: r.type,
                  snippet: r.snippet,
                });
              }
            }
          }
        }
      }
      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content:
          msg.parts
            .filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") || "",
        agent: msg.role === "assistant" ? "Orchestrator" : undefined,
        time: undefined as string | undefined,
        isMock: false,
        sources: sources.length > 0 ? sources : undefined,
        toolParts: toolParts.length > 0 ? toolParts : undefined,
      };
    }),
  ];

  // Track last user message for retry
  const lastUserMsg = [...allMessages].reverse().find((m) => m.role === "user");

  const handleRetry = useCallback(() => {
    if (!lastUserMsg) return;
    sendMessage({ text: lastUserMsg.content });
  }, [lastUserMsg, sendMessage]);

  const hasError = status === "error" || !!error;

  return (
    <div className="flex h-full w-[350px] min-w-[350px] flex-col border-r border-border bg-card">
      {/* Chat header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500 text-white">
          <Bot className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-none">Orchestrator</p>
          <p className="text-xs text-muted-foreground mt-0.5">Campaign co-pilot</p>
        </div>
        <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
          {isLoading ? "Thinking..." : "Online"}
        </Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-4">
          {allMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white mt-0.5">
                  <Bot className="size-3.5" />
                </div>
              )}
              <div
                className={`flex max-w-[85%] flex-col gap-1 ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                {msg.role === "assistant" && msg.agent && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {msg.agent}
                  </span>
                )}
                <div className="group/msg relative">
                  <div
                    className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={`absolute -bottom-1 ${msg.role === "user" ? "left-0 -translate-x-full" : "right-0 translate-x-full"} opacity-0 group-hover/msg:opacity-70 hover:!opacity-100 transition-opacity`}
                    onClick={() => handleCopy(msg.id, msg.content)}
                  >
                    {copiedId === msg.id ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <Citations sources={msg.sources} />
                )}
                {msg.toolParts && msg.toolParts.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {msg.toolParts.map((tp, i) => (
                      <ToolPartRenderer key={`${msg.id}-tool-${i}`} part={tp} />
                    ))}
                  </div>
                )}
                {msg.time && (
                  <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white mt-0.5">
                <Bot className="size-3.5" />
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-muted px-3 py-2">
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {hasError && (
        <div className="flex items-center gap-2 border-t border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-4 py-2">
          <AlertTriangle className="size-3.5 shrink-0 text-red-500" />
          <p className="flex-1 text-xs text-red-600 dark:text-red-400 truncate">
            {error?.message || "Something went wrong. Please try again."}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 h-6 px-2 text-xs gap-1"
            onClick={handleRetry}
          >
            <RefreshCw className="size-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border p-3">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 rounded-xl border border-input bg-background p-2"
        >
          <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground">
            <Paperclip className="size-4" />
          </Button>
          <Input
            placeholder="Message the orchestrator..."
            className="flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:border-transparent h-auto"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
          />
          <Button type="submit" size="icon-sm" className="shrink-0" disabled={isLoading || !input.trim()}>
            <Send className="size-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// -- Strategize Tab ----------------------------------------------------------

function StrategizeTab({ initiativeId }: { initiativeId: string }) {
  // Campaign brief local state
  const [briefGoal, setBriefGoal] = useState(campaignBrief.goal);
  const [briefAudience, setBriefAudience] = useState(campaignBrief.audience);
  const [briefMessaging, setBriefMessaging] = useState(campaignBrief.messaging);

  // Key messages local state
  const [messages, setMessages] = useState<string[]>([...keyMessages]);

  // Strategy proposal edit mode
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [proposalPoints, setProposalPoints] = useState<string[]>([...strategyProposal.points]);
  const [proposalDraft, setProposalDraft] = useState<string[]>([...strategyProposal.points]);

  function handleSaveBrief() {
    // TODO: wire to server action
    console.log("Save brief:", { goal: briefGoal, audience: briefAudience, messaging: briefMessaging });
  }

  function handleAddMessage() {
    setMessages((prev) => [...prev, ""]);
  }

  function handleRemoveMessage(index: number) {
    setMessages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMessageChange(index: number, value: string) {
    setMessages((prev) => prev.map((m, i) => (i === index ? value : m)));
  }

  function handleEditProposal() {
    setProposalDraft([...proposalPoints]);
    setIsEditingProposal(true);
  }

  function handleSaveProposal() {
    setProposalPoints([...proposalDraft]);
    setIsEditingProposal(false);
    // TODO: wire to server action
    console.log("Save proposal:", proposalDraft);
  }

  function handleCancelProposal() {
    setProposalDraft([...proposalPoints]);
    setIsEditingProposal(false);
  }

  // --- Linked Knowledge ---
  const [linkedKnowledgeIds, setLinkedKnowledgeIds] = useState<string[]>([]);
  const [knowledgeInput, setKnowledgeInput] = useState("");
  const [showKnowledgeDialog, setShowKnowledgeDialog] = useState(false);

  useEffect(() => {
    getLinkedKnowledge(initiativeId).then((result) => {
      if (result.data) setLinkedKnowledgeIds(result.data);
    });
  }, [initiativeId]);

  async function handleLinkKnowledge() {
    const id = knowledgeInput.trim();
    if (!id) return;
    const result = await linkKnowledge(initiativeId, id);
    if (result.data) {
      setLinkedKnowledgeIds(result.data.linked_knowledge);
      setKnowledgeInput("");
      setShowKnowledgeDialog(false);
    }
  }

  async function handleUnlinkKnowledge(koId: string) {
    const result = await unlinkKnowledge(initiativeId, koId);
    if (result.data) {
      setLinkedKnowledgeIds(result.data.linked_knowledge);
    }
  }

  return (
    <ScrollArea className="h-full overflow-y-auto">
      <div className="grid gap-4 p-6 lg:grid-cols-2">
        {/* Campaign Brief */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              Campaign Brief
            </CardTitle>
            <CardAction>
              <Badge variant="secondary" className="text-[10px]">
                Editable
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Goal
              </label>
              <Textarea
                value={briefGoal}
                onChange={(e) => setBriefGoal(e.target.value)}
                className="min-h-20 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Target Audience
              </label>
              <Textarea
                value={briefAudience}
                onChange={(e) => setBriefAudience(e.target.value)}
                className="min-h-20 text-sm"
              />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Core Messaging
              </label>
              <Textarea
                value={briefMessaging}
                onChange={(e) => setBriefMessaging(e.target.value)}
                className="min-h-16 text-sm"
              />
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <Button size="sm" onClick={handleSaveBrief}>
                <Save className="size-3.5" data-icon="inline-start" />
                Save Brief
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Proposal */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-indigo-500 text-white">
                <Bot className="size-3" />
              </div>
              <CardTitle>{strategyProposal.title}</CardTitle>
            </div>
            <CardDescription>Proposed by Orchestrator agent</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isEditingProposal ? (
              <ul className="space-y-3">
                {proposalDraft.map((point, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-2">
                      {i + 1}
                    </span>
                    <Textarea
                      value={point}
                      onChange={(e) => {
                        const next = [...proposalDraft];
                        next[i] = e.target.value;
                        setProposalDraft(next);
                      }}
                      className="min-h-16 text-sm flex-1"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-3">
                {proposalPoints.map((point, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter className="gap-2">
            {isEditingProposal ? (
              <>
                <Button size="sm" onClick={handleSaveProposal}>
                  <Save className="size-3.5" data-icon="inline-start" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancelProposal}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm">
                  <CheckCircle2 className="size-3.5" data-icon="inline-start" />
                  Approve
                </Button>
                <Button variant="outline" size="sm" onClick={handleEditProposal}>
                  <Pencil className="size-3.5" data-icon="inline-start" />
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  Request Changes
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        {/* ICP Summary */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                {icpSummary.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {icpSummary.personas.map((p) => (
                  <div key={p.name} className="flex items-start gap-3">
                    <Avatar size="sm">
                      <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                        {p.name.split(" ").map((w) => w[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.focus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Messages */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" />
                Key Messages
              </CardTitle>
              <CardAction>
                <Button variant="ghost" size="icon-sm" onClick={handleAddMessage}>
                  <Plus className="size-3.5" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-4">
              <ol className="space-y-2">
                {messages.map((msg, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Input
                      value={msg}
                      onChange={(e) => handleMessageChange(i, e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMessage(i)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Linked Knowledge */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              Linked Knowledge
            </CardTitle>
            <CardAction>
              <Button variant="outline" size="sm" onClick={() => setShowKnowledgeDialog(true)}>
                <Plus className="size-3.5" data-icon="inline-start" />
                Link Knowledge
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-4">
            {linkedKnowledgeIds.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No knowledge objects linked yet. Link knowledge from your Second Brain to inform this initiative.
              </p>
            ) : (
              <ul className="space-y-2">
                {linkedKnowledgeIds.map((koId) => (
                  <li key={koId} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{koId}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleUnlinkKnowledge(koId)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {/* Simple link dialog (inline) */}
            {showKnowledgeDialog && (
              <div className="mt-4 flex items-center gap-2 border-t pt-4">
                <Input
                  placeholder="Enter knowledge object ID or path..."
                  value={knowledgeInput}
                  onChange={(e) => setKnowledgeInput(e.target.value)}
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLinkKnowledge();
                    }
                  }}
                />
                <Button size="sm" onClick={handleLinkKnowledge} disabled={!knowledgeInput.trim()}>
                  Link
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowKnowledgeDialog(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

// -- Orchestrate Tab ---------------------------------------------------------

import {
  KanbanBoard,
  type KanbanColumnConfig,
} from "@/components/kanban/kanban-board";
const typeBadgeColor: Record<string, string> = {
  task: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  deliverable: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  approval: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

function WorkCardRenderer(item: WorkCard, isDragging: boolean) {
  return (
    <Card
      size="sm"
      className={`cursor-grab transition-shadow ${
        isDragging
          ? "ring-2 ring-primary/40 shadow-lg rotate-2"
          : "hover:ring-2 hover:ring-primary/20"
      }`}
    >
      <CardContent className="flex flex-col gap-2.5 pt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{item.title}</p>
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40 mt-0.5" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium capitalize ${typeBadgeColor[item.type] ?? ""}`}
            >
              {item.type}
            </span>
            {item.priority && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span
                  className={`inline-block size-1.5 rounded-full ${priorityDot[item.priority]}`}
                />
                {item.priority}
              </span>
            )}
          </div>
          <Avatar size="sm">
            <AvatarFallback
              className={`text-[9px] font-semibold ${item.assignee.color}`}
            >
              {item.assignee.initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
}

/** Map a WorkItem status to a kanban column key */
const statusToColumnKey: Record<string, string> = {
  backlog: "todo",
  todo: "todo",
  in_progress: "in_progress",
  review: "review",
  done: "done",
  blocked: "todo",
};

/** Map a kanban column key back to a WorkItemStatus */
const columnKeyToStatus: Record<string, "todo" | "in_progress" | "review" | "done"> = {
  todo: "todo",
  in_progress: "in_progress",
  review: "review",
  done: "done",
};

/** Assign a color based on agent/assignee name */
const agentColors: Record<string, { initials: string; color: string }> = {
  Researcher: { initials: "RE", color: "bg-amber-500 text-white" },
  "Campaign Strategist": { initials: "CS", color: "bg-indigo-500 text-white" },
  "Content Writer": { initials: "CW", color: "bg-violet-500 text-white" },
  Orchestrator: { initials: "CO", color: "bg-indigo-500 text-white" },
  default: { initials: "AG", color: "bg-slate-500 text-white" },
};

function workItemToCard(item: WorkItem): WorkCard {
  const agent = item.assigned_agent
    ? agentColors[item.assigned_agent] ?? agentColors.default
    : agentColors.default;
  return {
    id: item.id,
    title: item.title,
    type: (item.type === "blocker" ? "task" : item.type) as WorkCard["type"],
    assignee: { ...agent, name: item.assigned_agent ?? item.assigned_to ?? "Unassigned" },
    priority: undefined, // WorkItem type doesn't include priority in the DB type but mock data might
  };
}

function buildKanbanColumns(items: WorkItem[]): KanbanColumnConfig<WorkCard>[] {
  const columnDefs: { key: string; label: string }[] = [
    { key: "todo", label: "To Do" },
    { key: "in_progress", label: "In Progress" },
    { key: "review", label: "Review" },
    { key: "done", label: "Done" },
  ];
  const grouped: Record<string, WorkCard[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };
  for (const item of items) {
    const colKey = statusToColumnKey[item.status] ?? "todo";
    grouped[colKey].push(workItemToCard(item));
  }
  return columnDefs.map((def) => ({
    key: def.key,
    label: def.label,
    items: grouped[def.key],
  }));
}

function OrchestrateTab({ initiativeId }: { initiativeId: string }) {
  const [columns, setColumns] = useState<KanbanColumnConfig<WorkCard>[]>(
    () => kanbanColumns.map((col) => ({ ...col, items: [...col.items] }))
  );
  const [refreshing, setRefreshing] = useState(false);

  // Use realtime hook for live work item updates (replaces 10s polling)
  const { items: realtimeItems, isLoading: loading } = useRealtimeWorkItems(initiativeId);

  // Sync realtime items into kanban columns whenever they change
  useEffect(() => {
    if (realtimeItems.length > 0) {
      setColumns(buildKanbanColumns(realtimeItems));
    }
  }, [realtimeItems]);

  // Manual refresh (still useful as a user action)
  const fetchWorkItems = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const result = await getWorkItems(initiativeId);
      if (result.data && result.data.length > 0) {
        setColumns(buildKanbanColumns(result.data));
      }
    } catch (err) {
      console.error("[OrchestrateTab] Failed to fetch work items:", err);
    } finally {
      setRefreshing(false);
    }
  }, [initiativeId]);

  const handleItemMove = useCallback(
    async (itemId: string, fromColumn: string, toColumn: string, newIndex: number) => {
      console.log(
        `[Kanban] Moved "${itemId}" from "${fromColumn}" to "${toColumn}" at index ${newIndex}`
      );

      // Optimistic: immediately update the columns (drag already moved the card visually)
      // Snapshot current columns for rollback
      let snapshot: KanbanColumnConfig<WorkCard>[] = [];
      setColumns((prev) => {
        snapshot = prev;
        return prev; // The KanbanBoard onColumnsChange already applied the visual move
      });

      // Persist the status change
      const newStatus = columnKeyToStatus[toColumn];
      if (newStatus) {
        const result = await moveWorkItem({ workItemId: itemId, newStatus });
        if (result.error) {
          console.error("[Kanban] Failed to persist move, rolling back:", result.error);
          setColumns(snapshot);
        }
      }
    },
    []
  );

  const renderColumnHeader = useCallback(
    (col: KanbanColumnConfig<WorkCard>, count: number) => (
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{col.label}</h3>
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            {count}
          </span>
        </div>
        <Button variant="ghost" size="icon-xs">
          <MoreHorizontal className="size-3.5" />
        </Button>
      </div>
    ),
    []
  );

  return (
    <ScrollArea className="h-full overflow-x-auto overflow-y-auto">
      <div className="p-6">
        <div className="mb-4 flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchWorkItems(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} data-icon="inline-start" />
            Refresh
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading work items...</span>
          </div>
        ) : (
          <KanbanBoard<WorkCard>
            columns={columns}
            onColumnsChange={setColumns}
            onItemMove={handleItemMove}
            renderCard={WorkCardRenderer}
            renderColumnHeader={renderColumnHeader}
          />
        )}
      </div>
    </ScrollArea>
  );
}

// -- Report & Optimize Tab ---------------------------------------------------

function ReportTab({ initiativeId }: { initiativeId: string }) {
  // Activity feed state
  const [activityEvents, setActivityEvents] = useState<AppEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadActivity() {
      try {
        const { fetchInitiativeActivity } = await import("@/lib/events/actions");
        const events = await fetchInitiativeActivity("mock-workspace", initiativeId, 20);
        if (!cancelled) {
          setActivityEvents(events);
        }
      } catch {
        // Silently fall back to empty
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    }
    loadActivity();
    return () => { cancelled = true; };
  }, [initiativeId]);

  const [hsMetrics, setHsMetrics] = useState<{
    traffic: { total: number; organic: number; direct: number; referral: number; social: number };
    leads: { total: number; newThisPeriod: number; conversionRate: number };
    engagement: { emailOpenRate: number; emailClickRate: number; blogViews: number };
  } | null>(null);
  const [syncingHubSpot, setSyncingHubSpot] = useState(false);

  const fetchHubSpotData = useCallback(async () => {
    try {
      setSyncingHubSpot(true);
      const { getHubSpotAnalytics } = await import("@/lib/hubspot/actions");
      const result = await getHubSpotAnalytics("ws-default");
      if (result.data) {
        setHsMetrics(result.data);
      }
    } catch {
      // Silently fall back to mock metrics
    } finally {
      setSyncingHubSpot(false);
    }
  }, []);

  useEffect(() => {
    fetchHubSpotData();
  }, [fetchHubSpotData]);

  // Build display metrics: prefer HubSpot data when available, fall back to mock
  const displayMetrics = hsMetrics
    ? [
        {
          label: "Sessions",
          value: hsMetrics.traffic.total.toLocaleString(),
          change: `+${Math.round(((hsMetrics.traffic.total - 12000) / 12000) * 100)}%`,
          up: hsMetrics.traffic.total > 12000,
          icon: Eye,
        },
        {
          label: "New Leads",
          value: hsMetrics.leads.newThisPeriod.toLocaleString(),
          change: `${hsMetrics.leads.conversionRate > 0.05 ? "+" : ""}${(hsMetrics.leads.conversionRate * 100).toFixed(1)}% CVR`,
          up: hsMetrics.leads.conversionRate > 0.05,
          icon: Target,
        },
        {
          label: "Email Open Rate",
          value: `${(hsMetrics.engagement.emailOpenRate * 100).toFixed(1)}%`,
          change: hsMetrics.engagement.emailOpenRate > 0.25 ? "+above avg" : "-below avg",
          up: hsMetrics.engagement.emailOpenRate > 0.25,
          icon: BarChart3,
        },
        {
          label: "Blog Views",
          value: hsMetrics.engagement.blogViews.toLocaleString(),
          change: `${hsMetrics.engagement.emailClickRate > 0.03 ? "+" : ""}${(hsMetrics.engagement.emailClickRate * 100).toFixed(1)}% CTR`,
          up: hsMetrics.engagement.emailClickRate > 0.03,
          icon: Users,
        },
      ]
    : metrics;

  return (
    <ScrollArea className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 p-6">
        {/* Sync from HubSpot button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {hsMetrics ? "Showing HubSpot data" : "Showing mock data"}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={syncingHubSpot}
            onClick={fetchHubSpotData}
          >
            {syncingHubSpot ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="size-3.5 mr-1.5" />
            )}
            Sync from HubSpot
          </Button>
        </div>

        {/* Metrics row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {displayMetrics.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} size="sm">
                <CardContent className="flex items-center gap-3 pt-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-semibold tabular-nums">
                        {m.value}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          m.up
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {m.up ? (
                          <TrendingUp className="inline size-3 mr-0.5" />
                        ) : (
                          <TrendingDown className="inline size-3 mr-0.5" />
                        )}
                        {m.change}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Initiative progress */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>Across all work items in this initiative</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Progress value={62}>
              <ProgressLabel>Completion</ProgressLabel>
              <ProgressValue />
            </Progress>
            <div className="mt-4 grid grid-cols-4 gap-3 text-center">
              {kanbanColumns.map((col) => (
                <div key={col.key}>
                  <p className="text-lg font-semibold">{col.items.length}</p>
                  <p className="text-xs text-muted-foreground">{col.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <div>
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            Needs Attention
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {alerts.map((alert) => (
              <Card
                key={alert.id}
                size="sm"
                className={
                  alert.severity === "critical"
                    ? "ring-red-200 dark:ring-red-900/40"
                    : "ring-amber-200 dark:ring-amber-900/40"
                }
              >
                <CardContent className="flex flex-col gap-2 pt-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={`size-4 shrink-0 mt-0.5 ${
                        alert.severity === "critical"
                          ? "text-red-500"
                          : "text-amber-500"
                      }`}
                    />
                    <p className="text-sm font-medium">{alert.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                    {alert.recommendation}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Zap className="size-3" />
              </div>
              <CardTitle>Optimizer Recommendations</CardTitle>
            </div>
            <CardDescription>AI-generated insights based on current performance</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-3">
              {[
                "Increase internal linking to pillar pages by 40% to boost authority signals.",
                'Repurpose the top-performing "AI Marketing Stack" piece into a LinkedIn carousel and webinar.',
                "Target 3 long-tail queries where competitor citation share dropped last week.",
              ].map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                  <Lightbulb className="size-4 shrink-0 text-amber-500 mt-0.5" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Update Second Brain */}
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Update Second Brain</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sync learnings, performance data, and new insights back to your knowledge base.
              </p>
            </div>
            <Button size="sm">
              Sync Now
              <ArrowRight className="size-3.5" data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <ActivityFeed
          events={activityEvents}
          isLoading={activityLoading}
          collapsible
          defaultCollapsed={false}
        />
      </div>
    </ScrollArea>
  );
}

// ===========================================================================
// Main Page
// ===========================================================================

export default function InitiativeWorkspacePage() {
  const params = useParams<{ id: string }>();

  // Real-time presence for this initiative
  const { presenceUsers } = usePresence({
    page: "initiative",
    initiativeId: params.id,
  });

  return (
    <div className="flex h-full">
      {/* Chat Panel */}
      <ChatPanel initiativeId={params.id} />

      {/* Canvas */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Canvas header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold truncate">Q2 AEO Content Blitz</h1>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold shrink-0">
              AEO
            </Badge>
            <span className="inline-flex h-5 items-center rounded-full bg-emerald-100 px-2 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
              Active
            </span>
          </div>
          {presenceUsers.length > 0 ? (
            <PresenceIndicator
              users={presenceUsers.map((u) => ({
                id: u.id,
                name: u.name,
                avatar: u.avatar,
              }))}
              maxVisible={4}
            />
          ) : (
            <AvatarGroup>
              {[
                { initials: "CO", color: "bg-indigo-500 text-white" },
                { initials: "CW", color: "bg-violet-500 text-white" },
                { initials: "SE", color: "bg-sky-500 text-white" },
                { initials: "LS", color: "bg-primary text-primary-foreground" },
              ].map((a) => (
                <Avatar key={a.initials} size="sm">
                  <AvatarFallback className={`text-[9px] font-semibold ${a.color}`}>
                    {a.initials}
                  </AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
          )}
        </div>

        {/* Canvas tabs */}
        <Tabs defaultValue="strategize" className="flex flex-1 flex-col min-h-0">
          <div className="border-b border-border px-6">
            <TabsList variant="line">
              <TabsTrigger value="strategize">Strategize</TabsTrigger>
              <TabsTrigger value="orchestrate">Orchestrate</TabsTrigger>
              <TabsTrigger value="report">Report & Optimize</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="strategize" className="flex-1 min-h-0">
            <StrategizeTab initiativeId={params.id} />
          </TabsContent>

          <TabsContent value="orchestrate" className="flex-1 min-h-0">
            <OrchestrateTab initiativeId={params.id} />
          </TabsContent>

          <TabsContent value="report" className="flex-1 min-h-0">
            <ReportTab initiativeId={params.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
