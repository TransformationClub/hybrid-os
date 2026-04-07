"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface SaveChatMessageParams {
  initiativeId: string;
  workspaceId: string;
  role: "user" | "assistant";
  content: string;
  parts: unknown[];
  toolInvocations?: unknown;
  metadata?: Record<string, unknown>;
}

interface PersistedChatMessage {
  id: string;
  initiative_id: string;
  workspace_id: string;
  role: "user" | "assistant";
  content: string;
  parts: unknown[];
  tool_invocations: unknown | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

// ------------------------------------------------------------
// saveChatMessage
// ------------------------------------------------------------

export async function saveChatMessage(
  params: SaveChatMessageParams
): Promise<ActionResult<{ id: string }>> {
  if (!isSupabaseConfigured) {
    // No-op when Supabase is not configured
    return { data: { id: "mock-msg-" + Date.now() } };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        initiative_id: params.initiativeId,
        workspace_id: params.workspaceId,
        role: params.role,
        content: params.content,
        parts: params.parts,
        tool_invocations: params.toolInvocations ?? null,
        metadata: params.metadata ?? {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("[saveChatMessage] Supabase error:", error.message);
      return { error: error.message };
    }

    return { data: { id: data.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[saveChatMessage] Error:", message);
    return { error: message };
  }
}

// ------------------------------------------------------------
// getChatHistory
// ------------------------------------------------------------

export async function getChatHistory(
  initiativeId: string,
  limit = 50
): Promise<ActionResult<PersistedChatMessage[]>> {
  if (!isSupabaseConfigured) {
    // Return empty array when Supabase is not configured
    return { data: [] };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("initiative_id", initiativeId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[getChatHistory] Supabase error:", error.message);
      return { error: error.message };
    }

    return { data: (data ?? []) as PersistedChatMessage[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[getChatHistory] Error:", message);
    return { error: message };
  }
}
