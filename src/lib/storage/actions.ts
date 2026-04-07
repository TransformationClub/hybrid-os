"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

interface UploadResult {
  path: string;
  url: string;
}

// ------------------------------------------------------------
// uploadFile
// ------------------------------------------------------------

export async function uploadFile(
  workspaceId: string,
  bucket: string,
  formData: FormData
): Promise<ActionResult<UploadResult>> {
  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "No file provided" };
  }

  if (!isSupabaseConfigured) {
    // Return a mock URL when Supabase is not configured
    const mockPath = `${workspaceId}/${file.name}`;
    return {
      data: {
        path: mockPath,
        url: `/mock-uploads/${file.name}`,
      },
    };
  }

  try {
    const supabase = await createClient();
    const filePath = `${workspaceId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return {
      data: {
        path: filePath,
        url: publicUrl,
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

// ------------------------------------------------------------
// deleteFile
// ------------------------------------------------------------

export async function deleteFile(
  workspaceId: string,
  bucket: string,
  path: string
): Promise<ActionResult<{ deleted: true }>> {
  if (!isSupabaseConfigured) {
    return { data: { deleted: true } };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      return { error: error.message };
    }

    return { data: { deleted: true } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Delete failed",
    };
  }
}

// ------------------------------------------------------------
// getSignedUrl
// ------------------------------------------------------------

export async function getSignedUrl(
  workspaceId: string,
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<ActionResult<{ signedUrl: string }>> {
  if (!isSupabaseConfigured) {
    return {
      data: {
        signedUrl: `/mock-uploads/${path.split("/").pop() ?? path}`,
      },
    };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error || !data) {
      return { error: error?.message ?? "Failed to generate signed URL" };
    }

    return { data: { signedUrl: data.signedUrl } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to generate signed URL",
    };
  }
}
