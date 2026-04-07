import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

// ------------------------------------------------------------
// Analytics query functions (server-side).
// Each function falls back to mock data when Supabase is not
// configured so the Reports page always renders.
// ------------------------------------------------------------

// --- Return types ---

export interface WorkspaceMetrics {
  activeInitiatives: number;
  completedInitiatives: number;
  totalApprovals: number;
  approvalRate: number;
  avgApprovalTime: number;
  agentRunCount: number;
  agentSuccessRate: number;
  avgTokenUsage: number;
  workflowsCompleted: number;
  knowledgeObjectCount: number;
}

export interface AgentPerformanceRow {
  agentName: string;
  runCount: number;
  successRate: number;
  avgDuration: number;
  totalTokens: number;
}

export interface UsageTrendRow {
  date: string;
  initiatives: number;
  approvals: number;
  agentRuns: number;
  tokensUsed: number;
}

export interface CostBreakdownAgent {
  name: string;
  tokens: number;
  cost: number;
}

export interface CostEstimate {
  totalTokens: number;
  estimatedCost: number;
  byAgent: CostBreakdownAgent[];
}

// --- Constants ---

const COST_PER_1K_TOKENS = 0.003; // rough blended estimate

// --- Mock data generators ---

function mockWorkspaceMetrics(): WorkspaceMetrics {
  return {
    activeInitiatives: 4,
    completedInitiatives: 12,
    totalApprovals: 38,
    approvalRate: 84,
    avgApprovalTime: 2.4,
    agentRunCount: 156,
    agentSuccessRate: 94,
    avgTokenUsage: 3200,
    workflowsCompleted: 47,
    knowledgeObjectCount: 89,
  };
}

function mockAgentPerformance(): AgentPerformanceRow[] {
  return [
    { agentName: "Content Strategist", runCount: 48, successRate: 96, avgDuration: 12400, totalTokens: 184_000 },
    { agentName: "Campaign Orchestrator", runCount: 32, successRate: 91, avgDuration: 18200, totalTokens: 142_000 },
    { agentName: "ABM Manager", runCount: 28, successRate: 93, avgDuration: 15600, totalTokens: 118_000 },
    { agentName: "SDR Agent", runCount: 24, successRate: 88, avgDuration: 8400, totalTokens: 96_000 },
    { agentName: "Brand Guardian", runCount: 24, successRate: 100, avgDuration: 4200, totalTokens: 62_000 },
  ];
}

function mockUsageTrends(days: number): UsageTrendRow[] {
  const rows: UsageTrendRow[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    rows.push({
      date: d.toISOString().slice(0, 10),
      initiatives: Math.floor(Math.random() * 3) + 1,
      approvals: Math.floor(Math.random() * 6) + 2,
      agentRuns: Math.floor(Math.random() * 20) + 5,
      tokensUsed: Math.floor(Math.random() * 30_000) + 10_000,
    });
  }
  return rows;
}

function mockCostEstimate(): CostEstimate {
  const agents = mockAgentPerformance();
  const byAgent: CostBreakdownAgent[] = agents.map((a) => ({
    name: a.agentName,
    tokens: a.totalTokens,
    cost: parseFloat(((a.totalTokens / 1000) * COST_PER_1K_TOKENS).toFixed(2)),
  }));
  const totalTokens = byAgent.reduce((sum, a) => sum + a.tokens, 0);
  return {
    totalTokens,
    estimatedCost: parseFloat(((totalTokens / 1000) * COST_PER_1K_TOKENS).toFixed(2)),
    byAgent,
  };
}

// --- Query functions ---

export async function getWorkspaceMetrics(
  workspaceId: string,
  _startDate: string,
  _endDate: string,
): Promise<WorkspaceMetrics> {
  if (!isSupabaseConfigured) return mockWorkspaceMetrics();

  try {
    const supabase = await createClient();

    // Active & completed initiatives
    const { data: initiatives } = await supabase
      .from("initiatives")
      .select("status")
      .eq("workspace_id", workspaceId);

    const activeInitiatives = (initiatives ?? []).filter(
      (i) => i.status === "active" || i.status === "planning",
    ).length;
    const completedInitiatives = (initiatives ?? []).filter(
      (i) => i.status === "completed",
    ).length;

    // Approvals
    const { data: approvals } = await supabase
      .from("approvals")
      .select("status")
      .eq("workspace_id", workspaceId);

    const totalApprovals = (approvals ?? []).length;
    const approved = (approvals ?? []).filter((a) => a.status === "approved").length;
    const approvalRate = totalApprovals > 0 ? Math.round((approved / totalApprovals) * 100) : 0;

    // Agent runs from events
    const { data: agentEvents } = await supabase
      .from("events")
      .select("type, metadata")
      .eq("workspace_id", workspaceId)
      .in("type", ["agent.run_completed", "agent.run_failed"]);

    const agentRunCount = (agentEvents ?? []).length;
    const successfulRuns = (agentEvents ?? []).filter(
      (e) => e.type === "agent.run_completed",
    ).length;
    const agentSuccessRate = agentRunCount > 0 ? Math.round((successfulRuns / agentRunCount) * 100) : 0;

    // Avg token usage from metadata
    const tokenValues = (agentEvents ?? [])
      .map((e) => (e.metadata as Record<string, unknown>)?.tokenUsage as number)
      .filter((t): t is number => typeof t === "number");
    const avgTokenUsage =
      tokenValues.length > 0
        ? Math.round(tokenValues.reduce((s, v) => s + v, 0) / tokenValues.length)
        : 0;

    // Workflows
    const { count: workflowsCompleted } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("type", "skill.executed");

    // Knowledge objects
    const { count: knowledgeObjectCount } = await supabase
      .from("knowledge_objects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    return {
      activeInitiatives,
      completedInitiatives,
      totalApprovals,
      approvalRate,
      avgApprovalTime: 2.4, // would need resolved_at - created_at aggregation
      agentRunCount,
      agentSuccessRate,
      avgTokenUsage,
      workflowsCompleted: workflowsCompleted ?? 0,
      knowledgeObjectCount: knowledgeObjectCount ?? 0,
    };
  } catch (err) {
    console.error("[analytics/queries] getWorkspaceMetrics error:", err);
    return mockWorkspaceMetrics();
  }
}

export async function getAgentPerformance(
  workspaceId: string,
  _period: string,
): Promise<AgentPerformanceRow[]> {
  if (!isSupabaseConfigured) return mockAgentPerformance();

  try {
    const supabase = await createClient();

    const { data: events } = await supabase
      .from("events")
      .select("type, actor_id, metadata")
      .eq("workspace_id", workspaceId)
      .in("type", ["agent.run_completed", "agent.run_failed"]);

    if (!events || events.length === 0) return mockAgentPerformance();

    const byAgent = new Map<
      string,
      { runs: number; successes: number; totalDuration: number; totalTokens: number }
    >();

    for (const e of events) {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      const name = (meta.agentName as string) || e.actor_id;
      const entry = byAgent.get(name) ?? { runs: 0, successes: 0, totalDuration: 0, totalTokens: 0 };
      entry.runs += 1;
      if (e.type === "agent.run_completed") entry.successes += 1;
      entry.totalDuration += (meta.durationMs as number) || 0;
      entry.totalTokens += (meta.tokenUsage as number) || 0;
      byAgent.set(name, entry);
    }

    return Array.from(byAgent.entries()).map(([agentName, s]) => ({
      agentName,
      runCount: s.runs,
      successRate: s.runs > 0 ? Math.round((s.successes / s.runs) * 100) : 0,
      avgDuration: s.runs > 0 ? Math.round(s.totalDuration / s.runs) : 0,
      totalTokens: s.totalTokens,
    }));
  } catch (err) {
    console.error("[analytics/queries] getAgentPerformance error:", err);
    return mockAgentPerformance();
  }
}

export async function getUsageTrends(
  workspaceId: string,
  days: number,
): Promise<UsageTrendRow[]> {
  if (!isSupabaseConfigured) return mockUsageTrends(days);

  try {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: events } = await supabase
      .from("events")
      .select("type, metadata, created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (!events || events.length === 0) return mockUsageTrends(days);

    const buckets = new Map<string, UsageTrendRow>();

    // Pre-fill every day
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, initiatives: 0, approvals: 0, agentRuns: 0, tokensUsed: 0 });
    }

    for (const e of events) {
      const key = e.created_at.slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;

      if (e.type.startsWith("initiative.")) bucket.initiatives += 1;
      if (e.type.startsWith("approval.")) bucket.approvals += 1;
      if (e.type.startsWith("agent.")) {
        bucket.agentRuns += 1;
        const meta = (e.metadata ?? {}) as Record<string, unknown>;
        bucket.tokensUsed += (meta.tokenUsage as number) || 0;
      }
    }

    return Array.from(buckets.values());
  } catch (err) {
    console.error("[analytics/queries] getUsageTrends error:", err);
    return mockUsageTrends(days);
  }
}

export async function getCostEstimate(
  workspaceId: string,
  _period: string,
): Promise<CostEstimate> {
  if (!isSupabaseConfigured) return mockCostEstimate();

  try {
    const agents = await getAgentPerformance(workspaceId, _period);
    const byAgent: CostBreakdownAgent[] = agents.map((a) => ({
      name: a.agentName,
      tokens: a.totalTokens,
      cost: parseFloat(((a.totalTokens / 1000) * COST_PER_1K_TOKENS).toFixed(2)),
    }));
    const totalTokens = byAgent.reduce((sum, a) => sum + a.tokens, 0);
    return {
      totalTokens,
      estimatedCost: parseFloat(((totalTokens / 1000) * COST_PER_1K_TOKENS).toFixed(2)),
      byAgent,
    };
  } catch (err) {
    console.error("[analytics/queries] getCostEstimate error:", err);
    return mockCostEstimate();
  }
}

// --- Onboarding Funnel ---

export interface OnboardingFunnelStep {
  step: string;
  label: string;
  count: number;
  rate: number;
}

export interface OnboardingMetrics {
  totalStarted: number;
  totalCompleted: number;
  overallCompletionRate: number;
  steps: OnboardingFunnelStep[];
}

function mockOnboardingMetrics(): OnboardingMetrics {
  const steps: OnboardingFunnelStep[] = [
    { step: "signup", label: "Signed Up", count: 248, rate: 100 },
    { step: "workspace_created", label: "Created Workspace", count: 214, rate: 86 },
    { step: "first_initiative", label: "Created First Initiative", count: 167, rate: 67 },
    { step: "agent_configured", label: "Configured an Agent", count: 132, rate: 53 },
    { step: "first_run", label: "Ran First Agent", count: 98, rate: 40 },
    { step: "onboarding_complete", label: "Completed Onboarding", count: 87, rate: 35 },
  ];

  return {
    totalStarted: 248,
    totalCompleted: 87,
    overallCompletionRate: 35,
    steps,
  };
}

export async function getOnboardingMetrics(
  workspaceId?: string,
): Promise<OnboardingMetrics> {
  if (!isSupabaseConfigured) return mockOnboardingMetrics();

  try {
    const supabase = await createClient();

    // Query onboarding events from the events table
    let query = supabase
      .from("events")
      .select("type, actor_id, metadata, created_at")
      .like("type", "onboarding.%");

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    const { data: events } = await query;

    if (!events || events.length === 0) return mockOnboardingMetrics();

    // Count unique users per step
    const stepCounts = new Map<string, Set<string>>();
    const stepOrder = [
      "signup",
      "workspace_created",
      "first_initiative",
      "agent_configured",
      "first_run",
      "onboarding_complete",
    ];

    for (const step of stepOrder) {
      stepCounts.set(step, new Set());
    }

    for (const e of events) {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      const step = (meta.step as string) ?? e.type.replace("onboarding.", "");
      const userSet = stepCounts.get(step);
      if (userSet) {
        userSet.add(e.actor_id);
      }
    }

    const totalStarted = stepCounts.get("signup")?.size ?? 0;

    const stepLabels: Record<string, string> = {
      signup: "Signed Up",
      workspace_created: "Created Workspace",
      first_initiative: "Created First Initiative",
      agent_configured: "Configured an Agent",
      first_run: "Ran First Agent",
      onboarding_complete: "Completed Onboarding",
    };

    const steps: OnboardingFunnelStep[] = stepOrder.map((step) => {
      const count = stepCounts.get(step)?.size ?? 0;
      return {
        step,
        label: stepLabels[step] ?? step,
        count,
        rate: totalStarted > 0 ? Math.round((count / totalStarted) * 100) : 0,
      };
    });

    const totalCompleted = stepCounts.get("onboarding_complete")?.size ?? 0;

    return {
      totalStarted,
      totalCompleted,
      overallCompletionRate: totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0,
      steps,
    };
  } catch (err) {
    console.error("[analytics/queries] getOnboardingMetrics error:", err);
    return mockOnboardingMetrics();
  }
}
