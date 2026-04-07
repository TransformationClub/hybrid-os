"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Coins,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types mirroring the query return shapes (duplicated here to avoid importing
// server-only modules in a "use client" page).
// ---------------------------------------------------------------------------

interface WorkspaceMetrics {
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

interface AgentPerformanceRow {
  agentName: string;
  runCount: number;
  successRate: number;
  avgDuration: number;
  totalTokens: number;
}

interface UsageTrendRow {
  date: string;
  initiatives: number;
  approvals: number;
  agentRuns: number;
  tokensUsed: number;
}

interface CostBreakdownAgent {
  name: string;
  tokens: number;
  cost: number;
}

interface CostEstimate {
  totalTokens: number;
  estimatedCost: number;
  byAgent: CostBreakdownAgent[];
}

interface OnboardingFunnelStep {
  step: string;
  label: string;
  count: number;
  rate: number;
}

interface OnboardingMetrics {
  totalStarted: number;
  totalCompleted: number;
  overallCompletionRate: number;
  steps: OnboardingFunnelStep[];
}

// ---------------------------------------------------------------------------
// Mock data (used until server queries are wired via API routes)
// ---------------------------------------------------------------------------

const COST_PER_1K = 0.003;

/** More accurate per-token pricing (Claude Sonnet class) */
const INPUT_COST_PER_M = 3; // $3 per 1M input tokens
const OUTPUT_COST_PER_M = 15; // $15 per 1M output tokens

interface LLMUsageEstimate {
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedInputCost: number;
  estimatedOutputCost: number;
  totalCost: number;
}

function mockLLMUsage(): LLMUsageEstimate {
  const agents = mockAgentPerformance();
  // Estimate ~70% input, ~30% output for typical chat interactions
  const totalTokens = agents.reduce((sum, a) => sum + a.totalTokens, 0);
  const totalInputTokens = Math.round(totalTokens * 0.7);
  const totalOutputTokens = totalTokens - totalInputTokens;
  const estimatedInputCost = (totalInputTokens / 1_000_000) * INPUT_COST_PER_M;
  const estimatedOutputCost = (totalOutputTokens / 1_000_000) * OUTPUT_COST_PER_M;
  return {
    totalInputTokens,
    totalOutputTokens,
    estimatedInputCost: parseFloat(estimatedInputCost.toFixed(2)),
    estimatedOutputCost: parseFloat(estimatedOutputCost.toFixed(2)),
    totalCost: parseFloat((estimatedInputCost + estimatedOutputCost).toFixed(2)),
  };
}

function mockMetrics(): WorkspaceMetrics {
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

function mockUsageTrends(): UsageTrendRow[] {
  const rows: UsageTrendRow[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
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

function mockOnboardingMetrics(): OnboardingMetrics {
  return {
    totalStarted: 248,
    totalCompleted: 87,
    overallCompletionRate: 35,
    steps: [
      { step: "signup", label: "Signed Up", count: 248, rate: 100 },
      { step: "workspace_created", label: "Created Workspace", count: 214, rate: 86 },
      { step: "first_initiative", label: "First Initiative", count: 167, rate: 67 },
      { step: "agent_configured", label: "Configured Agent", count: 132, rate: 53 },
      { step: "first_run", label: "First Agent Run", count: 98, rate: 40 },
      { step: "onboarding_complete", label: "Completed", count: 87, rate: 35 },
    ],
  };
}

function mockCostEstimate(): CostEstimate {
  const agents = mockAgentPerformance();
  const byAgent: CostBreakdownAgent[] = agents.map((a) => ({
    name: a.agentName,
    tokens: a.totalTokens,
    cost: parseFloat(((a.totalTokens / 1000) * COST_PER_1K).toFixed(2)),
  }));
  const totalTokens = byAgent.reduce((sum, a) => sum + a.tokens, 0);
  return {
    totalTokens,
    estimatedCost: parseFloat(((totalTokens / 1000) * COST_PER_1K).toFixed(2)),
    byAgent,
  };
}

// ---------------------------------------------------------------------------
// Bar chart (CSS-only, matching home page sparkline pattern)
// ---------------------------------------------------------------------------

function BarChart({
  data,
  valueKey,
  label,
}: {
  data: UsageTrendRow[];
  valueKey: keyof UsageTrendRow;
  label: string;
}) {
  const values = data.map((d) => d[valueKey] as number);
  const max = Math.max(...values, 1);

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end gap-1 h-24">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm bg-primary/70 transition-all min-h-[2px]"
              style={{ height: `${(values[i] / max) * 100}%` }}
            />
            {i % 3 === 0 && (
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                {d.date.slice(5)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function formatDuration(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${(s / 60).toFixed(1)}m`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<WorkspaceMetrics | null>(null);
  const [agents, setAgents] = useState<AgentPerformanceRow[]>([]);
  const [trends, setTrends] = useState<UsageTrendRow[]>([]);
  const [cost, setCost] = useState<CostEstimate | null>(null);
  const [llmUsage, setLlmUsage] = useState<LLMUsageEstimate | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingMetrics | null>(null);

  useEffect(() => {
    // Load mock data on mount; swap to API fetch when routes exist
    setMetrics(mockMetrics());
    setAgents(mockAgentPerformance());
    setTrends(mockUsageTrends());
    setCost(mockCostEstimate());
    setLlmUsage(mockLLMUsage());
    setOnboarding(mockOnboardingMetrics());
  }, []);

  if (!metrics || !cost) return null;

  return (
    <div className="flex flex-col gap-8 p-6 pb-12 max-w-6xl mx-auto">
      {/* ---- Page Header ---- */}
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Reports &amp; Analytics
        </h1>
        <p className="text-muted-foreground mt-0.5">
          Workspace performance at a glance
        </p>
      </div>

      {/* ---- Summary Cards ---- */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Initiatives */}
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Active Initiatives
            </CardTitle>
            <CardAction>
              <Rocket className="h-4 w-4 text-muted-foreground/50" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {metrics.activeInitiatives}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.completedInitiatives} completed all time
            </p>
          </CardContent>
        </Card>

        {/* Approval Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Approval Rate
            </CardTitle>
            <CardAction>
              <ShieldCheck className="h-4 w-4 text-muted-foreground/50" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {metrics.approvalRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalApprovals} total reviews
            </p>
          </CardContent>
        </Card>

        {/* Agent Success Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Agent Success Rate
            </CardTitle>
            <CardAction>
              <Bot className="h-4 w-4 text-muted-foreground/50" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              {metrics.agentSuccessRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.agentRunCount} runs total
            </p>
          </CardContent>
        </Card>

        {/* Est. Monthly Cost */}
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Est. Monthly Cost
            </CardTitle>
            <CardAction>
              <Coins className="h-4 w-4 text-muted-foreground/50" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">
              ${cost.estimatedCost.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTokens(cost.totalTokens)} tokens
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ---- Usage Trends ---- */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Usage Trends
          </h2>
          <span className="text-xs text-muted-foreground">Last 14 days</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <BarChart data={trends} valueKey="agentRuns" label="Agent Runs" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <BarChart data={trends} valueKey="approvals" label="Approvals" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <BarChart data={trends} valueKey="tokensUsed" label="Tokens Used" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ---- Two-column: Agent Performance + Cost Breakdown ---- */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Agent Performance */}
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Agent Performance
            </h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Agent</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Runs</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Success</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Avg Duration</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {agents.map((a) => (
                      <tr key={a.agentName} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          <Bot className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                          {a.agentName}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{a.runCount}</td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={
                              a.successRate >= 95
                                ? "text-success"
                                : a.successRate >= 85
                                  ? "text-warning"
                                  : "text-destructive"
                            }
                          >
                            {a.successRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatDuration(a.avgDuration)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatTokens(a.totalTokens)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cost Breakdown */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Cost Breakdown
            </h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Estimated Token Costs
              </CardTitle>
              <CardAction>
                <Coins className="h-4 w-4 text-muted-foreground/50" />
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {cost.byAgent.map((a) => {
                  const pct = cost.totalTokens > 0 ? (a.tokens / cost.totalTokens) * 100 : 0;
                  return (
                    <div key={a.name} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/60 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium tabular-nums">${a.cost.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatTokens(a.tokens)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium">Total</p>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">${cost.estimatedCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatTokens(cost.totalTokens)} tokens
                </p>
              </div>
            </div>
          </Card>
        </section>
      </div>

      {/* ---- LLM Usage Card ---- */}
      {llmUsage && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              LLM Usage
            </h2>
            <span className="text-xs text-muted-foreground">This month (estimated)</span>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Token Usage &amp; Cost Estimate
              </CardTitle>
              <CardAction>
                <BrainCircuit className="h-4 w-4 text-muted-foreground/50" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Input Tokens</p>
                  <p className="text-xl font-semibold tabular-nums mt-1">
                    {formatTokens(llmUsage.totalInputTokens)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ${llmUsage.estimatedInputCost.toFixed(2)} at $3/M
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">Output Tokens</p>
                  <p className="text-xl font-semibold tabular-nums mt-1">
                    {formatTokens(llmUsage.totalOutputTokens)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ${llmUsage.estimatedOutputCost.toFixed(2)} at $15/M
                  </p>
                </div>
                <div className="rounded-lg bg-primary/5 p-4 ring-1 ring-primary/10">
                  <p className="text-xs text-muted-foreground">Total Estimated Cost</p>
                  <p className="text-xl font-semibold tabular-nums mt-1 text-primary">
                    ${llmUsage.totalCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatTokens(llmUsage.totalInputTokens + llmUsage.totalOutputTokens)} total tokens
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ---- Onboarding Funnel ---- */}
      {onboarding && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Onboarding Funnel
            </h2>
            <span className="text-xs text-muted-foreground">
              {onboarding.overallCompletionRate}% overall completion
            </span>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Step Completion Rates
              </CardTitle>
              <CardAction>
                <Users className="h-4 w-4 text-muted-foreground/50" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {onboarding.steps.map((step, idx) => (
                  <div key={step.step}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium">{step.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {step.count} users
                        </span>
                        <span className="text-sm font-semibold tabular-nums w-10 text-right">
                          {step.rate}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all"
                        style={{ width: `${step.rate}%` }}
                      />
                    </div>
                    {idx < onboarding.steps.length - 1 && (
                      <div className="flex justify-end mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {Math.round(
                            ((onboarding.steps[idx + 1].count) / Math.max(step.count, 1)) * 100
                          )}% continue
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <p className="text-sm text-muted-foreground">
                  {onboarding.totalStarted} started, {onboarding.totalCompleted} completed
                </p>
                <p className="text-sm font-semibold text-primary tabular-nums">
                  {onboarding.overallCompletionRate}% completion rate
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ---- Quick Stats Footer ---- */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
          <Activity className="h-4 w-4 text-primary/60" />
          <div>
            <p className="text-xs text-muted-foreground">Workflows</p>
            <p className="text-sm font-semibold tabular-nums">{metrics.workflowsCompleted}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
          <TrendingUp className="h-4 w-4 text-primary/60" />
          <div>
            <p className="text-xs text-muted-foreground">Avg Tokens/Run</p>
            <p className="text-sm font-semibold tabular-nums">{formatTokens(metrics.avgTokenUsage)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-primary/60" />
          <div>
            <p className="text-xs text-muted-foreground">Avg Approval Time</p>
            <p className="text-sm font-semibold tabular-nums">{metrics.avgApprovalTime}h</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
          <Rocket className="h-4 w-4 text-primary/60" />
          <div>
            <p className="text-xs text-muted-foreground">Knowledge Objects</p>
            <p className="text-sm font-semibold tabular-nums">{metrics.knowledgeObjectCount}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
