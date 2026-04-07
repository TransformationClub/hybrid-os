import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { WorkItem, WorkItemStatus, WorkItemType } from "@/types";

const QUERY_KEY = "work-items";

export function useWorkItems(initiativeId: string | undefined) {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<WorkItem[]>({
    queryKey: [QUERY_KEY, workspaceId, initiativeId],
    enabled: !!workspaceId && !!initiativeId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("work_items")
        .select("*")
        .eq("initiative_id", initiativeId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WorkItem[];
    },
  });
}

export function useCreateWorkItem() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async (
      input: Pick<WorkItem, "initiative_id" | "title" | "type" | "status"> &
        Partial<
          Pick<WorkItem, "description" | "assigned_to" | "assigned_agent" | "due_date">
        >
    ) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("work_items")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as WorkItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, workspaceId, data.initiative_id],
      });
    },
  });
}

export function useUpdateWorkItem() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<
      Pick<
        WorkItem,
        "title" | "description" | "type" | "status" | "assigned_to" | "assigned_agent" | "due_date"
      >
    >) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("work_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as WorkItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, workspaceId, data.initiative_id],
      });
    },
  });
}
