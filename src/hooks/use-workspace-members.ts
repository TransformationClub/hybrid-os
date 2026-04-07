"use client";

import { useMemo } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspaceMembers as useWorkspaceMembersQuery } from "@/hooks/use-workspace";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface MentionableMember {
  id: string;
  username: string;
  fullName: string;
  avatar?: string;
}

// ------------------------------------------------------------
// Mock members (used when Supabase is not configured)
// ------------------------------------------------------------

const MOCK_MEMBERS: MentionableMember[] = [
  { id: "user-001", username: "lsummerfield", fullName: "Luke Summerfield", avatar: undefined },
  { id: "user-002", username: "jchen", fullName: "Jamie Chen", avatar: undefined },
  { id: "user-003", username: "mrodriguez", fullName: "Maria Rodriguez", avatar: undefined },
  { id: "user-004", username: "akim", fullName: "Alex Kim", avatar: undefined },
  { id: "user-005", username: "spratel", fullName: "Sara Pratel", avatar: undefined },
];

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

/**
 * Returns a list of workspace members formatted for @mention autocomplete.
 * Falls back to mock members when Supabase is not configured.
 */
export function useMentionableMembers(): {
  members: MentionableMember[];
  isLoading: boolean;
} {
  // When Supabase is not configured, return mocks immediately
  if (!isSupabaseConfigured) {
    return { members: MOCK_MEMBERS, isLoading: false };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { data, isLoading } = useWorkspaceMembersQuery();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const members = useMemo(() => {
    if (!data) return [];
    return data.map((m) => ({
      id: m.user_id,
      username: m.users.email.split("@")[0],
      fullName: m.users.full_name,
      avatar: m.users.avatar_url,
    }));
  }, [data]);

  return { members, isLoading };
}

/**
 * Extract @mentioned usernames from a comment string.
 */
export function extractMentions(content: string): string[] {
  const matches = content.match(/@(\S+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

/**
 * Resolve usernames to user IDs using the member list.
 */
export function resolveMentionIds(
  usernames: string[],
  members: MentionableMember[]
): string[] {
  return usernames
    .map((u) => members.find((m) => m.username === u)?.id)
    .filter((id): id is string => !!id);
}
