import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { Skill, SkillStep } from "@/types";

const QUERY_KEY = "skills";

export function useSkills() {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<Skill[]>({
    queryKey: [QUERY_KEY, workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Skill[];
    },
  });
}

export function useSkill(id: string | undefined) {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<Skill>({
    queryKey: [QUERY_KEY, workspaceId, id],
    enabled: !!workspaceId && !!id,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("id", id!)
        .eq("workspace_id", workspaceId!)
        .single();

      if (error) throw error;
      return data as Skill;
    },
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async (
      input: Pick<Skill, "name" | "purpose" | "workflow" | "agents" | "tools"> &
        Partial<
          Pick<Skill, "description" | "inputs" | "quality_bar" | "escalation_rules" | "is_active">
        >
    ) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("skills")
        .insert({
          ...input,
          workspace_id: workspaceId!,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Skill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workspaceId] });
    },
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<
      Pick<
        Skill,
        | "name"
        | "purpose"
        | "description"
        | "inputs"
        | "workflow"
        | "agents"
        | "tools"
        | "quality_bar"
        | "escalation_rules"
        | "is_active"
      >
    >) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("skills")
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId!)
        .select()
        .single();

      if (error) throw error;
      return data as Skill;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workspaceId] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, workspaceId, data.id],
      });
    },
  });
}
