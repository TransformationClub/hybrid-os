import { useAuthStore } from "@/stores/auth-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { WorkspaceRole } from "@/lib/auth/rbac";

/**
 * Returns the current user's workspace role.
 *
 * When Supabase is not configured (demo mode), defaults to "admin"
 * so every feature is visible. When configured, reads the role from
 * the auth store (populated from workspace_memberships on login).
 */
export function useCurrentRole(): WorkspaceRole {
  const membershipRole = useAuthStore((s) => s.membership?.role);

  if (!isSupabaseConfigured) {
    return "admin";
  }

  return membershipRole ?? "viewer";
}
