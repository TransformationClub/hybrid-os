"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { triggerIngestion } from "@/lib/jobs/triggers";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

interface AsyncIngestionResult {
  fileId: string;
  filePath: string;
  status: "processing";
}

// ------------------------------------------------------------
// Upload and queue async ingestion
// ------------------------------------------------------------

/**
 * Upload a file to Supabase Storage and queue an Inngest background
 * job to parse, create a knowledge object, and generate embeddings.
 *
 * Returns immediately with a "processing" status. The caller can poll
 * the knowledge_objects table for the final result.
 */
export async function uploadAndIngest(
  workspaceId: string,
  formData: FormData
): Promise<ActionResult<AsyncIngestionResult>> {
  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "No file provided" };
  }

  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = `${workspaceId}/${fileId}-${file.name}`;

  if (!isSupabaseConfigured) {
    // In mock mode, still trigger the job (which will also mock)
    console.log(
      `[ingestion:actions] Mock upload: ${file.name} -> ${filePath}`
    );

    try {
      await triggerIngestion(
        workspaceId,
        fileId,
        file.name,
        filePath,
        file.size,
        file.type
      );
    } catch (err) {
      // Inngest may not be running in dev - log but don't fail
      console.log(
        "[ingestion:actions] Inngest not available, job queued locally:",
        err instanceof Error ? err.message : err
      );
    }

    return {
      data: {
        fileId,
        filePath,
        status: "processing",
      },
    };
  }

  try {
    const supabase = await createClient();

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // 2. Trigger async processing via Inngest
    try {
      await triggerIngestion(
        workspaceId,
        fileId,
        file.name,
        filePath,
        file.size,
        file.type
      );
    } catch (err) {
      // If Inngest is not available, log but still return success
      // The file is uploaded and can be processed later
      console.error(
        "[ingestion:actions] Failed to trigger ingestion job:",
        err
      );
    }

    // 3. Return immediately with processing status
    return {
      data: {
        fileId,
        filePath,
        status: "processing",
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to upload and ingest file",
    };
  }
}

// ------------------------------------------------------------
// Check ingestion status
// ------------------------------------------------------------

/**
 * Check the processing status of an ingested file by looking up
 * the knowledge object's metadata.processing_status field.
 */
export async function getIngestionStatus(
  workspaceId: string,
  filePath: string
): Promise<
  ActionResult<{
    status: "processing" | "embedding" | "complete" | "not_found";
    knowledgeObjectId?: string;
  }>
> {
  if (!isSupabaseConfigured) {
    return { data: { status: "complete", knowledgeObjectId: "mock-ko" } };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("knowledge_objects")
      .select("id, metadata")
      .eq("workspace_id", workspaceId)
      .eq("path", filePath)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    if (!data) {
      return { data: { status: "processing" } };
    }

    const metadata = data.metadata as Record<string, unknown> | null;
    const processingStatus =
      (metadata?.processing_status as string) ?? "complete";

    return {
      data: {
        status: processingStatus as
          | "processing"
          | "embedding"
          | "complete"
          | "not_found",
        knowledgeObjectId: data.id,
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to check ingestion status",
    };
  }
}
