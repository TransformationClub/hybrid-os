"use client";

import { useEffect, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface UseRealtimeSubscriptionOptions<T> {
  table: string;
  schema?: string;
  filter?: { column: string; value: string };
  onInsert?: (record: T) => void;
  onUpdate?: (record: T) => void;
  onDelete?: (record: T) => void;
  enabled?: boolean;
}

/**
 * Generic hook for subscribing to Supabase Realtime changes on a table.
 * No-ops gracefully when Supabase is not configured (mock-data mode).
 */
export function useRealtimeSubscription<T>(
  options: UseRealtimeSubscriptionOptions<T>
): void {
  const {
    table,
    schema = "public",
    filter,
    onInsert,
    onUpdate,
    onDelete,
    enabled = true,
  } = options;

  // Keep callbacks in refs so we don't re-subscribe on every render
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete });
  callbacksRef.current = { onInsert, onUpdate, onDelete };

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;

    const supabase = createClient();

    const channelName = filter
      ? `realtime:${table}:${filter.column}=eq.${filter.value}`
      : `realtime:${table}`;

    const filterStr = filter
      ? `${filter.column}=eq.${filter.value}`
      : undefined;

    let channel: RealtimeChannel;

    // Build the channel with postgres_changes listeners
    const channelBuilder = supabase.channel(channelName);

    // Subscribe to INSERT
    channelBuilder.on(
      "postgres_changes" as never,
      {
        event: "INSERT",
        schema,
        table,
        ...(filterStr ? { filter: filterStr } : {}),
      } as never,
      (payload: { new: T }) => {
        callbacksRef.current.onInsert?.(payload.new);
      }
    );

    // Subscribe to UPDATE
    channelBuilder.on(
      "postgres_changes" as never,
      {
        event: "UPDATE",
        schema,
        table,
        ...(filterStr ? { filter: filterStr } : {}),
      } as never,
      (payload: { new: T }) => {
        callbacksRef.current.onUpdate?.(payload.new);
      }
    );

    // Subscribe to DELETE
    channelBuilder.on(
      "postgres_changes" as never,
      {
        event: "DELETE",
        schema,
        table,
        ...(filterStr ? { filter: filterStr } : {}),
      } as never,
      (payload: { old: T }) => {
        callbacksRef.current.onDelete?.(payload.old);
      }
    );

    channel = channelBuilder.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, filter?.column, filter?.value, enabled]);
}
