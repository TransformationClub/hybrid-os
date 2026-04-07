import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { KnowledgeObject, KnowledgeType } from "@/types";

const QUERY_KEY = "knowledge";
const VERSIONS_KEY = "knowledge-versions";

interface KnowledgeFilters {
  type?: KnowledgeType;
  path?: string;
}

export function useKnowledgeObjects(filters?: KnowledgeFilters) {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<KnowledgeObject[]>({
    queryKey: [QUERY_KEY, workspaceId, filters],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("knowledge_objects")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("updated_at", { ascending: false });

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }
      if (filters?.path) {
        query = query.ilike("path", `${filters.path}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as KnowledgeObject[];
    },
  });
}

export function useKnowledgeObject(id: string | undefined) {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<KnowledgeObject>({
    queryKey: [QUERY_KEY, workspaceId, id],
    enabled: !!workspaceId && !!id,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("knowledge_objects")
        .select("*")
        .eq("id", id!)
        .eq("workspace_id", workspaceId!)
        .single();

      if (error) throw error;
      return data as KnowledgeObject;
    },
  });
}

export function useCreateKnowledge() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async (
      input: Pick<KnowledgeObject, "path" | "title" | "type" | "content" | "source">
    ) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("knowledge_objects")
        .insert({
          ...input,
          workspace_id: workspaceId!,
        })
        .select()
        .single();

      if (error) throw error;
      return data as KnowledgeObject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workspaceId] });
    },
  });
}

export function useUpdateKnowledge() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<
      Pick<KnowledgeObject, "path" | "title" | "type" | "content" | "source">
    >) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("knowledge_objects")
        .update(updates)
        .eq("id", id)
        .eq("workspace_id", workspaceId!)
        .select()
        .single();

      if (error) throw error;
      return data as KnowledgeObject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, workspaceId] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, workspaceId, data.id],
      });
      queryClient.invalidateQueries({
        queryKey: [VERSIONS_KEY, workspaceId, data.id],
      });
    },
  });
}

interface KnowledgeVersion {
  id: string;
  knowledge_object_id: string;
  content: string;
  changed_by: string;
  created_at: string;
}

export function useKnowledgeVersions(id: string | undefined) {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<KnowledgeVersion[]>({
    queryKey: [VERSIONS_KEY, workspaceId, id],
    enabled: !!workspaceId && !!id,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("knowledge_versions")
        .select("*")
        .eq("knowledge_object_id", id!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as KnowledgeVersion[];
    },
  });
}
