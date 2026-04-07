"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  page?: string;
  initiativeId?: string;
  lastSeen: string;
}

interface UsePresenceOptions {
  /** The page or context the user is currently viewing */
  page?: string;
  /** If viewing an initiative, its ID */
  initiativeId?: string;
  /** Whether presence tracking is enabled (default: true) */
  enabled?: boolean;
}

// ------------------------------------------------------------
// Mock presence data (used when Supabase is not configured)
// ------------------------------------------------------------

const MOCK_PRESENCE_USERS: PresenceUser[] = [
  {
    id: "user-002",
    name: "Jamie Chen",
    avatar: undefined,
    page: "initiative",
    initiativeId: "init-001",
    lastSeen: new Date().toISOString(),
  },
  {
    id: "user-004",
    name: "Alex Kim",
    avatar: undefined,
    page: "initiative",
    initiativeId: "init-001",
    lastSeen: new Date(Date.now() - 120000).toISOString(),
  },
];

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

/**
 * Track and display real-time presence of users in the workspace.
 * Uses Supabase Realtime Presence when configured, otherwise returns mock data.
 */
export function usePresence(options: UsePresenceOptions = {}): {
  presenceUsers: PresenceUser[];
  isConnected: boolean;
} {
  const { page, initiativeId, enabled = true } = options;
  const user = useAuthStore((s) => s.user);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Build the current user's presence payload
  const getPresencePayload = useCallback(() => ({
    id: user?.id ?? "anonymous",
    name: user?.full_name ?? "Anonymous",
    avatar: user?.avatar_url,
    page,
    initiativeId,
    lastSeen: new Date().toISOString(),
  }), [user, page, initiativeId]);

  useEffect(() => {
    if (!enabled) return;

    // Mock mode: return fake presence data filtered by initiative
    if (!isSupabaseConfigured) {
      const filtered = initiativeId
        ? MOCK_PRESENCE_USERS.filter((u) => u.initiativeId === initiativeId)
        : MOCK_PRESENCE_USERS;
      setPresenceUsers(filtered);
      setIsConnected(true);
      return;
    }

    const supabase = createClient();
    const channelName = initiativeId
      ? `presence:initiative:${initiativeId}`
      : "presence:workspace";

    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: user?.id ?? "anonymous" },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];

        for (const [, presences] of Object.entries(state)) {
          for (const p of presences as Array<Record<string, unknown>>) {
            const presenceData = p as unknown as PresenceUser & { presence_ref?: string };
            // Don't include the current user
            if (presenceData.id === user?.id) continue;
            users.push({
              id: presenceData.id,
              name: presenceData.name ?? "Unknown",
              avatar: presenceData.avatar as string | undefined,
              page: presenceData.page as string | undefined,
              initiativeId: presenceData.initiativeId as string | undefined,
              lastSeen: presenceData.lastSeen ?? new Date().toISOString(),
            });
          }
        }

        setPresenceUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          await channel.track(getPresencePayload());
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, initiativeId, user?.id, user?.full_name, user?.avatar_url, getPresencePayload]);

  // Update presence payload when page/initiative changes
  useEffect(() => {
    if (!isSupabaseConfigured || !channelRef.current) return;
    channelRef.current.track(getPresencePayload());
  }, [page, initiativeId, getPresencePayload]);

  return { presenceUsers, isConnected };
}
