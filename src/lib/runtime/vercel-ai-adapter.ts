/**
 * Vercel AI SDK Runtime Adapter
 *
 * Implements AgentRuntimeAdapter using the Vercel AI SDK with Anthropic models.
 * Falls back to mock responses when ANTHROPIC_API_KEY is not set.
 */

import { generateText, tool as defineTool } from "ai";
import type { ToolSet } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type {
  AgentRuntimeAdapter,
  CreateRunInput,
  CreateRunResult,
  RunStatus,
  RunOutput,
  RuntimeContext,
  RuntimeMessage,
  RuntimeEvent,
  ToolCallResult,
  ToolActionRequest,
  ToolActionResult,
  ApprovalRequest,
  ApprovalResult,
  TokenUsage,
} from "./types";

// ---------------------------------------------------------------------------
// Model selection
// ---------------------------------------------------------------------------

type RiskLevel = "low" | "medium" | "high";

const MODEL_MAP: Record<RiskLevel, string> = {
  low: "claude-haiku-4-20250414",
  medium: "claude-sonnet-4-20250514",
  high: "claude-opus-4-20250514",
};

const DEFAULT_MODEL = MODEL_MAP.medium;

function selectModel(riskLevel?: string): string {
  if (riskLevel && riskLevel in MODEL_MAP) {
    return MODEL_MAP[riskLevel as RiskLevel];
  }
  return DEFAULT_MODEL;
}

// ---------------------------------------------------------------------------
// Internal run state
// ---------------------------------------------------------------------------

interface RunState {
  id: string;
  status: RunStatus;
  input: CreateRunInput;
  messages: RuntimeMessage[];
  toolCalls: ToolCallResult[];
  tokenUsage?: TokenUsage;
  events: RuntimeEvent[];
  additionalContext: RuntimeContext[];
  abortController?: AbortController;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

function isApiKeyConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function pushEvent(
  state: RunState,
  type: RuntimeEvent["type"],
  data: Record<string, unknown>
): void {
  state.events.push({ type, data, timestamp: now() });
}

/**
 * Persist token usage to the agent_runs table after a run completes.
 * Looks for a dbRunId in the run input context to link to the DB record.
 * Uses dynamic import to avoid pulling server-only deps into client bundles.
 */
async function persistTokenUsage(state: RunState): Promise<void> {
  const dbRunId =
    state.input.context?.additionalContext?.dbRunId as string | undefined;
  if (!dbRunId || !state.tokenUsage) return;

  try {
    const { updateAgentRun } = await import("@/lib/agents/actions");
    await updateAgentRun({
      runId: dbRunId,
      status: state.status as "completed" | "failed",
      tokenUsage: {
        input: state.tokenUsage.inputTokens,
        output: state.tokenUsage.outputTokens,
        total: state.tokenUsage.totalTokens,
      },
    });
  } catch (err) {
    console.error("[VercelAIAdapter] Failed to persist token usage:", err);
  }
}

// ---------------------------------------------------------------------------
// Convert ToolDefinition[] to Vercel AI SDK ToolSet
// ---------------------------------------------------------------------------

function convertTools(tools: CreateRunInput["tools"]): ToolSet | undefined {
  if (!tools || tools.length === 0) return undefined;

  const converted: ToolSet = {};

  for (const t of tools) {
    // The parameters field from ToolDefinition is a JSON-Schema-like object.
    // We wrap it with z.object using z.any() for each key so that the Vercel
    // AI SDK can serialize it correctly. A more precise mapping could be built
    // but this keeps the adapter simple and forward-compatible.
    const paramKeys = Object.keys(t.parameters);
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const key of paramKeys) {
      shape[key] = z.any().describe(
        typeof t.parameters[key] === "object" &&
          t.parameters[key] !== null &&
          "description" in (t.parameters[key] as Record<string, unknown>)
          ? String((t.parameters[key] as Record<string, string>).description)
          : key
      );
    }

    converted[t.name] = defineTool({
      description: t.description,
      inputSchema: z.object(shape),
    });
  }

  return converted;
}

// ---------------------------------------------------------------------------
// Mock implementation (no API key)
// ---------------------------------------------------------------------------

async function executeMockRun(state: RunState): Promise<void> {
  pushEvent(state, "status_change", { from: "queued", to: "running" });
  state.status = "running";

  // Simulate thinking delay
  await new Promise((r) => setTimeout(r, 800));

  const assistantMessage: RuntimeMessage = {
    role: "assistant",
    content: `[Mock response] I received your message: "${state.input.userMessage.slice(0, 100)}". This is a simulated response because ANTHROPIC_API_KEY is not configured. In production, this would be handled by the ${selectModel((state.input.context?.additionalContext?.riskLevel as string) ?? undefined)} model.`,
    timestamp: now(),
  };

  state.messages.push(assistantMessage);
  pushEvent(state, "message", { message: assistantMessage });

  state.tokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };

  state.status = "completed";
  pushEvent(state, "status_change", { from: "running", to: "completed" });

  // Persist token usage to DB
  await persistTokenUsage(state);
}

// ---------------------------------------------------------------------------
// Real implementation (Vercel AI SDK + Anthropic)
// ---------------------------------------------------------------------------

async function executeRealRun(state: RunState): Promise<void> {
  pushEvent(state, "status_change", { from: "queued", to: "running" });
  state.status = "running";

  const riskLevel = state.input.context?.additionalContext?.riskLevel as
    | string
    | undefined;
  const modelId = selectModel(riskLevel);

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Build message array from context
  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

  // Include previous messages from context
  if (state.input.context?.previousMessages) {
    for (const msg of state.input.context.previousMessages) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  // Add current user message
  messages.push({ role: "user", content: state.input.userMessage });

  try {
    const tools = convertTools(state.input.tools);

    const result = await generateText({
      model: anthropic(modelId),
      system: state.input.systemPrompt,
      messages,
      ...(tools ? { tools } : {}),
      abortSignal: state.abortController?.signal,
    });

    // Capture assistant response
    const assistantMessage: RuntimeMessage = {
      role: "assistant",
      content: result.text,
      timestamp: now(),
    };
    state.messages.push(assistantMessage);
    pushEvent(state, "message", { message: assistantMessage });

    // Capture tool calls if any
    if (result.toolCalls && result.toolCalls.length > 0) {
      for (const tc of result.toolCalls) {
        const toolResult: ToolCallResult = {
          toolName: tc.toolName,
          input: tc.input as Record<string, unknown>,
          output: {},
          status: "success",
        };
        state.toolCalls.push(toolResult);
        pushEvent(state, "tool_call", { toolCall: toolResult });
      }
    }

    // Capture token usage
    state.tokenUsage = {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      totalTokens: result.usage.totalTokens ?? 0,
    };

    state.status = "completed";
    pushEvent(state, "status_change", { from: "running", to: "completed" });

    // Persist token usage to DB
    await persistTokenUsage(state);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during run";

    // Status may have been changed to "cancelled" by cancelRun() on another
    // async tick while we were awaiting the API call.
    if ((state.status as RunStatus) === "cancelled") {
      return;
    }

    state.status = "failed";
    pushEvent(state, "error", { error: errorMessage });
    pushEvent(state, "status_change", { from: "running", to: "failed" });
  }
}

// ---------------------------------------------------------------------------
// VercelAIRuntimeAdapter
// ---------------------------------------------------------------------------

export class VercelAIRuntimeAdapter implements AgentRuntimeAdapter {
  private runs = new Map<string, RunState>();

  // ---- createRun ----

  async createRun(input: CreateRunInput): Promise<CreateRunResult> {
    const runId = generateRunId();
    const abortController = new AbortController();

    const state: RunState = {
      id: runId,
      status: "queued",
      input,
      messages: [
        { role: "user", content: input.userMessage, timestamp: now() },
      ],
      toolCalls: [],
      events: [],
      additionalContext: [],
      abortController,
    };

    this.runs.set(runId, state);
    pushEvent(state, "status_change", { from: null, to: "queued" });

    // Fire-and-forget: run in background
    const execute = isApiKeyConfigured() ? executeRealRun : executeMockRun;
    execute(state).catch((err) => {
      state.status = "failed";
      pushEvent(state, "error", {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return { runId, status: state.status };
  }

  // ---- getRunStatus ----

  async getRunStatus(runId: string): Promise<RunStatus> {
    const state = this.runs.get(runId);
    if (!state) {
      throw new Error(`Run not found: ${runId}`);
    }
    return state.status;
  }

  // ---- getRunOutput ----

  async getRunOutput(runId: string): Promise<RunOutput> {
    const state = this.runs.get(runId);
    if (!state) {
      throw new Error(`Run not found: ${runId}`);
    }
    return {
      runId: state.id,
      status: state.status,
      messages: state.messages,
      toolCalls: state.toolCalls.length > 0 ? state.toolCalls : undefined,
      tokenUsage: state.tokenUsage,
    };
  }

  // ---- cancelRun ----

  async cancelRun(runId: string): Promise<void> {
    const state = this.runs.get(runId);
    if (!state) {
      throw new Error(`Run not found: ${runId}`);
    }

    const prev = state.status;
    state.status = "cancelled";
    state.abortController?.abort();
    pushEvent(state, "status_change", { from: prev, to: "cancelled" });
  }

  // ---- submitContext ----

  async submitContext(runId: string, context: RuntimeContext): Promise<void> {
    const state = this.runs.get(runId);
    if (!state) {
      throw new Error(`Run not found: ${runId}`);
    }
    state.additionalContext.push(context);
  }

  // ---- requestToolAction ----

  async requestToolAction(action: ToolActionRequest): Promise<ToolActionResult> {
    const state = this.runs.get(action.runId);
    if (!state) {
      throw new Error(`Run not found: ${action.runId}`);
    }

    // Delegate tool execution. In a full implementation this would route to
    // the registered tool handlers (e.g. orchestratorTools). For now we record
    // the request and return a placeholder success.
    const result: ToolActionResult = {
      status: "success",
      result: {
        toolName: action.toolName,
        message: `Tool "${action.toolName}" executed successfully.`,
        payload: action.payload,
      },
    };

    const toolCallResult: ToolCallResult = {
      toolName: action.toolName,
      input: action.payload,
      output: result.result,
      status: "success",
    };

    state.toolCalls.push(toolCallResult);
    pushEvent(state, "tool_call", { toolCall: toolCallResult });

    return result;
  }

  // ---- requestApproval ----

  async requestApproval(request: ApprovalRequest): Promise<ApprovalResult> {
    const state = this.runs.get(request.runId);
    if (!state) {
      throw new Error(`Run not found: ${request.runId}`);
    }

    const prev = state.status;
    state.status = "waiting_approval";
    pushEvent(state, "status_change", { from: prev, to: "waiting_approval" });

    pushEvent(state, "approval_request", {
      title: request.title,
      description: request.description,
      category: request.category,
      metadata: request.metadata,
    });

    // In a real implementation, this would block until the user responds
    // through the UI. For now, return a pending / not-yet-approved result
    // so callers can poll or subscribe via streamEvents.
    return {
      approved: false,
      feedback: "Approval is pending. The user has not yet responded.",
    };
  }

  // ---- streamEvents ----

  async *streamEvents(runId: string): AsyncGenerator<RuntimeEvent> {
    const state = this.runs.get(runId);
    if (!state) {
      throw new Error(`Run not found: ${runId}`);
    }

    let cursor = 0;

    // Yield existing events, then poll for new ones until the run terminates
    while (true) {
      // Yield any events accumulated since last check
      while (cursor < state.events.length) {
        yield state.events[cursor];
        cursor++;
      }

      // If the run is in a terminal state and we've drained all events, stop
      const terminal: RunStatus[] = ["completed", "failed", "cancelled"];
      if (terminal.includes(state.status) && cursor >= state.events.length) {
        break;
      }

      // Brief pause before checking again
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const vercelAIRuntime = new VercelAIRuntimeAdapter();
