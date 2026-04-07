/**
 * Retrieval Adapter Interface
 *
 * Abstracts the vector search / retrieval layer so we can swap
 * pgvector for Pinecone, Turbopuffer, etc. in the future.
 */

export interface RetrievalQuery {
  query: string;
  workspaceId: string;
  filters?: {
    types?: string[];
    paths?: string[];
    sources?: string[];
  };
  topK?: number;
  threshold?: number;
}

export interface RetrievalResult {
  id: string;
  path: string;
  title: string;
  content: string;
  type: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingInput {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface RetrievalAdapter {
  search(query: RetrievalQuery): Promise<RetrievalResult[]>;
  upsertEmbeddings(workspaceId: string, inputs: EmbeddingInput[]): Promise<void>;
  deleteEmbeddings(workspaceId: string, ids: string[]): Promise<void>;
}
