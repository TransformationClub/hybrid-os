"use client";

import * as React from "react";
import {
  Bot,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppEvent, EventType } from "@/types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface ActivityFeedProps {
  events: AppEvent[];
  isLoading?: boolean;
  /** If true, renders as a collapsible panel */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function getEventIcon(type: EventType) {
  switch (type) {
    case "work_item.created":
    case "work_item.updated":
      return ClipboardList;
    case "approval.requested":
    case "approval.resolved":
      return ShieldCheck;
    case "agent.run_started":
    case "agent.run_completed":
    case "agent.run_failed":
      return Bot;
    case "initiative.created":
    case "initiative.updated":
      return Zap;
    case "knowledge.created":
    case "knowledge.updated":
      return MessageSquare;
    case "skill.executed":
      return CheckCircle2;
    default:
      return Zap;
  }
}

function getEventColor(type: EventType): string {
  if (type.startsWith("agent.run_failed") || type === "system.error") {
    return "text-destructive";
  }
  if (type.includes("completed") || type.includes("resolved") || type.includes("approved")) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (type.includes("requested") || type.includes("started")) {
    return "text-amber-600 dark:text-amber-400";
  }
  return "text-primary/60";
}

function describeEvent(event: AppEvent): string {
  const meta = (event.metadata ?? {}) as Record<string, unknown>;
  const title = (meta.title as string) ?? "";
  const action = (meta.action as string) ?? "";
  const actor = event.actor_id === "system" ? "System" : event.actor_id;

  switch (event.type) {
    case "work_item.created":
      return `${actor} created work item "${title || "Untitled"}"`;
    case "work_item.updated": {
      const newStatus = meta.new_status as string;
      if (newStatus) {
        return `${actor} moved "${title || "item"}" to ${newStatus.replace("_", " ")}`;
      }
      return `${actor} updated "${title || "item"}"`;
    }
    case "approval.requested":
      return `${actor} requested approval for "${title || "item"}"`;
    case "approval.resolved":
      return `${actor} ${action || "resolved"} "${title || "item"}"`;
    case "agent.run_started":
      return `Agent ${actor} started a run`;
    case "agent.run_completed": {
      const summary = meta.summary as string;
      return summary
        ? `Agent ${actor} completed: ${summary.slice(0, 80)}`
        : `Agent ${actor} completed a run`;
    }
    case "agent.run_failed":
      return `Agent ${actor} run failed`;
    case "initiative.created":
      return `Initiative created`;
    case "initiative.updated":
      return `Initiative updated`;
    case "knowledge.created":
      return `Knowledge object added`;
    case "knowledge.updated":
      return `Knowledge object updated`;
    case "skill.executed":
      return `Skill executed by ${actor}`;
    default:
      return `${event.type.replace(/[._]/g, " ")} by ${actor}`;
  }
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export function ActivityFeed({
  events,
  isLoading = false,
  collapsible = false,
  defaultCollapsed = true,
}: ActivityFeedProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const header = (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
      {collapsible && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand activity feed" : "Collapse activity feed"}
        >
          {collapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );

  if (collapsible && collapsed) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        {header}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      {header}

      {isLoading && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Loading activity...
        </p>
      )}

      {!isLoading && events.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No recent activity for this initiative.
        </p>
      )}

      {!isLoading && events.length > 0 && (
        <div className="mt-3 space-y-0">
          {events.map((event, idx) => {
            const Icon = getEventIcon(event.type);
            const color = getEventColor(event.type);
            const isLast = idx === events.length - 1;

            return (
              <div key={event.id} className="flex gap-3">
                {/* Timeline line + icon */}
                <div className="flex flex-col items-center">
                  <div className={`rounded-full p-1 ${color}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-4"}`}>
                  <p className="text-sm text-foreground/90 leading-snug">
                    {describeEvent(event)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatRelativeTime(event.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
