"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  createGoogleDriveClient,
  fetchDocContent,
  fetchDocMetadata,
} from "./client";
import { generateEmbedding } from "@/lib/embeddings/service";
import type { GoogleDriveConnection } from "./types";

// ============================================================
// Connect / Disconnect
// ============================================================

/**
 * Exchange a Google OAuth authorization code for tokens and persist
 * the Google Drive connection in Supabase.
 */
export async function connectGoogleDrive(
  code: string,
  workspaceId: string
): Promise<{ error?: string }> {
  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Resolve user email from the access token
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (!userInfoRes.ok) {
      return { error: "Failed to retrieve Google user info." };
    }
    const userInfo = (await userInfoRes.json()) as { email: string };

    if (!isSupabaseConfigured) {
      console.log(
        "[google-drive] Connected in mock mode (no Supabase). email:",
        userInfo.email
      );
      return {};
    }

    const supabase = await createClient();
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const { error: upsertError } = await supabase
      .from("google_drive_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? "",
          expires_at: expiresAt,
          google_email: userInfo.email,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" }
      );

    if (upsertError) {
      console.error("[google-drive] upsert error:", upsertError);
      return { error: "Failed to save Google Drive connection." };
    }

    return {};
  } catch (err) {
    console.error("[google-drive] connectGoogleDrive error:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Unknown error connecting Google Drive.",
    };
  }
}

/**
 * Remove the Google Drive connection for a workspace.
 */
export async function disconnectGoogleDrive(
  workspaceId: string
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    return {};
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("google_drive_connections")
      .delete()
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("[google-drive] disconnect error:", error);
      return { error: "Failed to disconnect Google Drive." };
    }
    return {};
  } catch (err) {
    console.error("[google-drive] disconnectGoogleDrive error:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Unknown error disconnecting Google Drive.",
    };
  }
}

// ============================================================
// Connection status
// ============================================================

/**
 * Return the current Google Drive connection for a workspace, or null
 * if not connected.
 */
export async function getGoogleDriveConnection(
  workspaceId: string
): Promise<{ connection: GoogleDriveConnection | null; error?: string }> {
  if (!isSupabaseConfigured) {
    return { connection: null };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("google_drive_connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) {
      console.error("[google-drive] getConnection error:", error);
      return {
        connection: null,
        error: "Failed to load Google Drive connection.",
      };
    }

    return { connection: data as GoogleDriveConnection | null };
  } catch (err) {
    console.error("[google-drive] getGoogleDriveConnection error:", err);
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
// Token refresh
// ============================================================

/**
 * Refresh the access token for a workspace and persist the new tokens.
 * Returns the fresh access token on success.
 */
async function refreshGoogleDriveToken(
  workspaceId: string
): Promise<{ accessToken?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { error: "Supabase not configured." };
  }

  try {
    const supabase = await createClient();
    const { data: conn, error: fetchError } = await supabase
      .from("google_drive_connections")
      .select("refresh_token")
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !conn) {
      return { error: "No Google Drive connection found for this workspace." };
    }

    const tokens = await refreshAccessToken(conn.refresh_token);
    const expiresAt = new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString();

    const { error: updateError } = await supabase
      .from("google_drive_connections")
      .update({
        access_token: tokens.access_token,
        // Google may or may not return a new refresh token
        ...(tokens.refresh_token
          ? { refresh_token: tokens.refresh_token }
          : {}),
        expires_at: expiresAt,
      })
      .eq("workspace_id", workspaceId);

    if (updateError) {
      return { error: "Failed to persist refreshed tokens." };
    }

    return { accessToken: tokens.access_token };
  } catch (err) {
    console.error("[google-drive] refreshGoogleDriveToken error:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Unknown error refreshing token.",
    };
  }
}

// ============================================================
// Import files to Second Brain (knowledge objects)
// ============================================================

/**
 * Import selected Google Drive files into the workspace's Second Brain
 * as knowledge objects.
 */
export async function importFilesToSecondBrain(
  workspaceId: string,
  fileIds: string[]
): Promise<{ imported: number; error?: string }> {
  if (!isSupabaseConfigured) {
    return { imported: 0, error: "Supabase not configured." };
  }

  try {
    // 1. Get connection + ensure token is fresh
    const { connection } = await getGoogleDriveConnection(workspaceId);
    if (!connection) {
      return { imported: 0, error: "Google Drive is not connected." };
    }

    let accessToken = connection.access_token;

    // Refresh if expired
    const expiresAt = new Date(connection.expires_at).getTime();
    if (Date.now() >= expiresAt - 60_000) {
      const refreshResult = await refreshGoogleDriveToken(workspaceId);
      if (refreshResult.error || !refreshResult.accessToken) {
        return {
          imported: 0,
          error: refreshResult.error ?? "Token refresh failed.",
        };
      }
      accessToken = refreshResult.accessToken;
    }

    const client = createGoogleDriveClient(accessToken);
    const supabase = await createClient();

    // 2. Fetch file metadata and content in parallel
    const fileResults = await Promise.all(
      fileIds.map(async (fileId) => {
        try {
          const content = await client.getFileContent(fileId);
          // Get metadata via list with file ID filter
          const metaRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!metaRes.ok) return null;
          const meta = (await metaRes.json()) as {
            id: string;
            name: string;
            mimeType: string;
          };
          return { meta, content };
        } catch {
          return null;
        }
      })
    );

    // 3. Upsert knowledge objects
    const knowledgeRows: Array<{
      workspace_id: string;
      path: string;
      title: string;
      type: string;
      content: string;
      source: string;
    }> = [];

    for (const result of fileResults) {
      if (!result) continue;
      knowledgeRows.push({
        workspace_id: workspaceId,
        path: `google-drive/files/${result.meta.id}`,
        title: result.meta.name,
        type: "reference",
        content: result.content,
        source: "system",
      });
    }

    if (knowledgeRows.length > 0) {
      const { error: insertError } = await supabase
        .from("knowledge_objects")
        .upsert(knowledgeRows, { onConflict: "workspace_id,path" });

      if (insertError) {
        console.error("[google-drive] import insert error:", insertError);
        return {
          imported: 0,
          error: "Failed to write knowledge objects.",
        };
      }
    }

    return { imported: knowledgeRows.length };
  } catch (err) {
    console.error("[google-drive] importFilesToSecondBrain error:", err);
    return {
      imported: 0,
      error:
        err instanceof Error
          ? err.message
          : "Unknown error during Google Drive import.",
    };
  }
}

// ============================================================
// Import Google Docs (with content parsing + embeddings)
// ============================================================

export interface ImportedDoc {
  knowledgeObjectId: string;
  title: string;
  path: string;
}

/**
 * Import a single Google Doc: fetch its content, create a knowledge
 * object in the Second Brain, and generate an embedding.
 */
export async function importGoogleDoc(
  workspaceId: string,
  docId: string
): Promise<{ data?: ImportedDoc; error?: string }> {
  if (!isSupabaseConfigured) {
    // Mock mode: return a fake knowledge object ID
    const mockId = `ko-mock-${docId}`;
    console.log(
      `[google-drive:mock] importGoogleDoc workspace=${workspaceId} doc=${docId}`
    );
    return {
      data: {
        knowledgeObjectId: mockId,
        title: `Mock Document (${docId})`,
        path: `google-drive/docs/${docId}`,
      },
    };
  }

  try {
    // 1. Get connection + ensure token is fresh
    const { connection } = await getGoogleDriveConnection(workspaceId);
    if (!connection) {
      return { error: "Google Drive is not connected." };
    }

    let accessToken = connection.access_token;
    const expiresAt = new Date(connection.expires_at).getTime();
    if (Date.now() >= expiresAt - 60_000) {
      const refreshResult = await refreshGoogleDriveToken(workspaceId);
      if (refreshResult.error || !refreshResult.accessToken) {
        return { error: refreshResult.error ?? "Token refresh failed." };
      }
      accessToken = refreshResult.accessToken;
    }

    // 2. Fetch metadata and content in parallel
    const [metadata, content] = await Promise.all([
      fetchDocMetadata(accessToken, docId),
      fetchDocContent(accessToken, docId),
    ]);

    const path = `google-drive/docs/${docId}`;

    // 3. Upsert knowledge object
    const supabase = await createClient();
    const { data: inserted, error: insertError } = await supabase
      .from("knowledge_objects")
      .upsert(
        {
          workspace_id: workspaceId,
          path,
          title: metadata.title,
          type: "reference" as const,
          content,
          source: "system" as const,
        },
        { onConflict: "workspace_id,path" }
      )
      .select("id")
      .single();

    if (insertError) {
      return { error: `Failed to save knowledge object: ${insertError.message}` };
    }

    const objectId = (inserted as { id: string }).id;

    // 4. Generate embedding (fire-and-forget)
    generateEmbedding(content)
      .then(async (embedding) => {
        const sb = await createClient();
        await sb
          .from("knowledge_objects")
          .update({ embedding: JSON.stringify(embedding) })
          .eq("id", objectId);
      })
      .catch((err) => {
        console.error("[google-drive] embedding generation error:", err);
      });

    return {
      data: {
        knowledgeObjectId: objectId,
        title: metadata.title,
        path,
      },
    };
  } catch (err) {
    console.error("[google-drive] importGoogleDoc error:", err);
    return {
      error:
        err instanceof Error ? err.message : "Unknown error importing doc.",
    };
  }
}

/**
 * Batch import multiple Google Docs. Returns results for each doc.
 */
export async function importGoogleDocs(
  workspaceId: string,
  docIds: string[]
): Promise<{
  results: Array<{ docId: string; data?: ImportedDoc; error?: string }>;
}> {
  if (!isSupabaseConfigured) {
    // Mock mode: return fake results for all
    console.log(
      `[google-drive:mock] importGoogleDocs workspace=${workspaceId} docs=${docIds.length}`
    );
    return {
      results: docIds.map((docId) => ({
        docId,
        data: {
          knowledgeObjectId: `ko-mock-${docId}`,
          title: `Mock Document (${docId})`,
          path: `google-drive/docs/${docId}`,
        },
      })),
    };
  }

  const results = await Promise.all(
    docIds.map(async (docId) => {
      const result = await importGoogleDoc(workspaceId, docId);
      return { docId, ...result };
    })
  );

  return { results };
}
