"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Comment } from "./types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface CreateCommentParams {
  workspaceId: string;
  entityType: "work_item" | "knowledge_object" | "initiative";
  entityId: string;
  authorId: string;
  authorName: string;
  content: string;
}

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/** Extract @mention user IDs from comment content */
function parseMentions(content: string): string[] {
  const mentionRegex = /@(\S+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

// ------------------------------------------------------------
// Mock helpers (used when Supabase is not configured)
// ------------------------------------------------------------

const MOCK_COMMENTS: Comment[] = [
  {
    id: "mock-comment-1",
    workspace_id: "mock-workspace",
    entity_type: "initiative",
    entity_id: "mock-entity",
    author_id: "user-1",
    author_name: "Luke Summerfield",
    content:
      "Great progress on this initiative. @sarah can you review the latest draft?",
    mentions: ["sarah"],
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "mock-comment-2",
    workspace_id: "mock-workspace",
    entity_type: "initiative",
    entity_id: "mock-entity",
    author_id: "user-2",
    author_name: "Sarah Chen",
    author_avatar: undefined,
    content:
      "Reviewed and looks solid. A few tweaks on the messaging pillars - see inline notes.",
    mentions: [],
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "mock-comment-3",
    workspace_id: "mock-workspace",
    entity_type: "initiative",
    entity_id: "mock-entity",
    author_id: "user-1",
    author_name: "Luke Summerfield",
    content: "Updated. @sarah @mike ready for final sign-off.",
    mentions: ["sarah", "mike"],
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

function mockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: crypto.randomUUID(),
    workspace_id: "mock-workspace",
    entity_type: "initiative",
    entity_id: "mock-entity",
    author_id: "mock-user",
    author_name: "Mock User",
    content: "",
    mentions: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ------------------------------------------------------------
// CRUD
// ------------------------------------------------------------

export async function createComment(
  params: CreateCommentParams
): Promise<ActionResult<Comment>> {
  const mentions = parseMentions(params.content);

  if (!isSupabaseConfigured) {
    return {
      data: mockComment({
        workspace_id: params.workspaceId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        author_id: params.authorId,
        author_name: params.authorName,
        content: params.content,
        mentions,
      }),
    };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("comments")
      .insert({
        workspace_id: params.workspaceId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        author_id: params.authorId,
        author_name: params.authorName,
        content: params.content,
        mentions,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Comment };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create comment",
    };
  }
}

export async function getComments(
  entityType: "work_item" | "knowledge_object" | "initiative",
  entityId: string
): Promise<ActionResult<Comment[]>> {
  if (!isSupabaseConfigured) {
    const filtered = MOCK_COMMENTS.filter(
      (c) => c.entity_type === entityType || c.entity_id === entityId
    );
    return { data: filtered.length > 0 ? filtered : MOCK_COMMENTS };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { data: (data ?? []) as Comment[] };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to fetch comments",
    };
  }
}

export async function deleteComment(
  commentId: string
): Promise<ActionResult<{ success: boolean }>> {
  if (!isSupabaseConfigured) {
    return { data: { success: true } };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      return { error: error.message };
    }

    return { data: { success: true } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete comment",
    };
  }
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<ActionResult<Comment>> {
  const mentions = parseMentions(content);

  if (!isSupabaseConfigured) {
    return {
      data: mockComment({
        id: commentId,
        content,
        mentions,
        updated_at: new Date().toISOString(),
      }),
    };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("comments")
      .update({
        content,
        mentions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Comment };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update comment",
    };
  }
}
