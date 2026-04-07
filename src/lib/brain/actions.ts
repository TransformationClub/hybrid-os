"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { generateEmbedding, updateKnowledgeEmbedding } from "@/lib/embeddings/service";
import type { KnowledgeObject } from "@/types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface KnowledgeVersion {
  id: string;
  knowledge_object_id: string;
  version_number: number;
  content: string;
  changed_by: string;
  change_reason: string | null;
  created_at: string;
}

interface VersionDiff {
  versionA: KnowledgeVersion;
  versionB: KnowledgeVersion;
}

type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string };

// ------------------------------------------------------------
// Mock helpers
// ------------------------------------------------------------

const MOCK_VERSIONS: KnowledgeVersion[] = [
  {
    id: "v-1",
    knowledge_object_id: "mock",
    version_number: 1,
    content:
      "# Brand Guidelines\n\nOur brand represents trust and innovation.\n\nCore values: reliability, speed, transparency.",
    changed_by: "Luke Summerfield",
    change_reason: "Initial creation",
    created_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "v-2",
    knowledge_object_id: "mock",
    version_number: 2,
    content:
      "# Brand Guidelines\n\nOur brand represents trust, innovation, and simplicity.\n\nCore values: reliability, speed, transparency, empathy.\n\n## Voice\nBold, clear, and human.",
    changed_by: "AI Agent",
    change_reason: "Added voice section and updated values",
    created_at: "2026-03-20T14:30:00Z",
  },
  {
    id: "v-3",
    knowledge_object_id: "mock",
    version_number: 3,
    content:
      "# Brand Guidelines\n\nOur brand represents trust, innovation, and simplicity.\n\nCore values: reliability, speed, transparency, empathy.\n\n## Voice\nBold, clear, and human.\n\n## Visual Identity\nPrimary color: #4F46E5\nSecondary: #10B981\nFont: Inter",
    changed_by: "Luke Summerfield",
    change_reason: "Added visual identity section",
    created_at: "2026-03-25T09:15:00Z",
  },
  {
    id: "v-4",
    knowledge_object_id: "mock",
    version_number: 4,
    content:
      "# Brand Guidelines v2\n\nOur brand represents trust, innovation, and radical simplicity.\n\nCore values: reliability, speed, transparency, empathy, courage.\n\n## Voice\nBold, clear, human, and playful.\n\n## Visual Identity\nPrimary color: #4F46E5\nSecondary: #10B981\nFont: Inter\n\n## Messaging\nTagline: Build what matters.",
    changed_by: "AI Agent",
    change_reason: "Refined voice, added messaging tagline, updated values",
    created_at: "2026-04-01T16:45:00Z",
  },
];

function getMockVersions(objectId: string): KnowledgeVersion[] {
  return MOCK_VERSIONS.map((v) => ({ ...v, knowledge_object_id: objectId }));
}

// ------------------------------------------------------------
// Server actions
// ------------------------------------------------------------

export async function getKnowledgeVersions(
  objectId: string
): Promise<ActionResult<KnowledgeVersion[]>> {
  if (!isSupabaseConfigured) {
    return { data: getMockVersions(objectId).reverse() };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("knowledge_versions")
      .select("*")
      .eq("knowledge_object_id", objectId)
      .order("version_number", { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { data: data as KnowledgeVersion[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch versions" };
  }
}

export async function getVersionDiff(
  objectId: string,
  versionANumber: number,
  versionBNumber: number
): Promise<ActionResult<VersionDiff>> {
  if (!isSupabaseConfigured) {
    const versions = getMockVersions(objectId);
    const vA = versions.find((v) => v.version_number === versionANumber);
    const vB = versions.find((v) => v.version_number === versionBNumber);
    if (!vA || !vB) {
      return { error: "Version not found" };
    }
    return { data: { versionA: vA, versionB: vB } };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("knowledge_versions")
      .select("*")
      .eq("knowledge_object_id", objectId)
      .in("version_number", [versionANumber, versionBNumber]);

    if (error) {
      return { error: error.message };
    }

    const vA = (data as KnowledgeVersion[]).find(
      (v) => v.version_number === versionANumber
    );
    const vB = (data as KnowledgeVersion[]).find(
      (v) => v.version_number === versionBNumber
    );

    if (!vA || !vB) {
      return { error: "One or both versions not found" };
    }

    return { data: { versionA: vA, versionB: vB } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch version diff" };
  }
}

export async function restoreVersion(
  objectId: string,
  versionId: string
): Promise<ActionResult<{ success: boolean }>> {
  if (!isSupabaseConfigured) {
    return { data: { success: true } };
  }

  try {
    const supabase = await createClient();

    // Fetch the version to restore
    const { data: version, error: versionError } = await supabase
      .from("knowledge_versions")
      .select("*")
      .eq("id", versionId)
      .single();

    if (versionError || !version) {
      return { error: versionError?.message ?? "Version not found" };
    }

    // Get the current max version number
    const { data: latestVersions, error: latestError } = await supabase
      .from("knowledge_versions")
      .select("version_number")
      .eq("knowledge_object_id", objectId)
      .order("version_number", { ascending: false })
      .limit(1);

    if (latestError) {
      return { error: latestError.message };
    }

    const nextVersionNumber =
      latestVersions && latestVersions.length > 0
        ? (latestVersions[0] as { version_number: number }).version_number + 1
        : 1;

    // Create a new version with the restored content
    const { error: insertError } = await supabase
      .from("knowledge_versions")
      .insert({
        knowledge_object_id: objectId,
        content: (version as KnowledgeVersion).content,
        changed_by: "user",
        change_reason: `Restored from version ${(version as KnowledgeVersion).version_number}`,
        version_number: nextVersionNumber,
      });

    if (insertError) {
      return { error: insertError.message };
    }

    // Update the knowledge object itself
    const { error: updateError } = await supabase
      .from("knowledge_objects")
      .update({
        content: (version as KnowledgeVersion).content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", objectId);

    if (updateError) {
      return { error: updateError.message };
    }

    // Fire-and-forget embedding regeneration for restored content
    updateKnowledgeEmbedding(objectId, (version as KnowledgeVersion).content).catch(() => {});

    return { data: { success: true } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to restore version",
    };
  }
}

// ------------------------------------------------------------
// Search (semantic via pgvector)
// ------------------------------------------------------------

export interface SearchResult {
  id: string;
  title: string;
  path: string;
  type: string;
  source: "user" | "agent" | "system";
  snippet: string;
  content: string;
  relevance: number;
  updated_at: string;
}

/** Mock knowledge items for search fallback */
const MOCK_KNOWLEDGE_ITEMS: SearchResult[] = [
  {
    id: "k1",
    title: "Company Overview",
    path: "context",
    type: "company",
    source: "user",
    snippet: "Hybrid OS is an agentic operating system for modern marketing and revenue teams.",
    content: "# Company Overview\n\nHybrid OS is an agentic operating system for modern marketing teams.",
    relevance: 1,
    updated_at: "2026-04-04T10:00:00Z",
  },
  {
    id: "k2",
    title: "Brand Voice Guidelines",
    path: "context",
    type: "brand",
    source: "user",
    snippet: "Tone: bold, clear, clever, playful, insightful. Human writing only.",
    content: "# Brand Voice Guidelines\n\nBold, clear, clever, playful, insightful.",
    relevance: 0.95,
    updated_at: "2026-04-03T10:00:00Z",
  },
  {
    id: "k3",
    title: "ICP Definition - Mid-Market SaaS",
    path: "context",
    type: "customer",
    source: "agent",
    snippet: "Primary ICP: B2B SaaS companies, 50-500 employees, $5M-$50M ARR.",
    content: "# ICP Definition\n\nPrimary ICP: B2B SaaS companies.",
    relevance: 0.9,
    updated_at: "2026-04-01T10:00:00Z",
  },
];

/**
 * Search the Second Brain by semantic similarity.
 * In mock mode, performs simple text matching on title + content.
 */
export async function searchBrain(
  workspaceId: string,
  query: string
): Promise<ActionResult<SearchResult[]>> {
  if (!query.trim()) {
    return { data: [] };
  }

  if (!isSupabaseConfigured) {
    // Mock: simple text-based filtering
    const lowerQuery = query.toLowerCase();
    const results = MOCK_KNOWLEDGE_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.content.toLowerCase().includes(lowerQuery) ||
        item.snippet.toLowerCase().includes(lowerQuery)
    ).map((item, i) => ({
      ...item,
      relevance: 1 - i * 0.1,
    }));

    return { data: results };
  }

  try {
    // Generate embedding for the query
    const embedding = await generateEmbedding(query);

    const supabase = await createClient();

    // Use pgvector similarity search via an RPC function
    const { data, error } = await supabase.rpc("search_knowledge_objects", {
      p_workspace_id: workspaceId,
      p_embedding: JSON.stringify(embedding),
      p_match_count: 20,
      p_match_threshold: 0.5,
    });

    if (error) {
      // Fallback to text search if the RPC doesn't exist
      console.warn("[brain] pgvector search failed, falling back to text:", error.message);
      const { data: textData, error: textError } = await supabase
        .from("knowledge_objects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(20);

      if (textError) {
        return { error: textError.message };
      }

      const results: SearchResult[] = (textData as KnowledgeObject[]).map((obj, i) => ({
        id: obj.id,
        title: obj.title,
        path: obj.path,
        type: obj.type,
        source: obj.source,
        snippet: obj.content.replace(/[#*\[\]`]/g, "").slice(0, 160),
        content: obj.content,
        relevance: 1 - i * 0.05,
        updated_at: obj.updated_at,
      }));

      return { data: results };
    }

    const results: SearchResult[] = (
      data as Array<{
        id: string;
        title: string;
        path: string;
        type: string;
        source: "user" | "agent" | "system";
        content: string;
        similarity: number;
        updated_at: string;
      }>
    ).map((row) => ({
      id: row.id,
      title: row.title,
      path: row.path,
      type: row.type,
      source: row.source,
      snippet: row.content.replace(/[#*\[\]`]/g, "").slice(0, 160),
      content: row.content,
      relevance: row.similarity,
      updated_at: row.updated_at,
    }));

    return { data: results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Search failed" };
  }
}

// ------------------------------------------------------------
// Folder management
// ------------------------------------------------------------

/**
 * Create a new folder for knowledge objects (stored as a path convention).
 */
export async function createFolder(
  workspaceId: string,
  name: string,
  parentPath?: string
): Promise<ActionResult<{ path: string }>> {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");

  if (!slug) {
    return { error: "Invalid folder name." };
  }

  const path = parentPath ? `${parentPath}/${slug}` : slug;

  if (!isSupabaseConfigured) {
    console.log(`[brain:mock] createFolder workspace=${workspaceId} path=${path}`);
    return { data: { path } };
  }

  try {
    const supabase = await createClient();

    // Store folder as a metadata record
    const { error } = await supabase.from("knowledge_folders").upsert(
      {
        workspace_id: workspaceId,
        path,
        name: name.trim(),
        parent_path: parentPath ?? null,
      },
      { onConflict: "workspace_id,path" }
    );

    if (error) {
      return { error: error.message };
    }

    return { data: { path } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create folder" };
  }
}

/**
 * Rename a folder and update all knowledge objects under it.
 */
export async function renameFolder(
  workspaceId: string,
  oldPath: string,
  newPath: string
): Promise<ActionResult<{ updated: number }>> {
  if (!isSupabaseConfigured) {
    console.log(`[brain:mock] renameFolder ${oldPath} -> ${newPath}`);
    return { data: { updated: 0 } };
  }

  try {
    const supabase = await createClient();

    // Update the folder record
    const { error: folderError } = await supabase
      .from("knowledge_folders")
      .update({ path: newPath, name: newPath.split("/").pop() ?? newPath })
      .eq("workspace_id", workspaceId)
      .eq("path", oldPath);

    if (folderError) {
      return { error: folderError.message };
    }

    // Update knowledge objects whose path starts with oldPath
    // Supabase doesn't support native string replace in updates,
    // so we fetch, transform, and batch-update.
    const { data: objects, error: fetchError } = await supabase
      .from("knowledge_objects")
      .select("id, path")
      .eq("workspace_id", workspaceId)
      .like("path", `${oldPath}%`);

    if (fetchError) {
      return { error: fetchError.message };
    }

    const updates = (objects as Array<{ id: string; path: string }>).map((obj) => ({
      id: obj.id,
      path: newPath + obj.path.slice(oldPath.length),
    }));

    for (const update of updates) {
      await supabase
        .from("knowledge_objects")
        .update({ path: update.path })
        .eq("id", update.id);
    }

    return { data: { updated: updates.length } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to rename folder" };
  }
}

/**
 * Move a knowledge object to a different folder.
 */
export async function moveKnowledgeObject(
  objectId: string,
  newPath: string
): Promise<ActionResult<{ success: boolean }>> {
  if (!isSupabaseConfigured) {
    console.log(`[brain:mock] moveKnowledgeObject ${objectId} -> ${newPath}`);
    return { data: { success: true } };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("knowledge_objects")
      .update({ path: newPath, updated_at: new Date().toISOString() })
      .eq("id", objectId);

    if (error) {
      return { error: error.message };
    }

    return { data: { success: true } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to move object" };
  }
}
