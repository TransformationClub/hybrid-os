import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import type { User, WorkspaceMembership, WorkspaceRole, Workspace } from "@/types";

const MEMBERS_KEY = "workspace-members";
const WORKSPACE_KEY = "workspace";

interface WorkspaceMemberWithUser extends WorkspaceMembership {
  users: User;
}

export function useWorkspaceMembers() {
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useQuery<WorkspaceMemberWithUser[]>({
    queryKey: [MEMBERS_KEY, workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("workspace_memberships")
        .select("*, users(*)")
        .eq("workspace_id", workspaceId!);

      if (error) throw error;
      return data as WorkspaceMemberWithUser[];
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: WorkspaceRole;
    }) => {
      const supabase = createClient();

      // Look up user by email
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (userError) throw new Error(`User with email ${email} not found`);

      const { data, error } = await supabase
        .from("workspace_memberships")
        .insert({
          user_id: user.id,
          workspace_id: workspaceId!,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkspaceMembership;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY, workspaceId] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: WorkspaceRole;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("workspace_memberships")
        .update({ role })
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId!)
        .select()
        .single();

      if (error) throw error;
      return data as WorkspaceMembership;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY, workspaceId] });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  const workspaceId = useAuthStore((s) => s.workspace?.id);
  const setWorkspace = useAuthStore((s) => s.setWorkspace);

  return useMutation({
    mutationFn: async (
      updates: Partial<Pick<Workspace, "name" | "slug" | "logo_url">>
    ) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("workspaces")
        .update(updates)
        .eq("id", workspaceId!)
        .select()
        .single();

      if (error) throw error;
      return data as Workspace;
    },
    onSuccess: (data) => {
      setWorkspace(data);
      queryClient.invalidateQueries({ queryKey: [WORKSPACE_KEY, workspaceId] });
    },
  });
}
