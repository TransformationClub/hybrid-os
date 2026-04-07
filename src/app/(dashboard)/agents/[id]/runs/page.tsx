"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Ban,
  AlertTriangle,
  Pause,
  ChevronDown,
  ChevronRight,
  Zap,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAgentRuns, cancelAgentRun } from "@/lib/agents/run-actions";
import { mockAgents, type MockAgent } from "@/lib/mock-data";
import type { AgentRun, AgentRunStatus } from "@/types";

// ---------- Status config ----------

const statusConfig: Record<
  AgentRunStatus,
  { icon: React.ElementType; color: string; label: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  completed: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", label: "Completed", badgeVariant: "default" },
  running: { icon: Loader2, color: "text-blue-600 dark:text-blue-400", label: "Running", badgeVariant: "secondary" },
  failed: { icon: XCircle, color: "text-red-600 dark:text-red-400", label: "Failed", badgeVariant: "destructive" },
  cancelled: { icon: Ban, color: "text-gray-500", label: "Cancelled", badgeVariant: "outline" },
  queued: { icon: Clock, color: "text-amber-600 dark:text-amber-400", label: "Queued", badgeVariant: "outline" },
  planning: { icon: Loader2, color: "text-violet-600 dark:text-violet-400", label: "Planning", badgeVariant: "secondary" },
  waiting_approval: { icon: Pause, color: "text-orange-600 dark:text-orange-400", label: "Awaiting Approval", badgeVariant: "outline" },
  blocked: { icon: AlertTriangle, color: "text-red-500", label: "Blocked", badgeVariant: "destructive" },
};

// ---------- Filter tabs ----------

type FilterTab = "all" | "running" | "completed" | "failed";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

// ---------- Helpers ----------

function formatDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt) return "--";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function formatTimestamp(iso?: string): string {
  if (!iso) return "--";
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatTokens(usage?: { input: number; output: number }): string {
  if (!usage) return "--";
  const total = usage.input + usage.output;
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
  return String(total);
}

const INITIATIVE_NAMES: Record<string, string> = {
  "init-001": "Q2 AEO Content Blitz",
  "init-002": "Enterprise ABM - Acme Corp",
  "init-003": "Product-Led Growth Loop",
};

// ---------- Page ----------

const PAGE_SIZE = 20;

export default function AgentRunsPage() {
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<MockAgent | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  // Find agent from mock data
  useEffect(() => {
    const found = mockAgents.find((a) => a.id === agentId) ?? null;
    setAgent(found);
  }, [agentId]);

  // Fetch runs
  const fetchRuns = useCallback(
    async (offset = 0, append = false) => {
      setLoading(true);
      const statusFilter: AgentRunStatus | undefined =
        filter === "all" ? undefined : (filter as AgentRunStatus);
      const result = await getAgentRuns(agentId, {
        limit: PAGE_SIZE,
        offset,
        status: statusFilter,
      });
      if (result.data) {
        setRuns((prev) => (append ? [...prev, ...result.data.runs] : result.data.runs));
        setTotal(result.data.total);
      }
      setLoading(false);
    },
    [agentId, filter]
  );

  useEffect(() => {
    fetchRuns(0, false);
  }, [fetchRuns]);

  const handleLoadMore = () => {
    fetchRuns(runs.length, true);
  };

  const handleCancel = async (runId: string) => {
    const result = await cancelAgentRun(runId);
    if (result.data) {
      setRuns((prev) => prev.map((r) => (r.id === runId ? result.data : r)));
    }
  };

  const toggleExpand = (runId: string) => {
    setExpandedRun((prev) => (prev === runId ? null : runId));
  };

  // ---------- Agent status badge ----------

  const agentStatusConfig: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: "bg-emerald-500" },
    idle: { label: "Idle", color: "bg-gray-400" },
    running: { label: "Running", color: "bg-blue-500 animate-pulse" },
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b px-6 py-4">
        <Link href="/agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" data-icon="inline-start" />
            Agents
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-6" />
        {agent ? (
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-semibold text-foreground">{agent.name}</h1>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
            </div>
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  agentStatusConfig[agent.status]?.color ?? "bg-gray-400"
                )}
              />
              <span className="text-xs text-muted-foreground">
                {agentStatusConfig[agent.status]?.label ?? agent.status}
              </span>
            </span>
          </div>
        ) : (
          <h1 className="text-lg font-semibold text-foreground">Agent Runs</h1>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs
          value={filter}
          onValueChange={(val) => setFilter((val as FilterTab | null) ?? "all")}
        >
          <TabsList variant="line">
            {FILTER_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {FILTER_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {loading && runs.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading runs...</span>
                </div>
              ) : runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="size-8 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-medium text-muted-foreground">No runs found</p>
                  <p className="text-xs text-muted-foreground/70">
                    {filter === "all"
                      ? "This agent has not been run yet."
                      : `No ${filter} runs to display.`}
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {runs.map((run) => {
                    const cfg = statusConfig[run.status];
                    const StatusIcon = cfg.icon;
                    const isExpanded = expandedRun === run.id;
                    const canCancel =
                      run.status === "queued" ||
                      run.status === "running" ||
                      run.status === "planning" ||
                      run.status === "waiting_approval";

                    return (
                      <Card key={run.id} className="transition-shadow hover:shadow-sm">
                        <CardContent className="p-4">
                          {/* Main row */}
                          <button
                            type="button"
                            className="flex w-full items-center gap-4 text-left"
                            onClick={() => toggleExpand(run.id)}
                          >
                            {/* Expand chevron */}
                            <span className="shrink-0 text-muted-foreground">
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </span>

                            {/* Status */}
                            <span className={cn("flex shrink-0 items-center gap-1.5", cfg.color)}>
                              <StatusIcon
                                className={cn(
                                  "size-4",
                                  (run.status === "running" || run.status === "planning") &&
                                    "animate-spin"
                                )}
                              />
                              <span className="text-xs font-medium">{cfg.label}</span>
                            </span>

                            {/* Initiative */}
                            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                              {run.initiative_id
                                ? INITIATIVE_NAMES[run.initiative_id] ?? run.initiative_id
                                : "No linked initiative"}
                            </span>

                            {/* Duration */}
                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                              <Timer className="size-3" />
                              {formatDuration(run.started_at, run.completed_at)}
                            </span>

                            {/* Tokens */}
                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                              <Zap className="size-3" />
                              {formatTokens(run.token_usage)}
                            </span>

                            {/* Timestamp */}
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatTimestamp(run.started_at ?? run.created_at)}
                            </span>
                          </button>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-4 space-y-4 border-t pt-4">
                              {/* Actions */}
                              {canCancel && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleCancel(run.id)}
                                  >
                                    <Ban className="size-3.5" data-icon="inline-start" />
                                    Cancel Run
                                  </Button>
                                </div>
                              )}

                              {/* Error */}
                              {run.error && (
                                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                  <span className="font-medium">Error: </span>
                                  {run.error}
                                </div>
                              )}

                              {/* Token breakdown */}
                              {run.token_usage && (
                                <div>
                                  <h4 className="mb-1 text-xs font-medium text-muted-foreground uppercase">
                                    Token Usage
                                  </h4>
                                  <div className="flex gap-4 text-sm">
                                    <span>
                                      Input: <strong>{run.token_usage.input.toLocaleString()}</strong>
                                    </span>
                                    <span>
                                      Output: <strong>{run.token_usage.output.toLocaleString()}</strong>
                                    </span>
                                    <span>
                                      Total:{" "}
                                      <strong>
                                        {(run.token_usage.input + run.token_usage.output).toLocaleString()}
                                      </strong>
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Input */}
                              {run.input && (
                                <div>
                                  <h4 className="mb-1 text-xs font-medium text-muted-foreground uppercase">
                                    Input
                                  </h4>
                                  <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                                    {JSON.stringify(run.input, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Output */}
                              {run.output && (
                                <div>
                                  <h4 className="mb-1 text-xs font-medium text-muted-foreground uppercase">
                                    Output
                                  </h4>
                                  <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                                    {JSON.stringify(run.output, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Metadata */}
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                <span>Run ID: {run.id}</span>
                                {run.started_at && (
                                  <span>
                                    Started: {new Date(run.started_at).toLocaleString()}
                                  </span>
                                )}
                                {run.completed_at && (
                                  <span>
                                    Completed: {new Date(run.completed_at).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Load More */}
                  {runs.length < total && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                            Loading...
                          </>
                        ) : (
                          `Load More (${runs.length} of ${total})`
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
