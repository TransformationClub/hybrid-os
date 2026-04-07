"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { User } from "@/types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
}

// ------------------------------------------------------------
// Mock helpers
// ------------------------------------------------------------

function mockProfile(): Profile {
  return {
    id: "mock-user-001",
    email: "luke@hybridmarketing.co",
    full_name: "Luke Summerfield",
    avatar_url: undefined,
    role: "admin",
  };
}

// ------------------------------------------------------------
// Server Actions
// ------------------------------------------------------------

export async function getProfile(): Promise<ActionResult<Profile>> {
  if (!isSupabaseConfigured) {
    return { data: mockProfile() };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { error: "Not authenticated." };
    }

    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url")
      .eq("id", authUser.id)
      .single();

    if (dbError || !dbUser) {
      return { error: "Failed to load profile." };
    }

    // Grab role from workspace membership
    const { data: membership } = await supabase
      .from("workspace_memberships")
      .select("role")
      .eq("user_id", authUser.id)
      .limit(1)
      .single();

    return {
      data: {
        id: dbUser.id,
        email: dbUser.email,
        full_name: dbUser.full_name,
        avatar_url: dbUser.avatar_url ?? undefined,
        role: membership?.role ?? "viewer",
      },
    };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}

export async function updateProfile(
  formData: FormData
): Promise<ActionResult<{ updated: true }>> {
  const fullName = formData.get("fullName") as string;
  const avatarUrl = formData.get("avatarUrl") as string;

  if (!fullName?.trim()) {
    return { error: "Name is required." };
  }

  if (!isSupabaseConfigured) {
    // Mock: pretend it worked
    return { data: { updated: true } };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { error: "Not authenticated." };
    }

    const updates: Record<string, string> = {
      full_name: fullName.trim(),
    };
    if (avatarUrl?.trim()) {
      updates.avatar_url = avatarUrl.trim();
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", authUser.id);

    if (updateError) {
      return { error: "Failed to update profile." };
    }

    return { data: { updated: true } };
  } catch {
    return { error: "An unexpected error occurred." };
  }
}
