"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { logWorkItemEvent } from "@/lib/events/logger";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import type {
  Initiative,
  InitiativeType,
  InitiativeStatus,
  WorkItem,
  WorkItemType,
  WorkItemStatus,
} from "@/types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface CreateInitiativeParams {
  workspaceId: string;
  name: string;
  type: InitiativeType;
  goal: string;
  brief?: string;
  successCriteria?: string;
}

interface UpdateInitiativeParams {
  initiativeId: string;
  name?: string;
  type?: InitiativeType;
  goal?: string;
  brief?: string;
  successCriteria?: string;
  status?: InitiativeStatus;
}

interface CreateWorkItemParams {
  initiativeId: string;
  title: string;
  description?: string;
  type: WorkItemType;
  status?: WorkItemStatus;
  priority?: "low" | "medium" | "high";
  assignedTo?: string;
  assignedAgent?: string;
  dueDate?: string;
}

interface UpdateWorkItemParams {
  workItemId: string;
  title?: string;
  description?: string;
  type?: WorkItemType;
  status?: WorkItemStatus;
  priority?: "low" | "medium" | "high";
  assignedTo?: string;
  assignedAgent?: string;
  dueDate?: string;
}

interface MoveWorkItemParams {
  workItemId: string;
  newStatus: WorkItemStatus;
}

type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string };

// ------------------------------------------------------------
// Mock data (used when Supabase is not configured)
// ------------------------------------------------------------

const MOCK_WORKSPACE_ID = "mock-workspace";
const MOCK_USER_ID = "mock-user";

const MOCK_INITIATIVES: Initiative[] = [
  {
    id: "init-001",
    workspace_id: MOCK_WORKSPACE_ID,
    title: "Q2 AEO Content Campaign",
    type: "aeo-campaign",
    status: "active",
    goal: "Increase AI Engine Optimization visibility for top 20 product keywords",
    brief: "Create a series of long-form guides, comparison pages, and FAQ content optimized for AI engine citation.",
    success_criteria: "Achieve 15% increase in AI-cited mentions within 90 days",
    created_by: MOCK_USER_ID,
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-04-01T14:30:00Z",
  },
  {
    id: "init-002",
    workspace_id: MOCK_WORKSPACE_ID,
    title: "Enterprise ABM - Acme Corp",
    type: "abm-campaign",
    status: "planning",
    goal: "Land Acme Corp as a new enterprise account through targeted multi-channel outreach",
    brief: "Personalized ABM play targeting 5 key decision-makers at Acme Corp across LinkedIn, email, and direct mail.",
    success_criteria: "Book 3 meetings with director+ stakeholders by end of Q2",
    created_by: MOCK_USER_ID,
    created_at: "2026-03-20T09:00:00Z",
    updated_at: "2026-03-28T11:00:00Z",
  },
  {
    id: "init-003",
    workspace_id: MOCK_WORKSPACE_ID,
    title: "Product Launch - Feature X",
    type: "custom",
    status: "draft",
    goal: "Drive awareness and adoption of Feature X among existing customers",
    success_criteria: "500 feature activations in first 30 days post-launch",
    created_by: MOCK_USER_ID,
    created_at: "2026-04-02T08:00:00Z",
    updated_at: "2026-04-02T08:00:00Z",
  },
];

const MOCK_WORK_ITEMS: WorkItem[] = [
  {
    id: "wi-001",
    initiative_id: "init-001",
    title: "Research top 20 AEO keywords",
    description: "Analyze search and AI citation data to identify the highest-value keywords for optimization.",
    type: "task",
    status: "done",
    assigned_agent: "Researcher",
    created_at: "2026-03-16T10:00:00Z",
    updated_at: "2026-03-20T16:00:00Z",
  },
  {
    id: "wi-002",
    initiative_id: "init-001",
    title: "Draft AEO content briefs for top 10 keywords",
    description: "Create detailed content briefs including structure, sources, and target AI engines.",
    type: "deliverable",
    status: "in_progress",
    assigned_agent: "Campaign Strategist",
    due_date: "2026-04-10T00:00:00Z",
    created_at: "2026-03-21T09:00:00Z",
    updated_at: "2026-04-03T11:00:00Z",
  },
  {
    id: "wi-003",
    initiative_id: "init-001",
    title: "Review and approve content briefs",
    type: "approval",
    status: "todo",
    assigned_to: MOCK_USER_ID,
    due_date: "2026-04-12T00:00:00Z",
    created_at: "2026-03-21T09:30:00Z",
    updated_at: "2026-03-21T09:30:00Z",
  },
  {
    id: "wi-004",
    initiative_id: "init-001",
    title: "Write first batch of 5 AEO articles",
    type: "deliverable",
    status: "backlog",
    assigned_agent: "Content Writer",
    due_date: "2026-04-20T00:00:00Z",
    created_at: "2026-03-22T10:00:00Z",
    updated_at: "2026-03-22T10:00:00Z",
  },
  {
    id: "wi-005",
    initiative_id: "init-002",
    title: "Build Acme Corp account dossier",
    description: "Compile org chart, tech stack, recent news, and pain points for Acme Corp.",
    type: "task",
    status: "in_progress",
    assigned_agent: "Researcher",
    due_date: "2026-04-08T00:00:00Z",
    created_at: "2026-03-21T14:00:00Z",
    updated_at: "2026-04-04T09:00:00Z",
  },
  {
    id: "wi-006",
    initiative_id: "init-002",
    title: "Design personalized email sequence",
    type: "deliverable",
    status: "todo",
    assigned_agent: "Content Writer",
    due_date: "2026-04-14T00:00:00Z",
    created_at: "2026-03-22T10:00:00Z",
    updated_at: "2026-03-22T10:00:00Z",
  },
  {
    id: "wi-007",
    initiative_id: "init-002",
    title: "Waiting on CRM access for Acme data",
    type: "blocker",
    status: "blocked",
    assigned_to: MOCK_USER_ID,
    created_at: "2026-03-25T11:00:00Z",
    updated_at: "2026-03-25T11:00:00Z",
  },
  {
    id: "wi-008",
    initiative_id: "init-003",
    title: "Draft Feature X launch messaging",
    description: "Create positioning, value props, and headline options for the launch.",
    type: "deliverable",
    status: "todo",
    assigned_agent: "Campaign Strategist",
    due_date: "2026-04-15T00:00:00Z",
    created_at: "2026-04-02T09:00:00Z",
    updated_at: "2026-04-02T09:00:00Z",
  },
];

// ------------------------------------------------------------
// Mock helpers
// ------------------------------------------------------------

function mockInitiative(overrides: Partial<Initiative> = {}): Initiative {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    workspace_id: MOCK_WORKSPACE_ID,
    title: "New Initiative",
    type: "custom",
    status: "draft",
    created_by: MOCK_USER_ID,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function mockWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    initiative_id: "init-001",
    title: "New Work Item",
    type: "task",
    status: "todo",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ------------------------------------------------------------
// Initiative CRUD
// ------------------------------------------------------------

export async function createInitiative(
  params: CreateInitiativeParams
): Promise<ActionResult<Initiative>> {
  if (!isSupabaseConfigured) {
    return {
      data: mockInitiative({
        workspace_id: params.workspaceId,
        title: params.name,
        type: params.type,
        goal: params.goal,
        brief: params.brief,
        success_criteria: params.successCriteria,
      }),
    };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("initiatives")
      .insert({
        workspace_id: params.workspaceId,
        title: params.name,
        type: params.type,
        status: "draft" as InitiativeStatus,
        goal: params.goal,
        brief: params.brief ?? null,
        success_criteria: params.successCriteria ?? null,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Initiative };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create initiative" };
  }
}

export async function updateInitiative(
  params: UpdateInitiativeParams
): Promise<ActionResult<Initiative>> {
  if (!isSupabaseConfigured) {
    const existing = MOCK_INITIATIVES.find((i) => i.id === params.initiativeId);
    return {
      data: mockInitiative({
        ...(existing ?? {}),
        id: params.initiativeId,
        title: params.name ?? existing?.title,
        type: params.type ?? existing?.type,
        goal: params.goal ?? existing?.goal,
        brief: params.brief ?? existing?.brief,
        success_criteria: params.successCriteria ?? existing?.success_criteria,
        status: params.status ?? existing?.status,
        updated_at: new Date().toISOString(),
      }),
    };
  }

  try {
    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (params.name !== undefined) updatePayload.title = params.name;
    if (params.type !== undefined) updatePayload.type = params.type;
    if (params.goal !== undefined) updatePayload.goal = params.goal;
    if (params.brief !== undefined) updatePayload.brief = params.brief;
    if (params.successCriteria !== undefined) updatePayload.success_criteria = params.successCriteria;
    if (params.status !== undefined) updatePayload.status = params.status;

    const { data, error } = await supabase
      .from("initiatives")
      .update(updatePayload)
      .eq("id", params.initiativeId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Initiative };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update initiative" };
  }
}

export async function archiveInitiative(
  initiativeId: string
): Promise<ActionResult<{ success: boolean }>> {
  if (!isSupabaseConfigured) {
    return { data: { success: true } };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("initiatives")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", initiativeId);

    if (error) {
      return { error: error.message };
    }

    return { data: { success: true } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to archive initiative" };
  }
}

export async function deleteInitiative(
  initiativeId: string
): Promise<ActionResult<{ success: boolean }>> {
  if (!isSupabaseConfigured) {
    return { data: { success: true } };
  }

  try {
    const supabase = await createClient();

    // Delete associated work items first
    await supabase
      .from("work_items")
      .delete()
      .eq("initiative_id", initiativeId);

    const { error } = await supabase
      .from("initiatives")
      .delete()
      .eq("id", initiativeId);

    if (error) {
      return { error: error.message };
    }

    return { data: { success: true } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete initiative" };
  }
}

export async function getInitiatives(
  workspaceId: string
): Promise<ActionResult<Initiative[]>> {
  if (!isSupabaseConfigured) {
    const filtered = MOCK_INITIATIVES.filter(
      (i) => i.status !== "archived"
    );
    return { data: filtered };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("initiatives")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data: (data ?? []) as Initiative[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch initiatives" };
  }
}

export async function getInitiative(
  initiativeId: string
): Promise<ActionResult<Initiative>> {
  if (!isSupabaseConfigured) {
    const found = MOCK_INITIATIVES.find((i) => i.id === initiativeId);
    if (!found) {
      return { error: "Initiative not found" };
    }
    return { data: found };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("initiatives")
      .select("*")
      .eq("id", initiativeId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Initiative };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch initiative" };
  }
}

// ------------------------------------------------------------
// Work Item CRUD
// ------------------------------------------------------------

export async function createWorkItem(
  params: CreateWorkItemParams
): Promise<ActionResult<WorkItem>> {
  const status = params.status ?? "todo";

  if (!isSupabaseConfigured) {
    const item = mockWorkItem({
      initiative_id: params.initiativeId,
      title: params.title,
      description: params.description,
      type: params.type,
      status,
      assigned_to: params.assignedTo,
      assigned_agent: params.assignedAgent,
      due_date: params.dueDate,
    });

    // Fire assignment notification in mock mode
    if (params.assignedTo) {
      dispatchNotification(MOCK_WORKSPACE_ID, {
        type: "assignment",
        assigneeUserId: params.assignedTo,
        assignerName: "You",
        workItemTitle: params.title,
        workItemId: item.id,
        initiativeId: params.initiativeId,
      }).catch(() => {});
    }

    return { data: item };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("work_items")
      .insert({
        initiative_id: params.initiativeId,
        title: params.title,
        description: params.description ?? null,
        type: params.type,
        status,
        priority: params.priority ?? null,
        assigned_to: params.assignedTo ?? null,
        assigned_agent: params.assignedAgent ?? null,
        due_date: params.dueDate ?? null,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    const item = data as WorkItem;

    // Look up the initiative to get workspace_id for event logging
    const { data: initiative } = await supabase
      .from("initiatives")
      .select("workspace_id")
      .eq("id", params.initiativeId)
      .single();

    if (initiative) {
      await logWorkItemEvent(
        initiative.workspace_id,
        item.id,
        "created",
        "user",
        "system",
        {
          initiative_id: params.initiativeId,
          type: params.type,
          status,
        },
      );

      // Dispatch assignment notification if work item has an assignee
      if (params.assignedTo) {
        dispatchNotification(initiative.workspace_id, {
          type: "assignment",
          assigneeUserId: params.assignedTo,
          assignerName: "System",
          workItemTitle: params.title,
          workItemId: item.id,
          initiativeId: params.initiativeId,
        }).catch(() => {});
      }
    }

    return { data: item };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create work item" };
  }
}

export async function updateWorkItem(
  params: UpdateWorkItemParams
): Promise<ActionResult<WorkItem>> {
  if (!isSupabaseConfigured) {
    const existing = MOCK_WORK_ITEMS.find((w) => w.id === params.workItemId);
    const item = mockWorkItem({
      ...(existing ?? {}),
      id: params.workItemId,
      title: params.title ?? existing?.title,
      description: params.description ?? existing?.description,
      type: params.type ?? existing?.type,
      status: params.status ?? existing?.status,
      assigned_to: params.assignedTo ?? existing?.assigned_to,
      assigned_agent: params.assignedAgent ?? existing?.assigned_agent,
      due_date: params.dueDate ?? existing?.due_date,
      updated_at: new Date().toISOString(),
    });

    // Fire assignment notification if assignee changed
    if (params.assignedTo && params.assignedTo !== existing?.assigned_to) {
      dispatchNotification(MOCK_WORKSPACE_ID, {
        type: "assignment",
        assigneeUserId: params.assignedTo,
        assignerName: "You",
        workItemTitle: item.title,
        workItemId: item.id,
        initiativeId: item.initiative_id,
      }).catch(() => {});
    }

    return { data: item };
  }

  try {
    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (params.title !== undefined) updatePayload.title = params.title;
    if (params.description !== undefined) updatePayload.description = params.description;
    if (params.type !== undefined) updatePayload.type = params.type;
    if (params.status !== undefined) updatePayload.status = params.status;
    if (params.priority !== undefined) updatePayload.priority = params.priority;
    if (params.assignedTo !== undefined) updatePayload.assigned_to = params.assignedTo;
    if (params.assignedAgent !== undefined) updatePayload.assigned_agent = params.assignedAgent;
    if (params.dueDate !== undefined) updatePayload.due_date = params.dueDate;

    const { data, error } = await supabase
      .from("work_items")
      .update(updatePayload)
      .eq("id", params.workItemId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    const item = data as WorkItem;

    // Log update event
    const { data: initiative } = await supabase
      .from("initiatives")
      .select("workspace_id")
      .eq("id", item.initiative_id)
      .single();

    if (initiative) {
      const action = params.status !== undefined ? "status_changed" : "updated";
      await logWorkItemEvent(
        initiative.workspace_id,
        item.id,
        action,
        "user",
        "system",
        {
          ...(params.status && { new_status: params.status }),
          ...(params.assignedTo && { assigned_to: params.assignedTo }),
          ...(params.assignedAgent && { assigned_agent: params.assignedAgent }),
        },
      );

      // Dispatch assignment notification if assignee changed
      if (params.assignedTo) {
        dispatchNotification(initiative.workspace_id, {
          type: "assignment",
          assigneeUserId: params.assignedTo,
          assignerName: "System",
          workItemTitle: item.title,
          workItemId: item.id,
          initiativeId: item.initiative_id,
        }).catch(() => {});
      }
    }

    return { data: item };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update work item" };
  }
}

export async function deleteWorkItem(
  workItemId: string
): Promise<ActionResult<{ success: boolean }>> {
  if (!isSupabaseConfigured) {
    return { data: { success: true } };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("work_items")
      .delete()
      .eq("id", workItemId);

    if (error) {
      return { error: error.message };
    }

    return { data: { success: true } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete work item" };
  }
}

export async function getWorkItems(
  initiativeId: string
): Promise<ActionResult<WorkItem[]>> {
  if (!isSupabaseConfigured) {
    const filtered = MOCK_WORK_ITEMS.filter(
      (w) => w.initiative_id === initiativeId
    );
    return { data: filtered };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("work_items")
      .select("*")
      .eq("initiative_id", initiativeId)
      .order("created_at", { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { data: (data ?? []) as WorkItem[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch work items" };
  }
}

export async function moveWorkItem(
  params: MoveWorkItemParams
): Promise<ActionResult<WorkItem>> {
  if (!isSupabaseConfigured) {
    const existing = MOCK_WORK_ITEMS.find((w) => w.id === params.workItemId);
    return {
      data: mockWorkItem({
        ...(existing ?? {}),
        id: params.workItemId,
        status: params.newStatus,
        updated_at: new Date().toISOString(),
      }),
    };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("work_items")
      .update({
        status: params.newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.workItemId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    const item = data as WorkItem;

    // Log status change event
    const { data: initiative } = await supabase
      .from("initiatives")
      .select("workspace_id")
      .eq("id", item.initiative_id)
      .single();

    if (initiative) {
      await logWorkItemEvent(
        initiative.workspace_id,
        item.id,
        "status_changed",
        "user",
        "system",
        { new_status: params.newStatus },
      );
    }

    return { data: item };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to move work item" };
  }
}

// ------------------------------------------------------------
// Knowledge Linking (stored in initiative metadata jsonb)
// ------------------------------------------------------------

/** In-memory store for mock mode */
const MOCK_LINKED_KNOWLEDGE: Record<string, string[]> = {};

export async function linkKnowledge(
  initiativeId: string,
  knowledgeObjectId: string
): Promise<ActionResult<{ linked_knowledge: string[] }>> {
  if (!isSupabaseConfigured) {
    const current = MOCK_LINKED_KNOWLEDGE[initiativeId] ?? [];
    if (!current.includes(knowledgeObjectId)) {
      current.push(knowledgeObjectId);
    }
    MOCK_LINKED_KNOWLEDGE[initiativeId] = current;
    return { data: { linked_knowledge: current } };
  }

  try {
    const supabase = await createClient();

    // Fetch current metadata
    const { data: initiative, error: fetchError } = await supabase
      .from("initiatives")
      .select("metadata")
      .eq("id", initiativeId)
      .single();

    if (fetchError) return { error: fetchError.message };

    const metadata = (initiative?.metadata ?? {}) as Record<string, unknown>;
    const linked = Array.isArray(metadata.linked_knowledge)
      ? [...(metadata.linked_knowledge as string[])]
      : [];

    if (!linked.includes(knowledgeObjectId)) {
      linked.push(knowledgeObjectId);
    }

    const { error: updateError } = await supabase
      .from("initiatives")
      .update({
        metadata: { ...metadata, linked_knowledge: linked },
        updated_at: new Date().toISOString(),
      })
      .eq("id", initiativeId);

    if (updateError) return { error: updateError.message };

    return { data: { linked_knowledge: linked } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to link knowledge" };
  }
}

export async function unlinkKnowledge(
  initiativeId: string,
  knowledgeObjectId: string
): Promise<ActionResult<{ linked_knowledge: string[] }>> {
  if (!isSupabaseConfigured) {
    const current = MOCK_LINKED_KNOWLEDGE[initiativeId] ?? [];
    const updated = current.filter((id) => id !== knowledgeObjectId);
    MOCK_LINKED_KNOWLEDGE[initiativeId] = updated;
    return { data: { linked_knowledge: updated } };
  }

  try {
    const supabase = await createClient();

    const { data: initiative, error: fetchError } = await supabase
      .from("initiatives")
      .select("metadata")
      .eq("id", initiativeId)
      .single();

    if (fetchError) return { error: fetchError.message };

    const metadata = (initiative?.metadata ?? {}) as Record<string, unknown>;
    const linked = Array.isArray(metadata.linked_knowledge)
      ? (metadata.linked_knowledge as string[]).filter((id) => id !== knowledgeObjectId)
      : [];

    const { error: updateError } = await supabase
      .from("initiatives")
      .update({
        metadata: { ...metadata, linked_knowledge: linked },
        updated_at: new Date().toISOString(),
      })
      .eq("id", initiativeId);

    if (updateError) return { error: updateError.message };

    return { data: { linked_knowledge: linked } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to unlink knowledge" };
  }
}

export async function getLinkedKnowledge(
  initiativeId: string
): Promise<ActionResult<string[]>> {
  if (!isSupabaseConfigured) {
    return { data: MOCK_LINKED_KNOWLEDGE[initiativeId] ?? [] };
  }

  try {
    const supabase = await createClient();

    const { data: initiative, error } = await supabase
      .from("initiatives")
      .select("metadata")
      .eq("id", initiativeId)
      .single();

    if (error) return { error: error.message };

    const metadata = (initiative?.metadata ?? {}) as Record<string, unknown>;
    const linked = Array.isArray(metadata.linked_knowledge)
      ? (metadata.linked_knowledge as string[])
      : [];

    return { data: linked };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to get linked knowledge" };
  }
}
