"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  invited_by: string;
  status: "pending" | "accepted" | "expired";
  token: string;
  expires_at: string;
  created_at: string;
}

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

// ------------------------------------------------------------
// Mock data
// ------------------------------------------------------------

const mockInvitations: Invitation[] = [
  {
    id: "inv-001",
    workspace_id: "ws-001",
    email: "alex@example.com",
    role: "operator",
    invited_by: "u1",
    status: "pending",
    token: "mock-token-001",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ------------------------------------------------------------
// Server Actions
// ------------------------------------------------------------

export async function inviteTeamMember(
  workspaceId: string,
  email: string,
  role: string,
  csrfToken?: string
): Promise<ActionResult<Invitation>> {
  // CSRF protection
  if (csrfToken) {
    const { validateCsrfToken } = await import("@/lib/security/csrf");
    const valid = await validateCsrfToken(csrfToken);
    if (!valid) {
      return { error: "Invalid request" };
    }
  }

  if (!email || !workspaceId || !role) {
    return { error: "Workspace ID, email, and role are required." };
  }

  if (!isSupabaseConfigured) {
    const invitation: Invitation = {
      id: `inv-${crypto.randomUUID().slice(0, 8)}`,
      workspace_id: workspaceId,
      email,
      role,
      invited_by: "mock-user",
      status: "pending",
      token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };
    return { data: invitation };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated." };
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("invitations")
      .insert({
        workspace_id: workspaceId,
        email,
        role,
        invited_by: user.id,
        status: "pending",
        token,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // In production, send an invite email here via Supabase Edge Function or similar
    // For now the record creation is sufficient

    return { data: data as Invitation };
  } catch {
    return { error: "Failed to send invitation." };
  }
}

export async function getInvitations(
  workspaceId: string
): Promise<ActionResult<Invitation[]>> {
  if (!workspaceId) {
    return { error: "Workspace ID is required." };
  }

  if (!isSupabaseConfigured) {
    return { data: mockInvitations };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data: (data ?? []) as Invitation[] };
  } catch {
    return { error: "Failed to load invitations." };
  }
}

export async function revokeInvitation(
  invitationId: string
): Promise<ActionResult<{ revoked: true }>> {
  if (!invitationId) {
    return { error: "Invitation ID is required." };
  }

  if (!isSupabaseConfigured) {
    return { data: { revoked: true } };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitationId);

    if (error) {
      return { error: error.message };
    }

    return { data: { revoked: true } };
  } catch {
    return { error: "Failed to revoke invitation." };
  }
}
