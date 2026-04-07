"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentEditor, type AgentFormData } from "@/components/agents/agent-editor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Plus,
  Cpu,
  Target,
  PenTool,
  FlaskConical,
  ShieldCheck,
  Gauge,
  Play,
  Settings,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Power,
  Zap,
} from "lucide-react";
import { CardGridSkeleton } from "@/components/skeletons/page-skeletons";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/auth/permission-gate";

// ---------- Server actions ----------

import { getAgents, createAgent, updateAgent } from "@/lib/agents/actions";
import { getAgentRuns } from "@/lib/agents/run-actions";

// ---------- Mock data (fallback) ----------

import {
  type MockAgent,
  mockAgents,
  type MockRun,
  mockRecentRuns,
} from "@/lib/mock-data";

import type { Agent, AgentRun } from "@/types";

// ---------- Icon map ----------

const agentIconMap: Record<string, React.ElementType> = {
  Cpu,
  Target,
  PenTool,
  FlaskConical,
  ShieldCheck,
  Gauge,
};

// Map server-action roles to icon names
const roleIconMap: Record<string, string> = {
  orchestrator: "Cpu",
  strategist: "Target",
  writer: "PenTool",
  researcher: "FlaskConical",
  reviewer: "ShieldCheck",
  optimizer: "Gauge",
};

// Map server-action roles to card colors
const roleColorMap: Record<string, string> = {
  orchestrator: "bg-primary text-primary-foreground",
  strategist: "bg-indigo-600 text-white",
  writer: "bg-rose-600 text-white",
  researcher: "bg-amber-600 text-white",
  reviewer: "bg-emerald-600 text-white",
  optimizer: "bg-cyan-600 text-white",
};

// Map server-action roles to dot colors for runs table
const roleDotColorMap: Record<string, string> = {
  orchestrator: "bg-primary",
  strategist: "bg-indigo-600",
  writer: "bg-rose-600",
  researcher: "bg-amber-600",
  reviewer: "bg-emerald-600",
  optimizer: "bg-cyan-600",
};

// ---------- Transform helpers ----------

interface DisplayAgent extends MockAgent {
  _serverId?: string; // original server id for update calls
}

function transformAgent(agent: Agent): DisplayAgent {
  const iconName = roleIconMap[agent.role] ?? "Cpu";
  const color = roleColorMap[agent.role] ?? "bg-primary text-primary-foreground";
  return {
    id: agent.id,
    _serverId: agent.id,
    name: agent.name,
    role: agent.role,
    description: agent.description ?? "",
    iconName,
    color,
    status: agent.is_active ? "active" : "idle",
    riskLevel: agent.risk_level,
    canExecute: agent.can_execute,
    requiresApproval: agent.requires_approval,
    tools: agent.tools,
  };
}

function formatDuration(startedAt?: string, completedAt?: string): string {
  if (!startedAt) return "-";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function transformRun(run: AgentRun, agentMap: Map<string, Agent>): MockRun | null {
  // Only show completed/running/failed in the table (matches the runStatusConfig keys)
  const status = run.status as MockRun["status"];
  if (status !== "completed" && status !== "running" && status !== "failed") return null;

  const agent = agentMap.get(run.agent_id);
  const agentName = agent?.name ?? "Unknown Agent";
  const agentRole = agent?.role ?? "unknown";
  const agentColor = roleDotColorMap[agentRole] ?? "bg-gray-400";
  const initiative =
    (run.input as Record<string, unknown> | undefined)?.initiative as string | undefined;

  return {
    id: run.id,
    agentName,
    agentColor,
    initiative: initiative ?? "N/A",
    status,
    duration: formatDuration(run.started_at, run.completed_at),
    startedAt: run.started_at ? formatTimeAgo(run.started_at) : "-",
  };
}

// ---------- Helpers ----------

const statusConfig = {
  active: { label: "Active", color: "bg-emerald-500", textColor: "text-emerald-600 dark:text-emerald-400" },
  idle: { label: "Idle", color: "bg-gray-400", textColor: "text-muted-foreground" },
  running: { label: "Running", color: "bg-blue-500 animate-pulse", textColor: "text-blue-600 dark:text-blue-400" },
};

const riskConfig = {
  low: { label: "Low Risk", variant: "secondary" as const },
  medium: { label: "Medium Risk", variant: "outline" as const },
  high: { label: "High Risk", variant: "destructive" as const },
};

const runStatusConfig = {
  completed: { icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", label: "Completed" },
  running: { icon: Loader2, color: "text-blue-600 dark:text-blue-400", label: "Running" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
};

// ---------- Page ----------

export default function AgentsPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<DisplayAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentList, setAgentList] = useState<DisplayAgent[]>([]);
  const [recentRuns, setRecentRuns] = useState<MockRun[]>([]);
  const [serverAgents, setServerAgents] = useState<Agent[]>([]);
  const [togglingAgent, setTogglingAgent] = useState<string | null>(null);
  const [monthlyTokens, setMonthlyTokens] = useState<Record<string, number>>({});

  // Fetch agents and runs from server actions
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const agentsResult = await getAgents("default");
      const fetchedAgents: Agent[] = agentsResult.data && agentsResult.data.length > 0
        ? agentsResult.data
        : [];

      if (fetchedAgents.length > 0) {
        setServerAgents(fetchedAgents);
        setAgentList(fetchedAgents.map(transformAgent));

        // Build a lookup map for runs
        const agentMap = new Map(fetchedAgents.map((a) => [a.id, a]));

        // Fetch recent runs - use the first agent id just to get any runs
        // The run-actions getAgentRuns takes a single agentId, so we fetch for all agents
        const runPromises = fetchedAgents.slice(0, 6).map((a) =>
          getAgentRuns(a.id, { limit: 5 })
        );
        const runResults = await Promise.all(runPromises);
        const allRuns: AgentRun[] = [];
        for (const result of runResults) {
          if (result.data) {
            allRuns.push(...result.data.runs);
          }
        }

        // Sort by created_at descending and take top runs
        allRuns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const displayRuns = allRuns
          .slice(0, 10)
          .map((r) => transformRun(r, agentMap))
          .filter((r): r is MockRun => r !== null)
          .slice(0, 4);

        setRecentRuns(displayRuns.length > 0 ? displayRuns : mockRecentRuns);

        // Calculate monthly token usage per agent
        const tokensByAgent: Record<string, number> = {};
        for (const run of allRuns) {
          if (run.token_usage) {
            const total = (run.token_usage.input ?? 0) + (run.token_usage.output ?? 0);
            tokensByAgent[run.agent_id] = (tokensByAgent[run.agent_id] ?? 0) + total;
          }
        }
        setMonthlyTokens(tokensByAgent);
      } else {
        // Fallback to mock data
        setAgentList(mockAgents);
        setRecentRuns(mockRecentRuns);
      }
    } catch {
      // Fallback to mock data on error
      setAgentList(mockAgents);
      setRecentRuns(mockRecentRuns);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Agents with resolved icons
  const agents = agentList.map((a) => ({
    ...a,
    icon: agentIconMap[a.iconName] ?? Cpu,
  }));

  const handleCreate = useCallback(() => {
    setEditingAgent(null);
    setEditorOpen(true);
  }, []);

  const handleConfigure = useCallback((agent: DisplayAgent & { icon: React.ElementType }) => {
    setEditingAgent(agent);
    setEditorOpen(true);
  }, []);

  const handleSave = useCallback(async (data: AgentFormData) => {
    setSaving(true);
    try {
      if (editingAgent?._serverId) {
        // Update existing agent
        await updateAgent({
          agentId: editingAgent._serverId,
          name: data.name,
          role: data.role,
          description: data.description || undefined,
          tone: data.tone || undefined,
          riskLevel: data.riskLevel,
          canExecute: data.canExecute,
          requiresApproval: data.requiresApproval,
          tools: data.tools,
          systemPrompt: data.systemPrompt || undefined,
          isActive: data.isActive,
        });
      } else {
        // Create new agent
        await createAgent({
          workspaceId: "default",
          name: data.name,
          role: data.role,
          description: data.description || undefined,
          tone: data.tone || undefined,
          riskLevel: data.riskLevel,
          canExecute: data.canExecute,
          requiresApproval: data.requiresApproval,
          tools: data.tools,
          systemPrompt: data.systemPrompt || undefined,
        });
      }
      setEditorOpen(false);
      // Refetch the list
      await fetchData();
    } catch (err) {
      console.error("Failed to save agent:", err);
    } finally {
      setSaving(false);
    }
  }, [editingAgent, fetchData]);

  const handleToggleActive = useCallback(async (agent: DisplayAgent) => {
    if (!agent._serverId) return;
    const newActive = agent.status === "idle";
    setTogglingAgent(agent.id);
    try {
      await updateAgent({
        agentId: agent._serverId,
        isActive: newActive,
      });
      // Optimistically update local state
      setAgentList((prev) =>
        prev.map((a) =>
          a.id === agent.id
            ? { ...a, status: newActive ? "active" : "idle" }
            : a
        )
      );
    } catch (err) {
      console.error("Failed to toggle agent:", err);
    } finally {
      setTogglingAgent(null);
    }
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Agents</h1>
        <PermissionGate requires="manage_agents">
          <Button onClick={handleCreate}>
            <Plus className="size-4" data-icon="inline-start" />
            Create Agent
          </Button>
        </PermissionGate>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <CardGridSkeleton />
        ) : (
          <>
            {/* Agent grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => {
                const Icon = agent.icon;
                const status = statusConfig[agent.status];
                const risk = riskConfig[agent.riskLevel];

                const isInactive = agent.status === "idle";
                const agentTokens = monthlyTokens[agent._serverId ?? agent.id] ?? 0;

                return (
                  <Card key={agent.id} className={cn("transition-shadow hover:shadow-md", isInactive && "opacity-60")}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-lg",
                            isInactive ? "bg-muted text-muted-foreground" : agent.color
                          )}
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {agent.name}
                            <span className="flex items-center gap-1.5 text-xs font-normal">
                              <span className={cn("size-2 rounded-full", status.color)} />
                              <span className={status.textColor}>{status.label}</span>
                            </span>
                          </CardTitle>
                          <CardDescription>{agent.role}</CardDescription>
                        </div>
                        <PermissionGate requires="manage_agents">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className={cn(
                              "shrink-0",
                              isInactive
                                ? "text-muted-foreground hover:text-emerald-600"
                                : "text-emerald-600 hover:text-muted-foreground"
                            )}
                            disabled={togglingAgent === agent.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(agent);
                            }}
                            title={isInactive ? "Enable agent" : "Disable agent"}
                          >
                            {togglingAgent === agent.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Power className="size-4" />
                            )}
                          </Button>
                        </PermissionGate>
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-3">
                      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {agent.description}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge variant={risk.variant}>{risk.label}</Badge>
                      </div>

                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Play className="size-3" />
                          <span>
                            {agent.canExecute ? "Can execute autonomously" : "Cannot execute"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="size-3" />
                          <span>
                            {agent.requiresApproval
                              ? "Requires human approval"
                              : "No approval needed"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {agent.tools.slice(0, 3).map((tool) => (
                            <span
                              key={tool}
                              className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                            >
                              {tool}
                            </span>
                          ))}
                          {agent.tools.length > 3 && (
                            <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              +{agent.tools.length - 3}
                            </span>
                          )}
                        </div>
                        {agentTokens > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground" title="Tokens used this month">
                            <Zap className="size-3" />
                            {agentTokens >= 1000
                              ? `${(agentTokens / 1000).toFixed(1)}k`
                              : agentTokens}
                          </span>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="gap-2">
                      <PermissionGate requires="manage_agents" fallback={
                        <Button variant="outline" size="sm" className="flex-1" disabled>
                          <Settings className="size-3.5" data-icon="inline-start" />
                          Configure
                        </Button>
                      }>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleConfigure(agent)}>
                          <Settings className="size-3.5" data-icon="inline-start" />
                          Configure
                        </Button>
                      </PermissionGate>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        render={<Link href={`/agents/${agent.id}/runs`} />}
                      >
                        <Clock className="size-3.5" data-icon="inline-start" />
                        View Runs
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            {/* Active runs section */}
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Recent Runs</h2>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        Agent
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        Initiative
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        Duration
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        Started
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.map((run) => {
                      const runStatus = runStatusConfig[run.status];
                      const StatusIcon = runStatus.icon;
                      return (
                        <tr key={run.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "size-2 rounded-full",
                                  run.agentColor
                                )}
                              />
                              <span className="font-medium">{run.agentName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {run.initiative}
                          </td>
                          <td className="px-4 py-3">
                            <div className={cn("flex items-center gap-1.5", runStatus.color)}>
                              <StatusIcon
                                className={cn(
                                  "size-3.5",
                                  run.status === "running" && "animate-spin"
                                )}
                              />
                              <span className="text-xs font-medium">{runStatus.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{run.duration}</td>
                          <td className="px-4 py-3 text-muted-foreground">{run.startedAt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AgentEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
        agent={
          editingAgent
            ? {
                id: editingAgent.id,
                name: editingAgent.name,
                role: editingAgent.role,
                description: editingAgent.description,
                tone: null,
                risk_level: editingAgent.riskLevel,
                can_execute: editingAgent.canExecute,
                requires_approval: editingAgent.requiresApproval,
                tools: editingAgent.tools,
                system_prompt: null,
                is_active: editingAgent.status !== "idle",
              }
            : undefined
        }
      />
    </div>
  );
}
