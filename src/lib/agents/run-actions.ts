"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AgentRun, AgentRunStatus } from "@/types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string };

interface GetAgentRunsOptions {
  limit?: number;
  offset?: number;
  status?: AgentRunStatus;
}

// ------------------------------------------------------------
// Mock data
// ------------------------------------------------------------

const MOCK_INITIATIVE_NAMES: Record<string, string> = {
  "init-001": "Q2 AEO Content Blitz",
  "init-002": "Enterprise ABM - Acme Corp",
  "init-003": "Product-Led Growth Loop",
};

function buildMockRuns(): AgentRun[] {
  const now = Date.now();
  const hour = 3_600_000;

  const statuses: AgentRunStatus[] = [
    "running",
    "completed",
    "completed",
    "failed",
    "completed",
    "cancelled",
    "completed",
    "queued",
    "completed",
    "blocked",
  ];

  return statuses.map((status, i) => {
    const startedAt = new Date(now - (i + 1) * hour * 1.7).toISOString();
    const durationMs = (2 + Math.random() * 15) * 60_000;
    const completedAt =
      status === "completed" || status === "failed" || status === "cancelled"
        ? new Date(new Date(startedAt).getTime() + durationMs).toISOString()
        : undefined;

    const initiativeIds = ["init-001", "init-002", "init-003", undefined];
    const initiativeId = initiativeIds[i % initiativeIds.length];

    return {
      id: `run-${String(i + 1).padStart(3, "0")}`,
      agent_id: "mock-agent",
      initiative_id: initiativeId,
      status,
      input: {
        task: `Task ${i + 1}: ${status === "failed" ? "Analyze competitor pricing" : "Generate campaign brief"}`,
        initiative: initiativeId
          ? MOCK_INITIATIVE_NAMES[initiativeId] ?? "Unknown"
          : undefined,
        parameters: { depth: "deep", format: "markdown" },
      },
      output:
        status === "completed"
          ? {
              result: "Successfully completed the assigned task.",
              deliverables: ["brief.md", "audience-segments.json"],
              summary: `Produced ${2 + i} deliverables across ${1 + (i % 3)} channels.`,
            }
          : status === "failed"
            ? { partial: true, last_step: "data_retrieval" }
            : undefined,
      error: status === "failed" ? "Rate limit exceeded on external API call" : undefined,
      token_usage: {
        input: 800 + Math.floor(Math.random() * 1200),
        output: 400 + Math.floor(Math.random() * 800),
      },
      started_at: status !== "queued" ? startedAt : undefined,
      completed_at: completedAt,
      created_at: new Date(new Date(startedAt).getTime() - 5000).toISOString(),
    };
  });
}

const MOCK_RUNS = buildMockRuns();

// ------------------------------------------------------------
// Server Actions
// ------------------------------------------------------------

export async function getAgentRuns(
  agentId: string,
  options: GetAgentRunsOptions = {}
): Promise<ActionResult<{ runs: AgentRun[]; total: number }>> {
  const { limit = 20, offset = 0, status } = options;

  if (!isSupabaseConfigured) {
    let filtered = MOCK_RUNS.map((r) => ({ ...r, agent_id: agentId }));
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }
    const total = filtered.length;
    const runs = filtered.slice(offset, offset + limit);
    return { data: { runs, total } };
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from("agent_runs")
      .select("*", { count: "exact" })
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      return { error: error.message };
    }

    return { data: { runs: (data ?? []) as AgentRun[], total: count ?? 0 } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch agent runs" };
  }
}

export async function getAgentRunDetail(
  runId: string
): Promise<ActionResult<AgentRun>> {
  if (!isSupabaseConfigured) {
    const found = MOCK_RUNS.find((r) => r.id === runId);
    if (found) return { data: found };
    // Return a rich mock even if not found by id
    return {
      data: {
        ...MOCK_RUNS[0],
        id: runId,
      },
    };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("agent_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as AgentRun };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch run detail" };
  }
}

export async function cancelAgentRun(
  runId: string
): Promise<ActionResult<AgentRun>> {
  if (!isSupabaseConfigured) {
    const found = MOCK_RUNS.find((r) => r.id === runId);
    return {
      data: {
        ...(found ?? MOCK_RUNS[0]),
        id: runId,
        status: "cancelled",
        completed_at: new Date().toISOString(),
      },
    };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("agent_runs")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .in("status", ["queued", "planning", "running", "waiting_approval"])
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as AgentRun };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to cancel run" };
  }
}
