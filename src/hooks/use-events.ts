import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { AppEvent, EventType } from "@/types";

const QUERY_KEY = "events";

interface EventFilters {
  type?: EventType;
  entity_type?: string;
  entity_id?: string;
  actor_type?: "user" | "agent" | "system";
  limit?: number;
}

export function useEvents(filters?: EventFilters) {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<AppEvent[]>({
    queryKey: [QUERY_KEY, workspaceId, filters],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("events")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(filters?.limit ?? 100);

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }
      if (filters?.entity_type) {
        query = query.eq("entity_type", filters.entity_type);
      }
      if (filters?.entity_id) {
        query = query.eq("entity_id", filters.entity_id);
      }
      if (filters?.actor_type) {
        query = query.eq("actor_type", filters.actor_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AppEvent[];
    },
  });
}

export function useRecentActivity() {
  return useEvents({ limit: 30 });
}
