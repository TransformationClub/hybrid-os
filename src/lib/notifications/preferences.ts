"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

// ============================================================
// Types
// ============================================================

export interface NotificationPreferences {
  email_approvals: boolean;
  email_agent_failures: boolean;
  email_initiative_updates: boolean;
  email_weekly_digest: boolean;
  in_app_approvals: boolean;
  in_app_agent_activity: boolean;
  in_app_mentions: boolean;
}

// ============================================================
// Defaults
// ============================================================

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_approvals: true,
  email_agent_failures: true,
  email_initiative_updates: true,
  email_weekly_digest: true,
  in_app_approvals: true,
  in_app_agent_activity: true,
  in_app_mentions: true,
};

// ============================================================
// Server actions
// ============================================================

/**
 * Fetch notification preferences for the given user (or the
 * current authenticated user when no id is supplied).
 *
 * Returns defaults when Supabase is not configured.
 */
export async function getNotificationPreferences(
  userId?: string
): Promise<NotificationPreferences> {
  if (!isSupabaseConfigured) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  try {
    const supabase = await createClient();

    // If no userId provided, get from current session
    let targetUserId = userId;
    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }

    if (!targetUserId) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    }

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", targetUserId)
      .single();

    if (error || !data) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    }

    return {
      email_approvals: data.email_approvals ?? true,
      email_agent_failures: data.email_agent_failures ?? true,
      email_initiative_updates: data.email_initiative_updates ?? true,
      email_weekly_digest: data.email_weekly_digest ?? true,
      in_app_approvals: data.in_app_approvals ?? true,
      in_app_agent_activity: data.in_app_agent_activity ?? true,
      in_app_mentions: data.in_app_mentions ?? true,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

/**
 * Persist notification preferences for the current user.
 *
 * No-op when Supabase is not configured.
 */
export async function updateNotificationPreferences(
  prefs: NotificationPreferences
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    // In demo mode just acknowledge the save
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          ...prefs,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
