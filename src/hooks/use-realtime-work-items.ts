"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { getWorkItems } from "@/lib/initiatives/actions";
import type { WorkItem } from "@/types";

/**
 * Hook that returns a live-updating array of work items for an initiative.
 *
 * On mount it fetches the current list via server action, then subscribes to
 * Supabase Realtime so inserts, updates, and deletes are reflected immediately.
 */
export function useRealtimeWorkItems(initiativeId: string | undefined) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch via server action
  useEffect(() => {
    if (!initiativeId) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getWorkItems(initiativeId).then((result) => {
      if (cancelled) return;
      setIsLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setItems(result.data ?? []);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [initiativeId]);

  // Realtime callbacks
  const handleInsert = useCallback((record: WorkItem) => {
    setItems((prev) => {
      // Avoid duplicates (e.g. if the insert was our own optimistic add)
      if (prev.some((item) => item.id === record.id)) return prev;
      return [record, ...prev];
    });
  }, []);

  const handleUpdate = useCallback((record: WorkItem) => {
    setItems((prev) =>
      prev.map((item) => (item.id === record.id ? record : item))
    );
  }, []);

  const handleDelete = useCallback((record: WorkItem) => {
    setItems((prev) => prev.filter((item) => item.id !== record.id));
  }, []);

  useRealtimeSubscription<WorkItem>({
    table: "work_items",
    filter: initiativeId
      ? { column: "initiative_id", value: initiativeId }
      : undefined,
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    enabled: !!initiativeId,
  });

  return { items, setItems, isLoading, error };
}
