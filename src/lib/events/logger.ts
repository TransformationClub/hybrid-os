import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AppEvent } from "@/types";

// ------------------------------------------------------------
// Event logger — utility functions for writing to the events table.
// These are server-side helpers, not server actions.
// ------------------------------------------------------------

type ActorType = AppEvent["actor_type"];

interface LogEventParams {
  workspaceId: string;
  type: string;
  actorType: ActorType;
  actorId: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a single event row. Silently no-ops when Supabase is not
 * configured and never throws — errors are logged to the console.
 */
export async function logEvent({
  workspaceId,
  type,
  actorType,
  actorId,
  entityType,
  entityId,
  metadata,
}: LogEventParams): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("events").insert({
      workspace_id: workspaceId,
      type,
      actor_type: actorType,
      actor_id: actorId,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? null,
    });

    if (error) {
      console.error("[events/logger] Failed to insert event:", error.message);
    }
  } catch (err) {
    console.error("[events/logger] Unexpected error logging event:", err);
  }
}

// ------------------------------------------------------------
// Convenience wrappers
// ------------------------------------------------------------

type ApprovalAction = "created" | "approved" | "rejected" | "changes_requested";

export async function logApprovalEvent(
  workspaceId: string,
  approvalId: string,
  action: ApprovalAction,
  actorType: ActorType,
  actorId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const typeMap: Record<ApprovalAction, string> = {
    created: "approval.requested",
    approved: "approval.resolved",
    rejected: "approval.resolved",
    changes_requested: "approval.resolved",
  };

  await logEvent({
    workspaceId,
    type: typeMap[action],
    actorType,
    actorId,
    entityType: "approval",
    entityId: approvalId,
    metadata: { action, ...metadata },
  });
}

type WorkItemAction = "created" | "updated" | "status_changed" | "assigned";

export async function logWorkItemEvent(
  workspaceId: string,
  workItemId: string,
  action: WorkItemAction,
  actorType: ActorType,
  actorId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const typeMap: Record<WorkItemAction, string> = {
    created: "work_item.created",
    updated: "work_item.updated",
    status_changed: "work_item.updated",
    assigned: "work_item.updated",
  };

  await logEvent({
    workspaceId,
    type: typeMap[action],
    actorType,
    actorId,
    entityType: "work_item",
    entityId: workItemId,
    metadata: { action, ...metadata },
  });
}

type AgentAction = "started" | "completed" | "failed" | "cancelled";

export async function logAgentEvent(
  workspaceId: string,
  agentRunId: string,
  action: AgentAction,
  actorType: ActorType,
  actorId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const typeMap: Record<AgentAction, string> = {
    started: "agent.run_started",
    completed: "agent.run_completed",
    failed: "agent.run_failed",
    cancelled: "agent.run_failed",
  };

  await logEvent({
    workspaceId,
    type: typeMap[action],
    actorType,
    actorId,
    entityType: "agent_run",
    entityId: agentRunId,
    metadata: { action, ...metadata },
  });
}

// ------------------------------------------------------------
// Query helper
// ------------------------------------------------------------

// ------------------------------------------------------------
// Mock events for non-Supabase mode
// ------------------------------------------------------------

function generateMockEvents(initiativeId?: string): AppEvent[] {
  const baseId = initiativeId ?? "init-001";
  const now = new Date();

  const events: AppEvent[] = [
    {
      id: "evt-001",
      workspace_id: "mock-workspace",
      type: "work_item.created",
      actor_type: "agent",
      actor_id: "Campaign Strategist",
      entity_type: "work_item",
      entity_id: "wi-002",
      metadata: { action: "created", initiative_id: baseId, type: "deliverable", title: "Draft AEO content briefs for top 10 keywords" },
      created_at: new Date(now.getTime() - 3600000).toISOString(),
    },
    {
      id: "evt-002",
      workspace_id: "mock-workspace",
      type: "work_item.updated",
      actor_type: "user",
      actor_id: "mock-user",
      entity_type: "work_item",
      entity_id: "wi-001",
      metadata: { action: "status_changed", new_status: "done", initiative_id: baseId, title: "Research top 20 AEO keywords" },
      created_at: new Date(now.getTime() - 7200000).toISOString(),
    },
    {
      id: "evt-003",
      workspace_id: "mock-workspace",
      type: "approval.requested",
      actor_type: "agent",
      actor_id: "Content Writer",
      entity_type: "approval",
      entity_id: "appr-001",
      metadata: { action: "created", initiative_id: baseId, title: "Review content brief batch 1" },
      created_at: new Date(now.getTime() - 14400000).toISOString(),
    },
    {
      id: "evt-004",
      workspace_id: "mock-workspace",
      type: "agent.run_completed",
      actor_type: "agent",
      actor_id: "Researcher",
      entity_type: "agent_run",
      entity_id: "run-001",
      metadata: { action: "completed", initiative_id: baseId, summary: "Analyzed top 20 AEO keywords with competitive scores" },
      created_at: new Date(now.getTime() - 28800000).toISOString(),
    },
    {
      id: "evt-005",
      workspace_id: "mock-workspace",
      type: "work_item.created",
      actor_type: "user",
      actor_id: "mock-user",
      entity_type: "work_item",
      entity_id: "wi-004",
      metadata: { action: "created", initiative_id: baseId, type: "deliverable", title: "Write first batch of 5 AEO articles" },
      created_at: new Date(now.getTime() - 43200000).toISOString(),
    },
    {
      id: "evt-006",
      workspace_id: "mock-workspace",
      type: "approval.resolved",
      actor_type: "user",
      actor_id: "mock-user",
      entity_type: "approval",
      entity_id: "appr-002",
      metadata: { action: "approved", initiative_id: baseId, title: "Keyword research methodology" },
      created_at: new Date(now.getTime() - 86400000).toISOString(),
    },
  ];

  if (initiativeId) {
    return events.filter(
      (e) => (e.metadata as Record<string, unknown>)?.initiative_id === initiativeId
    );
  }

  return events;
}

/**
 * Fetch recent events for a workspace. Returns mock data when
 * Supabase is not configured.
 */
export async function getRecentEvents(
  workspaceId: string,
  limit = 30,
  entityType?: string,
  entityId?: string,
  initiativeId?: string,
): Promise<AppEvent[]> {
  if (!isSupabaseConfigured) return generateMockEvents(initiativeId).slice(0, limit);

  try {
    const supabase = await createClient();

    let query = supabase
      .from("events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    // Filter by initiative_id in metadata using Supabase JSON operator
    if (initiativeId) {
      query = query.contains("metadata", { initiative_id: initiativeId });
    }

    const { data, error } = await query;

    if (error) {
      console.error("[events/logger] Failed to fetch events:", error.message);
      return [];
    }

    return (data ?? []) as AppEvent[];
  } catch (err) {
    console.error("[events/logger] Unexpected error fetching events:", err);
    return [];
  }
}
