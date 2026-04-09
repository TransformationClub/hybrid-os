"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  Bot,
  Send,
  X,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Pencil,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from "ai";
import { useOrchestratorChat } from "@/hooks/use-chat";
import { ToolPartRenderer } from "@/components/chat/tool-part-renderer";
import { Citations, type CitationSource } from "@/components/chat/citations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { CollaborateSession } from "./collaborate-provider";

interface ChatSessionProps {
  session: CollaborateSession;
  onUpdate: (patch: Partial<CollaborateSession>) => void;
  onSyncMessages: (messages: UIMessage[]) => void;
  onClose: () => void;
}

export function ChatSession({
  session,
  onUpdate,
  onSyncMessages,
  onClose,
}: ChatSessionProps) {
  const { messages, input, setInput, handleSubmit, sendMessage, isLoading, status, error, stop } =
    useOrchestratorChat({
      workspaceId: "default",
      initiativeId: session.initiativeId,
      initialMessages: session.messages.length > 0 ? session.messages : undefined,
    });

  // Auto-send pending text from EmptyState on first mount
  const hasSentPending = useRef(false);
  useEffect(() => {
    if (!hasSentPending.current && session.pendingText && messages.length === 0) {
      hasSentPending.current = true;
      sendMessage({ text: session.pendingText });
      onUpdate({ pendingText: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync messages back to provider whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      onSyncMessages(messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Auto-scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Copy
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = useCallback(async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Retry
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const handleRetry = useCallback(() => {
    if (!lastUserMsg) return;
    const text = lastUserMsg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    sendMessage({ text });
  }, [lastUserMsg, sendMessage]);

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(session.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleDraft(session.title);
  }, [session.title]);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== session.title) {
      onUpdate({ title: trimmed });
    }
    setEditingTitle(false);
  };

  const hasError = status === "error" || !!error;

  // Build display messages
  const displayMessages = messages.map((msg) => {
    const sources: CitationSource[] = [];
    const toolParts: UIMessagePart<UIDataTypes, UITools>[] = [];

    for (const part of msg.parts) {
      const isStaticTool = part.type.startsWith("tool-");
      const isDynamicTool = part.type === "dynamic-tool";
      if (isStaticTool || isDynamicTool) {
        const tp = part as Record<string, unknown>;
        toolParts.push(part);
        const toolName = isDynamicTool ? (tp.toolName as string) : part.type.slice(5);
        if (
          toolName === "searchKnowledge" &&
          tp.state === "output-available" &&
          tp.output &&
          typeof tp.output === "object"
        ) {
          const out = tp.output as { results?: CitationSource[] };
          if (out.results) sources.push(...out.results);
        }
      }
    }

    const content = msg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");

    return { msg, content, sources, toolParts };
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-card">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="size-4" />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="w-full bg-transparent text-sm font-medium outline-none border-b border-primary"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingTitle(true);
                setTimeout(() => titleInputRef.current?.select(), 0);
              }}
              className="flex items-center gap-1.5 group text-left"
            >
              <span className="text-sm font-medium truncate">{session.title}</span>
              <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          )}

          {session.initiativeId && session.initiativeTitle && (
            <div className="flex items-center gap-1 mt-0.5">
              <Rocket className="size-3 text-primary/70" />
              <span className="text-[11px] text-muted-foreground truncate">
                {session.initiativeTitle}
              </span>
              <Link
                href={`/initiatives/${session.initiativeId}`}
                className="flex items-center gap-0.5 text-[11px] text-primary hover:underline"
              >
                <ExternalLink className="size-2.5" />
                View
              </Link>
            </div>
          )}
        </div>

        <Badge
          variant="outline"
          className={`text-[10px] shrink-0 ${
            isLoading
              ? "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
              : "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
          }`}
        >
          {isLoading ? "Thinking…" : "Online"}
        </Badge>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="shrink-0 text-muted-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-6 py-6 max-w-3xl mx-auto w-full">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="size-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Ready to help</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Ask me anything or give me a task. I can create initiatives, manage work,
                update your second brain, and more.
              </p>
            </div>
          )}

          {displayMessages.map(({ msg, content, sources, toolParts }) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5">
                  <Bot className="size-3.5" />
                </div>
              )}

              <div
                className={`flex max-w-[80%] flex-col gap-1 ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Orchestrator
                  </span>
                )}

                <div className="group/msg relative">
                  <div
                    className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {content}
                  </div>
                  {content && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className={`absolute -bottom-1 ${
                        msg.role === "user"
                          ? "left-0 -translate-x-full"
                          : "right-0 translate-x-full"
                      } opacity-0 group-hover/msg:opacity-70 hover:!opacity-100 transition-opacity`}
                      onClick={() => handleCopy(msg.id, content)}
                    >
                      {copiedId === msg.id ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                  )}
                </div>

                {toolParts.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1 w-full">
                    {toolParts.map((tp, i) => (
                      <ToolPartRenderer key={`${msg.id}-tool-${i}`} part={tp} />
                    ))}
                  </div>
                )}

                {sources.length > 0 && <Citations sources={sources} />}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5">
                <Bot className="size-3.5" />
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-2.5">
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Thinking…</span>
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

      {/* Input area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-col gap-2 rounded-xl border border-input bg-background p-3"
          >
            <Textarea
              placeholder="Ask me anything or describe a task…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isLoading}
              rows={3}
              className="resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:border-transparent"
            />
            <div className="flex items-center justify-between">
              {isLoading ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={stop}
                  className="text-muted-foreground text-xs gap-1 h-7"
                >
                  <X className="size-3" />
                  Stop
                </Button>
              ) : (
                <div />
              )}
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !input.trim()}
                className="h-7 gap-1.5 text-xs"
              >
                <Send className="size-3.5" />
                Send
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
