import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { PgVectorRetrievalAdapter } from "@/lib/retrieval/pgvector-adapter";
import { buildSystemPrompt } from "./system-prompt";

export interface AssembledContext {
  systemPrompt: string;
  relevantKnowledge: Array<{ title: string; content: string; path: string }>;
  initiativeContext?: {
    title: string;
    type: string;
    goal?: string;
    brief?: string;
  };
  conversationHistory: Array<{ role: string; content: string }>;
}

interface AssembleContextOptions {
  workspaceId: string;
  initiativeId?: string;
  userMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  maxContextTokens?: number;
}

/**
 * Assembles the full context for a single orchestrator chat turn.
 *
 * Fetches initiative details, performs semantic search on the second brain,
 * builds the system prompt, and trims conversation history to fit the
 * token budget.
 */
export async function assembleContext(
  options: AssembleContextOptions
): Promise<AssembledContext> {
  const {
    workspaceId,
    initiativeId,
    userMessage,
    conversationHistory = [],
    maxContextTokens = 100_000,
  } = options;

  // --- Fetch initiative details (if available) ---
  let initiativeContext: AssembledContext["initiativeContext"] | undefined;

  if (initiativeId && isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("initiatives")
        .select("title, type, goal, brief")
        .eq("id", initiativeId)
        .single();

      if (data) {
        initiativeContext = {
          title: data.title as string,
          type: data.type as string,
          goal: (data.goal as string) ?? undefined,
          brief: (data.brief as string) ?? undefined,
        };
      }
    } catch (error) {
      console.error("Failed to fetch initiative context:", error);
    }
  }

  // --- Semantic search on second brain ---
  let relevantKnowledge: AssembledContext["relevantKnowledge"] = [];

  if (isSupabaseConfigured) {
    try {
      const retrieval = new PgVectorRetrievalAdapter();
      const results = await retrieval.search({
        query: userMessage,
        workspaceId,
        topK: 5,
        threshold: 0.3,
      });

      relevantKnowledge = results.map((r) => ({
        title: r.title,
        content: r.content,
        path: r.path,
      }));
    } catch (error) {
      console.error("Failed to search knowledge base:", error);
    }
  }

  // --- Build system prompt ---
  const knowledgeContext = relevantKnowledge.map(
    (k) => `**${k.title}** (${k.path})\n${k.content}`
  );

  const systemPrompt = buildSystemPrompt({
    initiativeContext,
    knowledgeContext: knowledgeContext.length > 0 ? knowledgeContext : undefined,
  });

  // --- Trim conversation history to fit token budget ---
  // Reserve tokens for: system prompt + user message + response headroom
  const systemPromptTokens = estimateTokens(systemPrompt);
  const userMessageTokens = estimateTokens(userMessage);
  const knowledgeTokens = knowledgeContext.reduce(
    (sum, k) => sum + estimateTokens(k),
    0
  );
  const responseHeadroom = 4_000; // reserve space for the model's response
  const availableForHistory =
    maxContextTokens -
    systemPromptTokens -
    userMessageTokens -
    knowledgeTokens -
    responseHeadroom;

  const trimmedHistory = trimConversationHistory(
    conversationHistory,
    Math.max(availableForHistory, 2_000) // keep at least a small window
  );

  return {
    systemPrompt,
    relevantKnowledge,
    initiativeContext,
    conversationHistory: trimmedHistory,
  };
}

/**
 * Simple token estimation heuristic: ~4 characters per token.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Trims conversation history from the front (oldest first) to fit within
 * the token budget. Always keeps the most recent messages.
 */
function trimConversationHistory(
  history: Array<{ role: string; content: string }>,
  maxTokens: number
): Array<{ role: string; content: string }> {
  let totalTokens = 0;
  const result: Array<{ role: string; content: string }> = [];

  // Walk backward from most recent to oldest
  for (let i = history.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(history[i].content);
    if (totalTokens + msgTokens > maxTokens) {
      break;
    }
    totalTokens += msgTokens;
    result.unshift(history[i]);
  }

  return result;
}
