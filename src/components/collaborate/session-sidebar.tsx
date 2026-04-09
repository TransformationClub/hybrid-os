"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Search,
  MessageSquare,
  Rocket,
  ExternalLink,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CollaborateSession } from "./collaborate-provider";

const MAX_SESSIONS = 10;

interface SessionSidebarProps {
  sessions: CollaborateSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionSidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const projectSessions = filtered.filter((s) => s.initiativeId);
  const plainSessions = filtered.filter((s) => !s.initiativeId);

  const atCapacity = sessions.length >= MAX_SESSIONS;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Collaborate</span>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onNewSession}
              disabled={atCapacity}
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-4" />
            </Button>
          </TooltipTrigger>
          {atCapacity && (
            <TooltipContent side="right">
              Maximum 10 sessions. Close one to start a new session.
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-7 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {sessions.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No sessions yet. Start one below.
          </p>
        )}

        {/* Projects section */}
        {projectSessions.length > 0 && (
          <div className="mb-2">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Projects
            </p>
            {projectSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={() => onSelectSession(session.id)}
                onDelete={() => onDeleteSession(session.id)}
              />
            ))}
          </div>
        )}

        {/* Sessions section */}
        {plainSessions.length > 0 && (
          <div>
            {projectSessions.length > 0 && (
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sessions
              </p>
            )}
            {plainSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={() => onSelectSession(session.id)}
                onDelete={() => onDeleteSession(session.id)}
              />
            ))}
          </div>
        )}

        {filtered.length === 0 && sessions.length > 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No sessions match your search.
          </p>
        )}
      </div>

      {/* Footer count */}
      {sessions.length > 0 && (
        <div className="border-t border-border px-3 py-2">
          <p className="text-[10px] text-muted-foreground">
            {sessions.length}/{MAX_SESSIONS} sessions
          </p>
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// SessionItem
// ---------------------------------------------------------------------------

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: CollaborateSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const firstUserMsg = session.messages.find((m) => m.role === "user");
  const snippet = firstUserMsg
    ? firstUserMsg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("")
        .slice(0, 60)
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      className={`group relative flex flex-col gap-0.5 rounded-md px-2.5 py-2 cursor-pointer mb-0.5 transition-colors ${
        isActive
          ? "bg-primary/10 text-primary"
          : "hover:bg-accent text-foreground"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {session.initiativeId ? (
            <Rocket className="size-3 shrink-0 mt-0.5 text-primary/70" />
          ) : (
            <MessageSquare className="size-3 shrink-0 mt-0.5 text-muted-foreground" />
          )}
          <span className="truncate text-xs font-medium leading-snug">
            {session.title}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          aria-label="Delete session"
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      {session.initiativeId && session.initiativeTitle && (
        <Link
          href={`/initiatives/${session.initiativeId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors ml-4.5"
        >
          <ExternalLink className="size-2.5" />
          <span className="truncate">{session.initiativeTitle}</span>
        </Link>
      )}

      {snippet && (
        <p className="ml-4.5 truncate text-[10px] text-muted-foreground">
          {snippet}
        </p>
      )}

      <p className="ml-4.5 text-[10px] text-muted-foreground">
        {formatDistanceToNow(session.createdAt, { addSuffix: true })}
      </p>
    </div>
  );
}
