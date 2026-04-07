"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { seedWorkspaceDefaults } from "@/lib/workspace/seed";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signup(formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const workspaceName = formData.get("workspaceName") as string;

  if (!fullName || !email || !password || !confirmPassword || !workspaceName) {
    return { error: "All fields are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();

  // Create the user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Failed to create account. Please try again." };
  }

  // Generate a URL-friendly slug from the workspace name
  const slug = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Create the user profile
  await supabase.from("users").insert({
    id: authData.user.id,
    email,
    full_name: fullName,
  });

  // Create the workspace
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      name: workspaceName,
      slug,
    })
    .select()
    .single();

  if (workspaceError) {
    return { error: "Account created but failed to create workspace. Please contact support." };
  }

  // Create the membership linking user to workspace as admin
  const { error: membershipError } = await supabase
    .from("workspace_memberships")
    .insert({
      workspace_id: workspace.id,
      user_id: authData.user.id,
      role: "admin",
    });

  if (membershipError) {
    return { error: "Account created but failed to set up workspace membership. Please contact support." };
  }

  // Seed default agents and skills -- best-effort, don't block signup
  await seedWorkspaceDefaults(workspace.id).catch((err) => {
    console.error("[auth/signup] Failed to seed workspace defaults:", err);
  });

  redirect("/onboarding");
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/settings`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function loginWithMagicLink(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required." };
  }

  const { isSupabaseConfigured } = await import("@/lib/supabase/server");

  if (!isSupabaseConfigured) {
    // Mock mode: pretend we sent the email
    return { success: true, message: "Check your email for the magic link." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Check your email for the magic link." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ------------------------------------------------------------
// User deactivation / reactivation
// ------------------------------------------------------------

export async function deactivateUser(
  userId: string,
  workspaceId: string
): Promise<{ success?: boolean; error?: string }> {
  if (!userId || !workspaceId) {
    return { error: "User ID and workspace ID are required." };
  }

  const { isSupabaseConfigured } = await import("@/lib/supabase/server");

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const supabase = await createClient();

    // Remove workspace membership (soft deactivation)
    const { error } = await supabase
      .from("workspace_memberships")
      .update({ role: "viewer" as const, deactivated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId);

    if (error) {
      // Fallback: just delete the membership row
      const { error: deleteError } = await supabase
        .from("workspace_memberships")
        .delete()
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId);

      if (deleteError) {
        return { error: deleteError.message };
      }
    }

    return { success: true };
  } catch {
    return { error: "Failed to deactivate user." };
  }
}

export async function reactivateUser(
  userId: string,
  workspaceId: string,
  role: string = "viewer"
): Promise<{ success?: boolean; error?: string }> {
  if (!userId || !workspaceId) {
    return { error: "User ID and workspace ID are required." };
  }

  const { isSupabaseConfigured } = await import("@/lib/supabase/server");

  if (!isSupabaseConfigured) {
    return { success: true };
  }

  try {
    const supabase = await createClient();

    // Try to update existing membership first
    const { data: existing } = await supabase
      .from("workspace_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("workspace_memberships")
        .update({ role, deactivated_at: null })
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId);

      if (error) return { error: error.message };
    } else {
      // Re-create membership
      const { error } = await supabase
        .from("workspace_memberships")
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role,
        });

      if (error) return { error: error.message };
    }

    return { success: true };
  } catch {
    return { error: "Failed to reactivate user." };
  }
}
