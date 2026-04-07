import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { Initiative, InitiativeStatus, InitiativeType } from "@/types";

const QUERY_KEY = "initiatives";

export function useInitiatives() {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<Initiative[]>({
    queryKey: [QUERY_KEY, workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Initiative[];
    },
  });
}

export function useInitiative(id: string | undefined) {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<Initiative>({
    queryKey: [QUERY_KEY, workspaceId, id],
    enabled: !!workspaceId && !!id,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .eq("id", id!)
        .eq("workspace_id", workspaceId!)
        .single();

      if (error) throw error;
      return data as Initiative;
    },
  });
}

export function useCreateInitiative() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async (
      input: Pick<Initiative, "title" | "type" | "status"> &
        Partial<Pick<Initiative, "goal" | "brief" | "success_criteria">>
    ) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("initiatives")
        .insert({
          ...input,
          workspace_id: workspaceId!,
          created_by: userId!,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Initiative;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workspaceId] });
    },
  });
}

export function useUpdateInitiative() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<
      Pick<Initiative, "title" | "type" | "status" | "goal" | "brief" | "success_criteria">
    >) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("initiatives")
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId!)
        .select()
        .single();

      if (error) throw error;
      return data as Initiative;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workspaceId] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, workspaceId, data.id],
      });
    },
  });
}
