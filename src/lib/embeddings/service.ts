/**
 * Embedding generation service.
 *
 * Uses OpenAI's text-embedding-3-small model via fetch (no SDK required).
 * When OPENAI_API_KEY is not set, returns mock zero-vectors so the app
 * works in demo / local-dev mode without an API key.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

function isApiConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

function mockEmbedding(): number[] {
  return new Array(EMBEDDING_DIMENSIONS).fill(0);
}

/**
 * Generate a single embedding vector for the given text.
 * Returns a mock zero-vector when the API key is not configured.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!isApiConfigured()) {
    return mockEmbedding();
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: EMBEDDING_MODEL,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("OpenAI embeddings error:", response.status, body);
    return mockEmbedding();
  }

  const json = (await response.json()) as {
    data: { embedding: number[] }[];
  };

  return json.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single API call.
 * Returns mock zero-vectors when the API key is not configured.
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  if (!isApiConfigured()) {
    return texts.map(() => mockEmbedding());
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model: EMBEDDING_MODEL,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("OpenAI embeddings error:", response.status, body);
    return texts.map(() => mockEmbedding());
  }

  const json = (await response.json()) as {
    data: { embedding: number[]; index: number }[];
  };

  // Sort by index to match input order
  const sorted = json.data.sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

/**
 * Generate an embedding for the given content and save it to the
 * knowledge_objects table. Requires Supabase to be configured.
 *
 * This is a server-only function -- import from server actions or
 * API routes only.
 */
export async function updateKnowledgeEmbedding(
  objectId: string,
  content: string
): Promise<void> {
  const { isSupabaseConfigured, createClient } = await import(
    "@/lib/supabase/server"
  );

  if (!isSupabaseConfigured) {
    // Nothing to persist in demo mode
    return;
  }

  const embedding = await generateEmbedding(content);

  const supabase = await createClient();
  const { error } = await supabase
    .from("knowledge_objects")
    .update({ embedding: JSON.stringify(embedding) })
    .eq("id", objectId);

  if (error) {
    console.error("Failed to update knowledge embedding:", error);
  }
}
