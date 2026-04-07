"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Approval, ApprovalStatus, ApprovalCategory } from "@/types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface CreateApprovalParams {
  workspaceId: string;
  initiativeId: string;
  title: string;
  description: string;
  category: ApprovalCategory;
  requestedBy: string;
  workItemId?: string;
  metadata?: Record<string, unknown>;
}

interface ResolveApprovalParams {
  approvalId: string;
  status: "approved" | "rejected" | "changes_requested";
  reviewedBy: string;
  feedback?: string;
  csrfToken?: string;
}

interface GetApprovalsParams {
  workspaceId: string;
  status?: ApprovalStatus;
  initiativeId?: string;
  category?: ApprovalCategory;
  limit?: number;
}

interface BatchResolveParams {
  approvalIds: string[];
  status: "approved" | "rejected" | "changes_requested";
  reviewedBy: string;
  feedback?: string;
}

type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string };

// ------------------------------------------------------------
// Mock helpers (used when Supabase is not configured)
// ------------------------------------------------------------

function mockApproval(overrides: Partial<Approval> = {}): Approval {
  return {
    id: crypto.randomUUID(),
    initiative_id: "mock-initiative",
    category: "content",
    title: "Mock Approval",
    status: "pending",
    requested_by: "system",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ------------------------------------------------------------
// Server Actions
// ------------------------------------------------------------

export async function createApproval(
  params: CreateApprovalParams
): Promise<ActionResult<Approval>> {
  if (!isSupabaseConfigured) {
    return {
      data: mockApproval({
        initiative_id: params.initiativeId,
        title: params.title,
        description: params.description,
        category: params.category,
        requested_by: params.requestedBy,
        work_item_id: params.workItemId,
      }),
    };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("approvals")
      .insert({
        initiative_id: params.initiativeId,
        title: params.title,
        description: params.description,
        category: params.category,
        requested_by: params.requestedBy,
        work_item_id: params.workItemId ?? null,
        metadata: params.metadata ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Approval };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create approval" };
  }
}

export async function resolveApproval(
  params: ResolveApprovalParams
): Promise<ActionResult<Approval>> {
  // CSRF protection for this sensitive action
  if (params.csrfToken) {
    const { validateCsrfToken } = await import("@/lib/security/csrf");
    const valid = await validateCsrfToken(params.csrfToken);
    if (!valid) {
      return { error: "Invalid request" };
    }
  }

  if (!isSupabaseConfigured) {
    return {
      data: mockApproval({
        id: params.approvalId,
        status: params.status,
        reviewed_by: params.reviewedBy,
        resolved_at: new Date().toISOString(),
      }),
    };
  }

  try {
    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {
      status: params.status,
      reviewed_by: params.reviewedBy,
      resolved_at: new Date().toISOString(),
    };

    if (params.feedback) {
      updatePayload.metadata = { feedback: params.feedback };
    }

    const { data, error } = await supabase
      .from("approvals")
      .update(updatePayload)
      .eq("id", params.approvalId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Approval };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to resolve approval" };
  }
}

export async function getApprovals(
  params: GetApprovalsParams
): Promise<ActionResult<Approval[]>> {
  if (!isSupabaseConfigured) {
    const mocks = Array.from({ length: 3 }, (_, i) =>
      mockApproval({
        title: `Mock Approval ${i + 1}`,
        status: params.status ?? "pending",
        category: params.category ?? "content",
      })
    );
    return { data: mocks };
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from("approvals")
      .select("*, initiatives!inner(workspace_id)")
      .eq("initiatives.workspace_id", params.workspaceId)
      .order("created_at", { ascending: false })
      .limit(params.limit ?? 50);

    if (params.status) {
      query = query.eq("status", params.status);
    }
    if (params.initiativeId) {
      query = query.eq("initiative_id", params.initiativeId);
    }
    if (params.category) {
      query = query.eq("category", params.category);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: data as Approval[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch approvals" };
  }
}

export async function getPendingApprovalsCount(
  workspaceId: string
): Promise<ActionResult<number>> {
  if (!isSupabaseConfigured) {
    return { data: 5 };
  }

  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("approvals")
      .select("id, initiatives!inner(workspace_id)", { count: "exact", head: true })
      .eq("initiatives.workspace_id", workspaceId)
      .eq("status", "pending");

    if (error) {
      return { error: error.message };
    }

    return { data: count ?? 0 };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to count pending approvals" };
  }
}

export async function batchResolveApprovals(
  params: BatchResolveParams
): Promise<ActionResult<Approval[]>> {
  if (!isSupabaseConfigured) {
    const mocks = params.approvalIds.map((id) =>
      mockApproval({
        id,
        status: params.status,
        reviewed_by: params.reviewedBy,
        resolved_at: new Date().toISOString(),
      })
    );
    return { data: mocks };
  }

  try {
    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {
      status: params.status,
      reviewed_by: params.reviewedBy,
      resolved_at: new Date().toISOString(),
    };

    if (params.feedback) {
      updatePayload.metadata = { feedback: params.feedback };
    }

    const { data, error } = await supabase
      .from("approvals")
      .update(updatePayload)
      .in("id", params.approvalIds)
      .select();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Approval[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to batch resolve approvals" };
  }
}
