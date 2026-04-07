import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";

interface WorkspaceAccessResult {
  allowed: boolean;
  role?: string;
  userId?: string;
}

// ---------------------------------------------------------------------------
// verifyWorkspaceAccess
// ---------------------------------------------------------------------------
export async function verifyWorkspaceAccess(
  workspaceId: string
): Promise<WorkspaceAccessResult> {
  // When Supabase is not configured, allow everything (local dev / mock mode)
  if (!isSupabaseConfigured) {
    return { allowed: true, role: "admin", userId: "mock-user" };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { allowed: false };
    }

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { allowed: false, userId: user.id };
    }

    return {
      allowed: true,
      role: membership.role,
      userId: user.id,
    };
  } catch {
    return { allowed: false };
  }
}

// ---------------------------------------------------------------------------
// verifyWorkspaceRole
// ---------------------------------------------------------------------------
export async function verifyWorkspaceRole(
  workspaceId: string,
  requiredRole: string
): Promise<boolean> {
  const access = await verifyWorkspaceAccess(workspaceId);
  if (!access.allowed || !access.role) return false;

  const hierarchy: Record<string, number> = {
    viewer: 0,
    member: 1,
    editor: 2,
    admin: 3,
    owner: 4,
  };

  const userLevel = hierarchy[access.role] ?? -1;
  const requiredLevel = hierarchy[requiredRole] ?? 999;

  return userLevel >= requiredLevel;
}

// ---------------------------------------------------------------------------
// isWorkspaceAdmin
// ---------------------------------------------------------------------------
export async function isWorkspaceAdmin(
  workspaceId: string
): Promise<boolean> {
  return verifyWorkspaceRole(workspaceId, "admin");
}
