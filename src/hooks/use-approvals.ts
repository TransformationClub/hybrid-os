import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { Approval, ApprovalStatus, ApprovalCategory } from "@/types";

const QUERY_KEY = "approvals";

interface ApprovalFilters {
  status?: ApprovalStatus;
  initiative_id?: string;
  category?: ApprovalCategory;
}

export function useApprovals(filters?: ApprovalFilters) {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<Approval[]>({
    queryKey: [QUERY_KEY, workspaceId, filters],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("approvals")
        .select("*, initiatives!inner(workspace_id)")
        .eq("initiatives.workspace_id", workspaceId!)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.initiative_id) {
        query = query.eq("initiative_id", filters.initiative_id);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Approval[];
    },
  });
}

export function usePendingApprovals() {
  return useApprovals({ status: "pending" });
}

export function useResolveApproval() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "approved" | "rejected" | "changes_requested";
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("approvals")
        .update({
          status,
          reviewed_by: userId!,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Approval;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workspaceId] });
    },
  });
}
