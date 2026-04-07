import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { assembleContext } from "@/lib/orchestrator/context-assembler";
import { orchestratorTools } from "@/lib/orchestrator/tools";
import { createMockStreamResponse } from "@/lib/orchestrator/mock-stream";
import { classify, intentToPromptHint } from "@/lib/orchestrator/intent-classifier";
import { tokenBudget } from "@/lib/orchestrator/token-budget";
import { captureError } from "@/lib/monitoring/sentry";
import { trackApiLatency, trackLLMUsage } from "@/lib/monitoring/metrics";

export async function POST(request: Request) {
  const startTime = performance.now();
  try {
    const body = await request.json();
    const {
      messages,
      initiativeId,
      workspaceId,
    }: {
      messages: UIMessage[];
      initiativeId?: string;
      workspaceId?: string;
    } = body;

    // Extract the latest user message text for context assembly
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    const userMessageText =
      lastUserMessage?.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ") ?? "";

    // If Anthropic API key is not configured, return a mock stream
    if (!process.env.ANTHROPIC_API_KEY) {
      return createMockStreamResponse(userMessageText);
    }

    // Check token budget before proceeding
    const wsId = workspaceId ?? "default";
    const budget = tokenBudget.checkBudget(wsId);
    if (budget.exceeded) {
      return new Response(
        JSON.stringify({ error: tokenBudget.getExceededMessage(wsId) }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    // Classify user intent for context-aware prompting
    const intentResult = classify(userMessageText);
    const intentHint = intentToPromptHint(intentResult);

    // Build conversation history from messages for context assembly
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content:
        m.parts
          ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join(" ") ?? "",
    }));

    // Assemble full context (system prompt, knowledge, initiative, history)
    const context = await assembleContext({
      workspaceId: wsId,
      initiativeId,
      userMessage: userMessageText,
      conversationHistory,
    });

    // Append intent hint to the system prompt
    const systemPromptWithIntent = [
      context.systemPrompt,
      `\n## User Intent Analysis\nDetected intent: ${intentResult.intent} (confidence: ${intentResult.confidence.toFixed(2)})\n${intentHint}`,
      intentResult.suggestedTools.length > 0
        ? `Suggested tools: ${intentResult.suggestedTools.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Convert UIMessages to model messages for the LLM
    const modelMessages = await convertToModelMessages(messages);

    // Create the Anthropic provider
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Stream the response
    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPromptWithIntent,
      messages: modelMessages,
      tools: orchestratorTools,
      stopWhen: stepCountIs(5),
      onError({ error }) {
        console.error("Orchestrator stream error:", error);
      },
      async onFinish({ usage }) {
        // Record token usage after response completes
        if (usage) {
          const totalTokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
          tokenBudget.recordUsage(wsId, totalTokens);

          // Track LLM cost metrics
          trackLLMUsage(
            "claude-sonnet-4-20250514",
            usage.inputTokens ?? 0,
            usage.outputTokens ?? 0,
          );
        }

        // Track API latency
        trackApiLatency("/api/chat", performance.now() - startTime, 200);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    captureError(error, { route: "/api/chat" });
    trackApiLatency("/api/chat", performance.now() - startTime, 500);

    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
