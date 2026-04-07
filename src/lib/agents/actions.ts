"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { logAgentEvent } from "@/lib/events/logger";
import type { Agent, AgentRiskLevel, AgentRun, AgentRunStatus } from "@/types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface CreateAgentParams {
  workspaceId: string;
  name: string;
  role: string;
  description?: string;
  tone?: string;
  riskLevel: AgentRiskLevel;
  canExecute: boolean;
  requiresApproval: boolean;
  tools: string[];
  systemPrompt?: string;
}

interface UpdateAgentParams {
  agentId: string;
  name?: string;
  role?: string;
  description?: string;
  tone?: string;
  riskLevel?: AgentRiskLevel;
  canExecute?: boolean;
  requiresApproval?: boolean;
  tools?: string[];
  systemPrompt?: string;
  isActive?: boolean;
}

interface CreateAgentRunParams {
  agentId: string;
  initiativeId?: string;
  input: Record<string, unknown>;
  status?: AgentRunStatus;
}

interface UpdateAgentRunParams {
  runId: string;
  status: AgentRunStatus;
  output?: Record<string, unknown>;
  error?: string;
  tokenUsage?: Record<string, unknown>;
}

interface GetAgentRunsParams {
  workspaceId: string;
  agentId?: string;
  initiativeId?: string;
  status?: AgentRunStatus;
  limit?: number;
}

type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string };

// ------------------------------------------------------------
// Mock helpers (used when Supabase is not configured)
// ------------------------------------------------------------

function mockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: crypto.randomUUID(),
    workspace_id: "mock-workspace",
    name: "Mock Agent",
    role: "assistant",
    risk_level: "low",
    can_execute: false,
    requires_approval: true,
    tools: [],
    is_active: true,
    ...overrides,
  };
}

function mockAgentRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    id: crypto.randomUUID(),
    agent_id: "mock-agent",
    status: "queued",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ------------------------------------------------------------
// Agent CRUD
// ------------------------------------------------------------

export async function createAgent(
  params: CreateAgentParams
): Promise<ActionResult<Agent>> {
  if (!isSupabaseConfigured) {
    return {
      data: mockAgent({
        workspace_id: params.workspaceId,
        name: params.name,
        role: params.role,
        description: params.description,
        tone: params.tone,
        risk_level: params.riskLevel,
        can_execute: params.canExecute,
        requires_approval: params.requiresApproval,
        tools: params.tools,
      }),
    };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("agents")
      .insert({
        workspace_id: params.workspaceId,
        name: params.name,
        role: params.role,
        description: params.description ?? null,
        tone: params.tone ?? null,
        risk_level: params.riskLevel,
        can_execute: params.canExecute,
        requires_approval: params.requiresApproval,
        tools: params.tools,
        system_prompt: params.systemPrompt ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Agent };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create agent" };
  }
}

export async function updateAgent(
  params: UpdateAgentParams
): Promise<ActionResult<Agent>> {
  if (!isSupabaseConfigured) {
    return {
      data: mockAgent({
        id: params.agentId,
        name: params.name,
        role: params.role,
        description: params.description,
        tone: params.tone,
        risk_level: params.riskLevel,
        can_execute: params.canExecute,
        requires_approval: params.requiresApproval,
        tools: params.tools,
        is_active: params.isActive,
      }),
    };
  }

  try {
    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {};
    if (params.name !== undefined) updatePayload.name = params.name;
    if (params.role !== undefined) updatePayload.role = params.role;
    if (params.description !== undefined) updatePayload.description = params.description;
    if (params.tone !== undefined) updatePayload.tone = params.tone;
    if (params.riskLevel !== undefined) updatePayload.risk_level = params.riskLevel;
    if (params.canExecute !== undefined) updatePayload.can_execute = params.canExecute;
    if (params.requiresApproval !== undefined) updatePayload.requires_approval = params.requiresApproval;
    if (params.tools !== undefined) updatePayload.tools = params.tools;
    if (params.systemPrompt !== undefined) updatePayload.system_prompt = params.systemPrompt;
    if (params.isActive !== undefined) updatePayload.is_active = params.isActive;

    const { data, error } = await supabase
      .from("agents")
      .update(updatePayload)
      .eq("id", params.agentId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Agent };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update agent" };
  }
}

export async function deleteAgent(
  agentId: string
): Promise<ActionResult<{ success: boolean }>> {
  if (!isSupabaseConfigured) {
    return { data: { success: true } };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("agents")
      .update({ is_active: false })
      .eq("id", agentId);

    if (error) {
      return { error: error.message };
    }

    return { data: { success: true } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete agent" };
  }
}

export async function getAgents(
  workspaceId: string
): Promise<ActionResult<Agent[]>> {
  if (!isSupabaseConfigured) {
    const mocks = DEFAULT_AGENTS.map((def) =>
      mockAgent({
        workspace_id: workspaceId,
        name: def.name,
        role: def.role,
        description: def.description,
        risk_level: def.riskLevel,
        can_execute: def.canExecute,
        requires_approval: def.requiresApproval,
        tools: def.tools,
      })
    );
    return { data: mocks };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { data: (data ?? []) as Agent[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch agents" };
  }
}

export async function getAgent(
  agentId: string
): Promise<ActionResult<Agent>> {
  if (!isSupabaseConfigured) {
    return { data: mockAgent({ id: agentId }) };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Agent };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch agent" };
  }
}

// ------------------------------------------------------------
// Agent Run Management
// ------------------------------------------------------------

export async function createAgentRun(
  params: CreateAgentRunParams
): Promise<ActionResult<AgentRun>> {
  const status = params.status ?? "queued";

  if (!isSupabaseConfigured) {
    const run = mockAgentRun({
      agent_id: params.agentId,
      initiative_id: params.initiativeId,
      input: params.input,
      status,
    });
    return { data: run };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("agent_runs")
      .insert({
        agent_id: params.agentId,
        initiative_id: params.initiativeId ?? null,
        input: params.input,
        status,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    const run = data as AgentRun;

    // Look up the agent to get its workspace_id for logging
    const { data: agent } = await supabase
      .from("agents")
      .select("workspace_id")
      .eq("id", params.agentId)
      .single();

    if (agent) {
      await logAgentEvent(
        agent.workspace_id,
        run.id,
        "started",
        "agent",
        params.agentId,
        { input: params.input, initiative_id: params.initiativeId },
      );
    }

    return { data: run };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create agent run" };
  }
}

export async function updateAgentRun(
  params: UpdateAgentRunParams
): Promise<ActionResult<AgentRun>> {
  if (!isSupabaseConfigured) {
    return {
      data: mockAgentRun({
        id: params.runId,
        status: params.status,
        output: params.output,
        error: params.error,
      }),
    };
  }

  try {
    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {
      status: params.status,
    };

    if (params.output !== undefined) updatePayload.output = params.output;
    if (params.error !== undefined) updatePayload.error = params.error;
    if (params.tokenUsage !== undefined) updatePayload.token_usage = params.tokenUsage;

    if (params.status === "completed" || params.status === "failed" || params.status === "cancelled") {
      updatePayload.completed_at = new Date().toISOString();
    }
    if (params.status === "running") {
      updatePayload.started_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("agent_runs")
      .update(updatePayload)
      .eq("id", params.runId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    const run = data as AgentRun;

    // Log the event
    const { data: agent } = await supabase
      .from("agents")
      .select("workspace_id")
      .eq("id", run.agent_id)
      .single();

    if (agent) {
      const actionMap: Record<string, "completed" | "failed" | "cancelled" | "started"> = {
        completed: "completed",
        failed: "failed",
        cancelled: "cancelled",
        running: "started",
      };
      const action = actionMap[params.status];
      if (action) {
        await logAgentEvent(
          agent.workspace_id,
          run.id,
          action,
          "agent",
          run.agent_id,
          {
            status: params.status,
            ...(params.output && { output: params.output }),
            ...(params.error && { error: params.error }),
            ...(params.tokenUsage && { token_usage: params.tokenUsage }),
          },
        );
      }
    }

    return { data: run };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update agent run" };
  }
}

export async function getAgentRuns(
  params: GetAgentRunsParams
): Promise<ActionResult<AgentRun[]>> {
  if (!isSupabaseConfigured) {
    const mocks = Array.from({ length: 3 }, (_, i) =>
      mockAgentRun({
        status: params.status ?? "completed",
        agent_id: params.agentId ?? "mock-agent",
      })
    );
    return { data: mocks };
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from("agent_runs")
      .select("*, agents!inner(workspace_id)")
      .eq("agents.workspace_id", params.workspaceId)
      .order("created_at", { ascending: false })
      .limit(params.limit ?? 50);

    if (params.agentId) {
      query = query.eq("agent_id", params.agentId);
    }
    if (params.initiativeId) {
      query = query.eq("initiative_id", params.initiativeId);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: (data ?? []) as AgentRun[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch agent runs" };
  }
}

// ------------------------------------------------------------
// Default Agents Seed
// ------------------------------------------------------------

const DEFAULT_AGENTS: Array<{
  name: string;
  role: string;
  description: string;
  tone: string;
  riskLevel: AgentRiskLevel;
  canExecute: boolean;
  requiresApproval: boolean;
  tools: string[];
  systemPrompt: string;
}> = [
  {
    name: "Orchestrator",
    role: "orchestrator",
    description: "Coordinates multi-agent workflows, decomposes initiatives into tasks, and routes work to specialist agents.",
    tone: "concise, authoritative, structured",
    riskLevel: "medium",
    canExecute: true,
    requiresApproval: false,
    tools: ["task-decomposition", "agent-routing", "status-tracking"],
    systemPrompt:
      "You are the Orchestrator agent. Your job is to break down initiatives into actionable tasks, assign them to the right specialist agents, and track progress. Always produce a clear plan before delegating. Escalate to a human when risk is medium or higher.",
  },
  {
    name: "Campaign Strategist",
    role: "strategist",
    description: "Develops campaign strategies, defines audience segments, and plans channel mix for marketing initiatives.",
    tone: "analytical, insightful, strategic",
    riskLevel: "medium",
    canExecute: false,
    requiresApproval: true,
    tools: ["audience-analysis", "channel-planning", "competitive-research"],
    systemPrompt:
      "You are the Campaign Strategist agent. Analyze the initiative brief, target audience, and competitive landscape to produce a clear campaign strategy. Include audience segments, channel recommendations, messaging pillars, and success metrics.",
  },
  {
    name: "Content Writer",
    role: "writer",
    description: "Creates marketing copy, blog posts, email sequences, and social content aligned with brand voice.",
    tone: "creative, on-brand, engaging",
    riskLevel: "low",
    canExecute: true,
    requiresApproval: true,
    tools: ["content-generation", "brand-voice-check", "seo-optimization"],
    systemPrompt:
      "You are the Content Writer agent. Produce high-quality marketing content that matches the brand voice and campaign goals. Always check content against brand guidelines before submitting. Include SEO considerations where relevant.",
  },
  {
    name: "Researcher",
    role: "researcher",
    description: "Gathers market intelligence, competitor data, audience insights, and content research to inform strategy.",
    tone: "thorough, factual, well-sourced",
    riskLevel: "low",
    canExecute: true,
    requiresApproval: false,
    tools: ["web-search", "data-analysis", "report-generation"],
    systemPrompt:
      "You are the Researcher agent. Gather relevant data, synthesize findings, and present clear research briefs. Always cite sources and distinguish facts from inferences. Flag gaps in available data.",
  },
  {
    name: "QA Reviewer",
    role: "reviewer",
    description: "Reviews content and deliverables for quality, brand consistency, factual accuracy, and compliance.",
    tone: "precise, constructive, detail-oriented",
    riskLevel: "low",
    canExecute: false,
    requiresApproval: false,
    tools: ["content-review", "brand-compliance", "fact-check"],
    systemPrompt:
      "You are the QA Reviewer agent. Review all deliverables for quality, accuracy, brand alignment, and compliance. Provide specific, actionable feedback. Flag any factual errors, tone mismatches, or compliance risks.",
  },
  {
    name: "Optimizer",
    role: "optimizer",
    description: "Analyzes campaign performance data and recommends optimizations to improve results.",
    tone: "data-driven, direct, action-oriented",
    riskLevel: "medium",
    canExecute: false,
    requiresApproval: true,
    tools: ["analytics-read", "ab-testing", "performance-reporting"],
    systemPrompt:
      "You are the Optimizer agent. Analyze performance data across channels, identify what is working and what is not, and recommend specific optimizations. Quantify expected impact where possible. Prioritize recommendations by effort vs. impact.",
  },
];

export async function seedDefaultAgents(
  workspaceId: string
): Promise<ActionResult<Agent[]>> {
  if (!isSupabaseConfigured) {
    const mocks = DEFAULT_AGENTS.map((def) =>
      mockAgent({
        workspace_id: workspaceId,
        name: def.name,
        role: def.role,
        description: def.description,
        tone: def.tone,
        risk_level: def.riskLevel,
        can_execute: def.canExecute,
        requires_approval: def.requiresApproval,
        tools: def.tools,
      })
    );
    return { data: mocks };
  }

  try {
    const supabase = await createClient();

    const rows = DEFAULT_AGENTS.map((def) => ({
      workspace_id: workspaceId,
      name: def.name,
      role: def.role,
      description: def.description,
      tone: def.tone,
      risk_level: def.riskLevel,
      can_execute: def.canExecute,
      requires_approval: def.requiresApproval,
      tools: def.tools,
      system_prompt: def.systemPrompt,
      is_active: true,
    }));

    const { data, error } = await supabase
      .from("agents")
      .insert(rows)
      .select();

    if (error) {
      return { error: error.message };
    }

    return { data: (data ?? []) as Agent[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to seed default agents" };
  }
}
