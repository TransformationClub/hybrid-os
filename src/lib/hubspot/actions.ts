"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  createHubSpotClient,
  isHubSpotConfigured,
} from "./client";
import type {
  HubSpotConnection,
  HubSpotCampaign,
  HubSpotEmail,
  HubSpotPerformanceMetrics,
  CreateEmailData,
} from "./types";

// ============================================================
// Connect / Disconnect
// ============================================================

/**
 * Exchange an OAuth authorization code for tokens and persist the
 * HubSpot connection in Supabase.
 */
export async function connectHubSpot(
  code: string,
  workspaceId: string
): Promise<{ error?: string }> {
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/hubspot/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Resolve portal info from the access token
    const infoRes = await fetch(
      `https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`
    );
    if (!infoRes.ok) {
      return { error: "Failed to retrieve HubSpot portal info." };
    }
    const info = (await infoRes.json()) as {
      hub_id: number;
      hub_domain: string;
    };

    if (!isSupabaseConfigured) {
      // Nothing to persist -- just succeed silently in local-dev mode
      console.log(
        "[hubspot] Connected in mock mode (no Supabase). portal:",
        info.hub_id
      );
      return {};
    }

    const supabase = await createClient();
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const { error: upsertError } = await supabase
      .from("hubspot_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          portal_id: String(info.hub_id),
          hub_domain: info.hub_domain,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      );

    if (upsertError) {
      console.error("[hubspot] upsert error:", upsertError);
      return { error: "Failed to save HubSpot connection." };
    }

    return {};
  } catch (err) {
    console.error("[hubspot] connectHubSpot error:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown error connecting HubSpot.",
    };
  }
}

/**
 * Remove the HubSpot connection for a workspace.
 */
export async function disconnectHubSpot(
  workspaceId: string
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    return {};
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("hubspot_connections")
      .delete()
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("[hubspot] disconnect error:", error);
      return { error: "Failed to disconnect HubSpot." };
    }
    return {};
  } catch (err) {
    console.error("[hubspot] disconnectHubSpot error:", err);
    return {
      error:
        err instanceof Error ? err.message : "Unknown error disconnecting HubSpot.",
    };
  }
}

// ============================================================
// Connection status
// ============================================================

/**
 * Return the current HubSpot connection for a workspace, or null if
 * not connected.
 */
export async function getHubSpotConnection(
  workspaceId: string
): Promise<{ connection: HubSpotConnection | null; error?: string }> {
  if (!isSupabaseConfigured) {
    return { connection: null };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("hubspot_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) {
      console.error("[hubspot] getConnection error:", error);
      return { connection: null, error: "Failed to load HubSpot connection." };
    }

    return { connection: data as HubSpotConnection | null };
  } catch (err) {
    console.error("[hubspot] getHubSpotConnection error:", err);
    return {
      connection: null,
      error:
        err instanceof Error ? err.message : "Unknown error loading connection.",
    };
  }
}

// ============================================================
// Token refresh
// ============================================================

/**
 * Refresh the access token for a workspace and persist the new tokens.
 * Returns the fresh access token on success.
 */
export async function refreshHubSpotToken(
  workspaceId: string
): Promise<{ accessToken?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase not configured." };
  }

  try {
    const supabase = await createClient();
    const { data: conn, error: fetchError } = await supabase
      .from("hubspot_connections")
      .select("refresh_token")
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !conn) {
      return { error: "No HubSpot connection found for this workspace." };
    }

    const tokens = await refreshAccessToken(conn.refresh_token);
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const { error: updateError } = await supabase
      .from("hubspot_connections")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      })
      .eq("workspace_id", workspaceId);

    if (updateError) {
      return { error: "Failed to persist refreshed tokens." };
    }

    return { accessToken: tokens.access_token };
  } catch (err) {
    console.error("[hubspot] refreshHubSpotToken error:", err);
    return {
      error:
        err instanceof Error ? err.message : "Unknown error refreshing token.",
    };
  }
}

// ============================================================
// Sync to Second Brain (knowledge objects)
// ============================================================

/**
 * Pull contacts, companies, and campaigns from HubSpot and create
 * knowledge objects in the workspace's Second Brain.
 */
export async function syncHubSpotToSecondBrain(
  workspaceId: string
): Promise<{ synced: number; error?: string }> {
  if (!isSupabaseConfigured) {
    return { synced: 0, error: "Supabase not configured." };
  }

  try {
    // 1. Get connection + ensure token is fresh
    const { connection } = await getHubSpotConnection(workspaceId);
    if (!connection) {
      return { synced: 0, error: "HubSpot is not connected." };
    }

    let accessToken = connection.access_token;

    // Refresh if expired
    const expiresAt = new Date(connection.expires_at).getTime();
    if (Date.now() >= expiresAt - 60_000) {
      const refreshResult = await refreshHubSpotToken(workspaceId);
      if (refreshResult.error || !refreshResult.accessToken) {
        return { synced: 0, error: refreshResult.error ?? "Token refresh failed." };
      }
      accessToken = refreshResult.accessToken;
    }

    const client = createHubSpotClient(accessToken);
    const supabase = await createClient();

    // 2. Pull data in parallel
    const [contacts, companies, campaigns] = await Promise.all([
      client.getContacts(100),
      client.getCompanies(100),
      client.getCampaigns(),
    ]);

    // 3. Upsert knowledge objects
    const knowledgeRows: Array<{
      workspace_id: string;
      path: string;
      title: string;
      type: string;
      content: string;
      source: string;
    }> = [];

    for (const c of contacts) {
      knowledgeRows.push({
        workspace_id: workspaceId,
        path: `hubspot/contacts/${c.id}`,
        title: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email,
        type: "customer",
        content: JSON.stringify(c),
        source: "system",
      });
    }

    for (const co of companies) {
      knowledgeRows.push({
        workspace_id: workspaceId,
        path: `hubspot/companies/${co.id}`,
        title: co.name,
        type: "company",
        content: JSON.stringify(co),
        source: "system",
      });
    }

    for (const camp of campaigns) {
      knowledgeRows.push({
        workspace_id: workspaceId,
        path: `hubspot/campaigns/${camp.id}`,
        title: camp.name,
        type: "reference",
        content: JSON.stringify(camp),
        source: "system",
      });
    }

    if (knowledgeRows.length > 0) {
      const { error: insertError } = await supabase
        .from("knowledge_objects")
        .upsert(knowledgeRows, { onConflict: "workspace_id,path" });

      if (insertError) {
        console.error("[hubspot] sync insert error:", insertError);
        return {
          synced: 0,
          error: "Failed to write knowledge objects.",
        };
      }
    }

    return { synced: knowledgeRows.length };
  } catch (err) {
    console.error("[hubspot] syncHubSpotToSecondBrain error:", err);
    return {
      synced: 0,
      error:
        err instanceof Error ? err.message : "Unknown error during HubSpot sync.",
    };
  }
}

// ============================================================
// Helper: resolve a live HubSpot client for a workspace
// ============================================================

async function resolveClient(workspaceId: string) {
  if (!isSupabaseConfigured) return null;

  const { connection } = await getHubSpotConnection(workspaceId);
  if (!connection) return null;

  let accessToken = connection.access_token;

  const expiresAt = new Date(connection.expires_at).getTime();
  if (Date.now() >= expiresAt - 60_000) {
    const refreshResult = await refreshHubSpotToken(workspaceId);
    if (refreshResult.error || !refreshResult.accessToken) return null;
    accessToken = refreshResult.accessToken;
  }

  return createHubSpotClient(accessToken);
}

// ============================================================
// Fetch campaigns
// ============================================================

export async function getHubSpotCampaigns(
  workspaceId: string
): Promise<{ data: HubSpotCampaign[]; error?: string }> {
  try {
    const liveClient = await resolveClient(workspaceId);
    if (liveClient) {
      const campaigns = await liveClient.getCampaigns();
      return { data: campaigns };
    }

    // Mock data
    return {
      data: [
        { id: "mock-camp-1", name: "Q2 Product Launch", status: "active", type: "email" },
        { id: "mock-camp-2", name: "ABM Tier 1 Outreach", status: "draft", type: "abm" },
        { id: "mock-camp-3", name: "Content Syndication", status: "completed", type: "content" },
      ],
    };
  } catch (err) {
    console.error("[hubspot] getHubSpotCampaigns error:", err);
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch campaigns.",
    };
  }
}

// ============================================================
// Fetch email templates
// ============================================================

export async function getHubSpotEmailTemplates(
  workspaceId: string
): Promise<{ data: HubSpotEmail[]; error?: string }> {
  try {
    const liveClient = await resolveClient(workspaceId);
    if (liveClient) {
      const emails = await liveClient.getEmails();
      return { data: emails };
    }

    // Mock data
    return {
      data: [
        {
          id: "mock-tpl-1",
          name: "Welcome Series - Day 1",
          subject: "Welcome to {{company_name}}",
          state: "PUBLISHED",
          type: "AUTOMATED",
        },
        {
          id: "mock-tpl-2",
          name: "Monthly Newsletter",
          subject: "This Month in {{company_name}}",
          state: "PUBLISHED",
          type: "REGULAR",
        },
        {
          id: "mock-tpl-3",
          name: "Product Announcement",
          subject: "Introducing: {{product_name}}",
          state: "DRAFT",
          type: "REGULAR",
        },
      ],
    };
  } catch (err) {
    console.error("[hubspot] getHubSpotEmailTemplates error:", err);
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch templates.",
    };
  }
}

// ============================================================
// Create draft email
// ============================================================

export async function createHubSpotEmail(
  workspaceId: string,
  data: CreateEmailData
): Promise<{ data: HubSpotEmail | null; error?: string }> {
  try {
    const liveClient = await resolveClient(workspaceId);
    if (liveClient) {
      const email = await liveClient.createDraftEmail(data);
      return { data: email };
    }

    // Mock response
    return {
      data: {
        id: `mock-email-${Date.now()}`,
        name: data.name,
        subject: data.subject,
        state: "DRAFT",
        type: "REGULAR",
      },
    };
  } catch (err) {
    console.error("[hubspot] createHubSpotEmail error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to create draft email.",
    };
  }
}

// ============================================================
// Pull performance metrics / analytics
// ============================================================

export interface AnalyticsOptions {
  startDate?: string;
  endDate?: string;
}

export async function getHubSpotAnalytics(
  workspaceId: string,
  options?: AnalyticsOptions
): Promise<{ data: HubSpotPerformanceMetrics | null; error?: string }> {
  try {
    const liveClient = await resolveClient(workspaceId);
    if (liveClient) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startDate = options?.startDate ?? thirtyDaysAgo.toISOString().split("T")[0];
      const endDate = options?.endDate ?? now.toISOString().split("T")[0];
      const metrics = await liveClient.getPerformanceMetrics(startDate, endDate);
      return { data: metrics };
    }

    // Mock data
    return {
      data: {
        traffic: {
          total: 24800,
          organic: 9920,
          direct: 6200,
          referral: 4960,
          social: 3720,
        },
        leads: {
          total: 1240,
          newThisPeriod: 186,
          conversionRate: 0.075,
        },
        engagement: {
          emailOpenRate: 0.284,
          emailClickRate: 0.042,
          blogViews: 8350,
        },
      },
    };
  } catch (err) {
    console.error("[hubspot] getHubSpotAnalytics error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch analytics.",
    };
  }
}

// ============================================================
// Sync HubSpot data to Second Brain (knowledge objects)
// ============================================================

interface SyncToBrainResult {
  synced: number;
  objects: Array<{ id: string; title: string; type: string }>;
  error?: string;
}

export async function syncHubSpotToBrain(
  workspaceId: string
): Promise<SyncToBrainResult> {
  try {
    const liveClient = await resolveClient(workspaceId);

    if (liveClient && isSupabaseConfigured) {
      // Live path: pull from HubSpot and upsert into knowledge_objects
      const [contacts, companies, campaigns] = await Promise.all([
        liveClient.getContacts(50),
        liveClient.getCompanies(50),
        liveClient.getCampaigns(),
      ]);

      const supabase = await createClient();
      const rows: Array<{
        workspace_id: string;
        path: string;
        title: string;
        type: string;
        content: string;
        source: string;
      }> = [];

      for (const c of contacts) {
        const title = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email;
        rows.push({
          workspace_id: workspaceId,
          path: `hubspot/contacts/${c.id}`,
          title,
          type: "customer",
          content: JSON.stringify(c),
          source: "system",
        });
      }

      for (const co of companies) {
        rows.push({
          workspace_id: workspaceId,
          path: `hubspot/companies/${co.id}`,
          title: co.name,
          type: "customer",
          content: JSON.stringify(co),
          source: "system",
        });
      }

      for (const camp of campaigns) {
        rows.push({
          workspace_id: workspaceId,
          path: `hubspot/campaigns/${camp.id}`,
          title: camp.name,
          type: "strategy",
          content: JSON.stringify(camp),
          source: "system",
        });
      }

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from("knowledge_objects")
          .upsert(rows, { onConflict: "workspace_id,path" });

        if (insertError) {
          console.error("[hubspot] syncHubSpotToBrain insert error:", insertError);
          return { synced: 0, objects: [], error: "Failed to write knowledge objects." };
        }
      }

      return {
        synced: rows.length,
        objects: rows.map((r) => ({ id: r.path, title: r.title, type: r.type })),
      };
    }

    // Mock path
    const mockObjects = [
      { id: "hs-contact-1", title: "Jane Smith (Acme Corp)", type: "customer" },
      { id: "hs-contact-2", title: "Carlos Rivera (TechStart)", type: "customer" },
      { id: "hs-company-1", title: "Acme Corp", type: "customer" },
      { id: "hs-campaign-1", title: "Q2 Product Launch", type: "strategy" },
      { id: "hs-campaign-2", title: "ABM Tier 1 Outreach", type: "strategy" },
    ];
    return { synced: mockObjects.length, objects: mockObjects };
  } catch (err) {
    console.error("[hubspot] syncHubSpotToBrain error:", err);
    return {
      synced: 0,
      objects: [],
      error: err instanceof Error ? err.message : "Unknown error during brain sync.",
    };
  }
}
