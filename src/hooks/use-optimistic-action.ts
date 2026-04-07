"use client";

import { useCallback, useRef, useState } from "react";

export interface UseOptimisticActionOptions<TState, TAction> {
  /** The initial (or current) state to operate on. */
  initialState: TState;
  /** The server action to call. Must return `{ data?, error? }`. */
  action: (args: TAction) => Promise<{ data?: unknown; error?: string }>;
  /** Pure function that returns the next optimistic state. */
  optimisticUpdate: (state: TState, args: TAction) => TState;
  /** Called when the server action returns an error (after rollback). */
  onError?: (error: string) => void;
}

export interface UseOptimisticActionReturn<TState, TAction> {
  state: TState;
  execute: (args: TAction) => Promise<void>;
  isPending: boolean;
  setState: (state: TState) => void;
}

/**
 * Wraps a server action with optimistic UI:
 *
 * 1. Immediately applies `optimisticUpdate` to the local state.
 * 2. Calls the server action in the background.
 * 3. If the action fails, rolls back to the pre-mutation snapshot and
 *    invokes `onError`.
 */
export function useOptimisticAction<TState, TAction>(
  options: UseOptimisticActionOptions<TState, TAction>
): UseOptimisticActionReturn<TState, TAction> {
  const { initialState, action, optimisticUpdate, onError } = options;

  const [state, setState] = useState<TState>(initialState);
  const [isPending, setIsPending] = useState(false);

  // Keep latest callbacks in a ref to avoid stale closures
  const optionsRef = useRef({ action, optimisticUpdate, onError });
  optionsRef.current = { action, optimisticUpdate, onError };

  const execute = useCallback(async (args: TAction) => {
    // Snapshot current state for potential rollback
    setState((prev) => {
      // We store the snapshot via closure in the async flow below,
      // but we also need the optimistic next state set synchronously.
      return prev;
    });

    // We need to capture snapshot and apply update in one synchronous step
    let snapshot: TState;
    setState((prev) => {
      snapshot = prev;
      return optionsRef.current.optimisticUpdate(prev, args);
    });

    setIsPending(true);

    try {
      const result = await optionsRef.current.action(args);

      if (result.error) {
        // Rollback
        setState(snapshot!);
        optionsRef.current.onError?.(result.error);
      }
    } catch (err) {
      // Rollback on unexpected error
      setState(snapshot!);
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      optionsRef.current.onError?.(message);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { state, execute, isPending, setState };
}
