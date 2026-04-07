"use server";

import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Workspace } from "@/types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

const WORKSPACE_COOKIE = "hybrid-os-active-workspace";

// ------------------------------------------------------------
// Mock helpers
// ------------------------------------------------------------

const mockWorkspaces: Workspace[] = [
  {
    id: "ws-001",
    name: "Hybrid Marketing",
    slug: "hybrid-marketing",
    logo_url: undefined,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "ws-002",
    name: "Acme Corp",
    slug: "acme-corp",
    logo_url: undefined,
    created_at: "2026-02-20T00:00:00Z",
    updated_at: "2026-03-10T00:00:00Z",
  },
];

// ------------------------------------------------------------
// Server Actions
// ------------------------------------------------------------

export async function getWorkspaces(): Promise<ActionResult<Workspace[]>> {
  if (!isSupabaseConfigured) {
    return { data: mockWorkspaces };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Not authenticated." };
    }

    // Get workspace IDs from memberships
    const { data: memberships, error: memError } = await supabase
      .from("workspace_memberships")
      .select("workspace_id")
      .eq("user_id", user.id);

    if (memError) {
      return { error: "Failed to load workspaces." };
    }

    const workspaceIds = (memberships ?? []).map((m) => m.workspace_id);

    if (workspaceIds.length === 0) {
      return { data: [] };
    }

    const { data: workspaces, error: wsError } = await supabase
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds)
      .order("name");

    if (wsError) {
      return { error: "Failed to load workspaces." };
    }

    return { data: workspaces ?? [] };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

export async function switchWorkspace(
  workspaceId: string
): Promise<ActionResult<{ switched: true }>> {
  if (!workspaceId) {
    return { error: "Workspace ID is required." };
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      sameSite: "lax",
    });

    return { data: { switched: true } };
  } catch {
    return { error: "Failed to switch workspace." };
  }
}

export async function getCurrentWorkspace(): Promise<ActionResult<Workspace>> {
  if (!isSupabaseConfigured) {
    // Check if there's a cookie set
    const cookieStore = await cookies();
    const stored = cookieStore.get(WORKSPACE_COOKIE)?.value;
    const match = mockWorkspaces.find((w) => w.id === stored);
    return { data: match ?? mockWorkspaces[0] };
  }

  try {
    const cookieStore = await cookies();
    const storedId = cookieStore.get(WORKSPACE_COOKIE)?.value;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Not authenticated." };
    }

    // If we have a stored workspace, try to fetch it
    if (storedId) {
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", storedId)
        .single();

      if (workspace) {
        return { data: workspace };
      }
    }

    // Fallback: get the first workspace the user belongs to
    const { data: membership } = await supabase
      .from("workspace_memberships")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership) {
      return { error: "No workspace found." };
    }

    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", membership.workspace_id)
      .single();

    if (wsError || !workspace) {
      return { error: "Failed to load workspace." };
    }

    return { data: workspace };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}
