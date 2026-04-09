"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Rocket,
  Plus,
  ChevronDown,
  X,
  MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getInitiatives } from "@/lib/initiatives/actions";
import type { Initiative } from "@/types";
import type { CollaborateSession } from "./collaborate-provider";

const MAX_SESSIONS = 10;

interface CollaborateEmptyStateProps {
  sessions: CollaborateSession[];
  onStart: (opts?: { initiativeId?: string; initiativeTitle?: string; pendingText?: string }) => void;
  onSelectSession: (id: string) => void;
}

export function CollaborateEmptyState({
  sessions,
  onStart,
  onSelectSession,
}: CollaborateEmptyStateProps) {
  const [text, setText] = useState("");
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [linkedInitiative, setLinkedInitiative] = useState<Initiative | null>(null);
  const [atCapacity, setAtCapacity] = useState(false);

  useEffect(() => {
    setAtCapacity(sessions.length >= MAX_SESSIONS);
  }, [sessions.length]);

  // Load initiatives for the picker
  useEffect(() => {
    getInitiatives("default").then((result) => {
      if (result.data) setInitiatives(result.data);
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || atCapacity) return;

    onStart({
      initiativeId: linkedInitiative?.id,
      initiativeTitle: linkedInitiative?.title,
      pendingText: trimmed,
    });

    setText("");
    setLinkedInitiative(null);
  }, [text, atCapacity, linkedInitiative, onStart]);

  const recentSessions = sessions.slice(0, 4);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
        {/* Icon + heading */}
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <Bot className="size-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          What can I help you build?
        </h1>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-10">
          I can create initiatives, manage your team&apos;s work, update skills, configure agents,
          and take actions across Hybrid OS on your behalf.
        </p>

        {/* Input card */}
        <div className="w-full max-w-2xl">
          {atCapacity ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">
              You&apos;ve reached the 10-session limit. Close a session in the sidebar to start a
              new one.
            </div>
          ) : (
            <div className="rounded-xl border border-input bg-card shadow-sm">
              <Textarea
                placeholder="Ask me anything or describe a task…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={4}
                className="resize-none border-0 bg-transparent px-4 pt-4 text-sm shadow-none focus-visible:ring-0 focus-visible:border-transparent"
              />

              {/* Toolbar row */}
              <div className="flex items-center justify-between gap-2 border-t border-input px-3 py-2">
                <div className="flex items-center gap-2">
                  {/* Initiative picker */}
                  {linkedInitiative ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                      <Rocket className="size-3" />
                      <span className="max-w-[160px] truncate">{linkedInitiative.title}</span>
                      <button
                        type="button"
                        onClick={() => setLinkedInitiative(null)}
                        className="ml-0.5 text-primary/70 hover:text-primary"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Rocket className="size-3" />
                        Link to initiative
                        <ChevronDown className="size-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel>Link to an initiative</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {initiatives.length === 0 ? (
                          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                            No initiatives yet
                          </div>
                        ) : (
                          initiatives.map((initiative) => (
                            <DropdownMenuItem
                              key={initiative.id}
                              onClick={() => setLinkedInitiative(initiative)}
                              className="flex flex-col items-start gap-0.5"
                            >
                              <span className="text-sm font-medium truncate w-full">
                                {initiative.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {initiative.type} · {initiative.status}
                              </span>
                            </DropdownMenuItem>
                          ))
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            // Navigate to create initiative — let AI handle it
                            setText(
                              text
                                ? text
                                : "Create a new initiative for me"
                            );
                          }}
                          className="text-primary gap-1.5"
                        >
                          <Plus className="size-3.5" />
                          Ask AI to create one
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                  className="h-7 gap-1.5 text-xs"
                >
                  <Send className="size-3.5" />
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion chips */}
        {!atCapacity && (
          <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-2xl">
            {[
              "Create a new initiative",
              "Show me pending approvals",
              "List my agents",
              "Update the second brain",
              "What skills do I have?",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setText(suggestion);
                }}
                className="rounded-full border border-input bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="border-t border-border px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Recent sessions
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl">
            {recentSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelectSession(session.id)}
                className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-left hover:border-primary/40 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {session.initiativeId ? (
                    <Rocket className="size-3 shrink-0 text-primary/70" />
                  ) : (
                    <MessageSquare className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium truncate">{session.title}</span>
                </div>
                {session.initiativeTitle && (
                  <span className="text-[10px] text-primary/70 truncate pl-4.5">
                    {session.initiativeTitle}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground pl-4.5">
                  {formatDistanceToNow(session.createdAt, { addSuffix: true })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
