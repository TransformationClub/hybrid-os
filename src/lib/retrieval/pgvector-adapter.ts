import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { generateEmbedding } from "@/lib/embeddings/service";
import type {
  RetrievalAdapter,
  RetrievalQuery,
  RetrievalResult,
  EmbeddingInput,
} from "./types";

/**
 * pgvector-backed retrieval adapter.
 *
 * Uses Supabase to query the knowledge_objects table which has a
 * vector `embedding` column. The actual embedding generation (calling
 * an external API) is handled by a separate service -- this adapter
 * only handles DB reads and writes.
 */
export class PgVectorRetrievalAdapter implements RetrievalAdapter {
  /**
   * Search for similar knowledge objects using cosine similarity.
   *
   * Expects a Supabase RPC function `match_knowledge_objects` that:
   * - Takes: query_embedding (vector), workspace_id (uuid), match_count (int), threshold (float)
   * - Returns: rows with id, path, title, content, type, similarity score, metadata
   *
   * The caller is responsible for generating the embedding vector from the
   * query string before calling this method. Since we cannot generate
   * embeddings client-side, this method accepts the query object with
   * a text query and delegates to the RPC which handles the vector comparison.
   */
  async search(query: RetrievalQuery): Promise<RetrievalResult[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const supabase = createClient();
    const topK = query.topK ?? 10;
    const threshold = query.threshold ?? 0.5;

    // Try vector similarity search first via RPC
    if (query.query.trim().length > 0) {
      try {
        const queryEmbedding = await generateEmbedding(query.query);
        const isRealEmbedding = queryEmbedding.some((v) => v !== 0);

        if (isRealEmbedding) {
          const { data: rpcData, error: rpcError } = await supabase.rpc(
            "match_knowledge_objects",
            {
              query_embedding: JSON.stringify(queryEmbedding),
              workspace_id: query.workspaceId,
              match_count: topK,
              threshold,
            }
          );

          if (!rpcError && rpcData && (rpcData as unknown[]).length > 0) {
            return (rpcData as Record<string, unknown>[]).map((row) => ({
              id: row.id as string,
              path: row.path as string,
              title: row.title as string,
              content: row.content as string,
              type: row.type as string,
              score: row.similarity as number,
              metadata: (row.metadata as Record<string, unknown>) ?? undefined,
            }));
          }

          // If RPC fails or returns no results, fall through to text search
          if (rpcError) {
            console.warn("Vector search RPC failed, falling back to text search:", rpcError.message);
          }
        }
      } catch (err) {
        console.warn("Embedding generation failed, falling back to text search:", err);
      }
    }

    // Fallback: filtered text search against knowledge_objects
    let dbQuery = supabase
      .from("knowledge_objects")
      .select("id, path, title, content, type, metadata")
      .eq("workspace_id", query.workspaceId)
      .limit(topK);

    // Apply optional filters
    if (query.filters?.types && query.filters.types.length > 0) {
      dbQuery = dbQuery.in("type", query.filters.types);
    }

    if (query.filters?.paths && query.filters.paths.length > 0) {
      const pathConditions = query.filters.paths
        .map((p) => `path.ilike.${p}%`)
        .join(",");
      dbQuery = dbQuery.or(pathConditions);
    }

    if (query.filters?.sources && query.filters.sources.length > 0) {
      dbQuery = dbQuery.in("source", query.filters.sources);
    }

    if (query.query.trim().length > 0) {
      dbQuery = dbQuery.textSearch("content", query.query, {
        type: "websearch",
        config: "english",
      });
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("pgvector search error:", error);
      return [];
    }

    if (!data) {
      return [];
    }

    // Map results, assigning a decreasing score based on result order
    return data
      .map((row, index) => ({
        id: row.id as string,
        path: row.path as string,
        title: row.title as string,
        content: row.content as string,
        type: row.type as string,
        score: Math.max(threshold, 1 - index * (1 / topK)),
        metadata: (row.metadata as Record<string, unknown>) ?? undefined,
      }))
      .filter((r) => r.score >= threshold);
  }

  /**
   * Insert or update embedding vectors for knowledge objects.
   *
   * The `content` field on EmbeddingInput is the pre-computed embedding
   * serialized as a JSON array string (e.g., "[0.1, 0.2, ...]").
   * The caller generates embeddings via an external API and passes them here.
   */
  async upsertEmbeddings(
    workspaceId: string,
    inputs: EmbeddingInput[]
  ): Promise<void> {
    if (!isSupabaseConfigured || inputs.length === 0) {
      return;
    }

    const supabase = createClient();

    // Process in batches of 100 to avoid payload limits
    const batchSize = 100;
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);

      const updates = batch.map((input) => ({
        id: input.id,
        workspace_id: workspaceId,
        embedding: input.content,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      }));

      const { error } = await supabase
        .from("knowledge_objects")
        .upsert(updates, { onConflict: "id" });

      if (error) {
        console.error(
          `pgvector upsertEmbeddings error (batch ${i / batchSize + 1}):`,
          error
        );
      }
    }
  }

  /**
   * Remove embeddings for given knowledge object IDs by setting them to null.
   */
  async deleteEmbeddings(
    workspaceId: string,
    ids: string[]
  ): Promise<void> {
    if (!isSupabaseConfigured || ids.length === 0) {
      return;
    }

    const supabase = createClient();

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);

      const { error } = await supabase
        .from("knowledge_objects")
        .update({ embedding: null })
        .eq("workspace_id", workspaceId)
        .in("id", batch);

      if (error) {
        console.error(
          `pgvector deleteEmbeddings error (batch ${i / batchSize + 1}):`,
          error
        );
      }
    }
  }
}
