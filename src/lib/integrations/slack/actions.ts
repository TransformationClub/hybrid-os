"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  createSlackClient,
  buildDeepLink,
} from "./client";
import type { SlackConnection } from "./types";
import type { Approval } from "@/types";

// ============================================================
// Connect / Disconnect
// ============================================================

/**
 * Exchange an OAuth authorization code for tokens and persist the
 * Slack connection in Supabase.
 */
export async function connectSlack(
  code: string,
  workspaceId: string
): Promise<{ error?: string }> {
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/slack/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!isSupabaseConfigured) {
      console.log(
        "[slack] Connected in mock mode (no Supabase). team:",
        tokens.team.name
      );
      return {};
    }

    const supabase = await createClient();

    const { error: upsertError } = await supabase
      .from("slack_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          team_id: tokens.team.id,
          team_name: tokens.team.name,
          access_token: tokens.access_token,
          bot_user_id: tokens.bot_user_id,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      );

    if (upsertError) {
      console.error("[slack] upsert error:", upsertError);
      return { error: "Failed to save Slack connection." };
    }

    return {};
  } catch (err) {
    console.error("[slack] connectSlack error:", err);
    return {
      error:
        err instanceof Error ? err.message : "Unknown error connecting Slack.",
    };
  }
}

/**
 * Remove the Slack connection for a workspace.
 */
export async function disconnectSlack(
  workspaceId: string
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    return {};
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("slack_connections")
      .delete()
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("[slack] disconnect error:", error);
      return { error: "Failed to disconnect Slack." };
    }
    return {};
  } catch (err) {
    console.error("[slack] disconnectSlack error:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Unknown error disconnecting Slack.",
    };
  }
}

// ============================================================
// Connection status
// ============================================================

/**
 * Return the current Slack connection for a workspace, or null if
 * not connected.
 */
export async function getSlackConnection(
  workspaceId: string
): Promise<{ connection: SlackConnection | null; error?: string }> {
  if (!isSupabaseConfigured) {
    return { connection: null };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("slack_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) {
      console.error("[slack] getConnection error:", error);
      return {
        connection: null,
        error: "Failed to load Slack connection.",
      };
    }

    return { connection: data as SlackConnection | null };
  } catch (err) {
    console.error("[slack] getSlackConnection error:", err);
    return {
      connection: null,
      error:
        err instanceof Error
          ? err.message
          : "Unknown error loading connection.",
    };
  }
}

// ============================================================
// Send notification
// ============================================================

/**
 * Send a notification message to a Slack channel for the given workspace.
 */
export async function sendSlackNotification(
  workspaceId: string,
  channelId: string,
  message: string
): Promise<{ error?: string }> {
  try {
    const { connection, error: connError } =
      await getSlackConnection(workspaceId);

    if (connError) {
      return { error: connError };
    }

    if (!connection) {
      // No Slack connected -- mock it
      const mockClient = createSlackClient("");
      await mockClient.sendMessage(channelId, message);
      return {};
    }

    const client = createSlackClient(connection.access_token);
    const result = await client.sendMessage(channelId, message);

    if (!result.ok) {
      return { error: result.error ?? "Failed to send Slack message." };
    }

    return {};
  } catch (err) {
    console.error("[slack] sendSlackNotification error:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Unknown error sending Slack notification.",
    };
  }
}

// ============================================================
// Send approval prompt to Slack
// ============================================================

/**
 * Send an approval prompt to a Slack channel with Approve/Reject
 * buttons (Block Kit). If no channel is specified, uses the
 * workspace's default channel or falls back to mock.
 */
export async function sendSlackApproval(
  workspaceId: string,
  approval: Approval,
  channel?: string
): Promise<{ error?: string }> {
  try {
    const { connection, error: connError } =
      await getSlackConnection(workspaceId);

    if (connError) {
      return { error: connError };
    }

    // Determine target channel
    const channelId =
      channel ??
      (connection as SlackConnection | null)?.default_channel_id ??
      "C003"; // fallback for mock

    if (!connection) {
      // Mock mode
      const mockClient = createSlackClient("");
      await mockClient.sendApprovalPrompt(channelId, approval);
      return {};
    }

    const client = createSlackClient(connection.access_token);
    const result = await client.sendApprovalPrompt(channelId, approval);

    if (!result.ok) {
      return { error: result.error ?? "Failed to send approval prompt." };
    }

    return {};
  } catch (err) {
    console.error("[slack] sendSlackApproval error:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Unknown error sending Slack approval.",
    };
  }
}
