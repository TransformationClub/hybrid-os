import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { Agent, AgentRun } from "@/types";

const AGENTS_KEY = "agents";
const AGENT_RUNS_KEY = "agent-runs";

export function useAgents() {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<Agent[]>({
    queryKey: [AGENTS_KEY, workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Agent[];
    },
  });
}

export function useAgent(id: string | undefined) {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<Agent>({
    queryKey: [AGENTS_KEY, workspaceId, id],
    enabled: !!workspaceId && !!id,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", id!)
        .eq("workspace_id", workspaceId!)
        .single();

      if (error) throw error;
      return data as Agent;
    },
  });
}

export function useAgentRuns(agentId?: string) {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<AgentRun[]>({
    queryKey: [AGENT_RUNS_KEY, workspaceId, agentId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("agent_runs")
        .select("*, agents!inner(workspace_id)")
        .eq("agents.workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AgentRun[];
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async (
      input: Pick<Agent, "name" | "role" | "risk_level" | "can_execute" | "requires_approval" | "tools"> &
        Partial<Pick<Agent, "description" | "tone" | "avatar_url" | "is_active">>
    ) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("agents")
        .insert({
          ...input,
          workspace_id: workspaceId!,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AGENTS_KEY, workspaceId] });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<
      Pick<
        Agent,
        | "name"
        | "role"
        | "description"
        | "tone"
        | "risk_level"
        | "can_execute"
        | "requires_approval"
        | "tools"
        | "avatar_url"
        | "is_active"
      >
    >) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("agents")
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId!)
        .select()
        .single();

      if (error) throw error;
      return data as Agent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [AGENTS_KEY, workspaceId] });
      queryClient.invalidateQueries({
        queryKey: [AGENTS_KEY, workspaceId, data.id],
      });
    },
  });
}
