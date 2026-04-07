/**
 * Runtime Adapter Interface
 *
 * Abstracts the underlying agent runtime (Claude, OpenAI, etc.)
 * so the product layer never couples to a specific provider.
 */

export interface CreateRunInput {
  agentId: string;
  initiativeId?: string;
  workItemId?: string;
  systemPrompt: string;
  userMessage: string;
  context?: RuntimeContext;
  tools?: ToolDefinition[];
}

export interface CreateRunResult {
  runId: string;
  status: RunStatus;
}

export type RunStatus =
  | "queued"
  | "planning"
  | "waiting_approval"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "cancelled";

export interface RunOutput {
  runId: string;
  status: RunStatus;
  messages: RuntimeMessage[];
  toolCalls?: ToolCallResult[];
  tokenUsage?: TokenUsage;
}

export interface RuntimeContext {
  knowledgeObjects?: Array<{ id: string; content: string; path: string }>;
  initiativeBrief?: string;
  previousMessages?: RuntimeMessage[];
  additionalContext?: Record<string, unknown>;
}

export interface RuntimeMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCallResult {
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: "success" | "failure";
}

export interface ToolActionRequest {
  runId: string;
  toolName: string;
  payload: Record<string, unknown>;
}

export interface ToolActionResult {
  status: "success" | "failure";
  result: Record<string, unknown>;
}

export interface ApprovalRequest {
  runId: string;
  title: string;
  description: string;
  category: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalResult {
  approved: boolean;
  feedback?: string;
}

export interface RuntimeEvent {
  type: "message" | "tool_call" | "status_change" | "approval_request" | "error";
  data: Record<string, unknown>;
  timestamp: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * The core adapter interface that all runtime implementations must satisfy.
 */
export interface AgentRuntimeAdapter {
  createRun(input: CreateRunInput): Promise<CreateRunResult>;
  getRunStatus(runId: string): Promise<RunStatus>;
  getRunOutput(runId: string): Promise<RunOutput>;
  cancelRun(runId: string): Promise<void>;
  submitContext(runId: string, context: RuntimeContext): Promise<void>;
  requestToolAction(action: ToolActionRequest): Promise<ToolActionResult>;
  requestApproval(request: ApprovalRequest): Promise<ApprovalResult>;
  streamEvents(runId: string): AsyncIterable<RuntimeEvent>;
}
