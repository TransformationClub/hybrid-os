/**
 * Utility functions for optimistic UI updates.
 *
 * These operate on plain arrays and are framework-agnostic so they can be
 * used with any state management approach (useState, Zustand, etc.).
 */

/**
 * Generate a temporary ID prefixed with `temp_` so it's easy to distinguish
 * optimistic records from server-persisted ones.
 */
export function createOptimisticId(): string {
  return `temp_${crypto.randomUUID()}`;
}

/**
 * Add a new item to the list. The item should already contain a temp ID
 * (via `createOptimisticId`) before being passed in.
 */
export function optimisticInsert<T>(list: T[], newItem: T): T[] {
  return [newItem, ...list];
}

/**
 * Update an existing item in the list by its `id` field.
 */
export function optimisticUpdate<T extends { id: string }>(
  list: T[],
  id: string,
  updates: Partial<T>
): T[] {
  return list.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
}

/**
 * Remove an item from the list by its `id` field.
 */
export function optimisticRemove<T extends { id: string }>(
  list: T[],
  id: string
): T[] {
  return list.filter((item) => item.id !== id);
}

/**
 * Restore a previous snapshot of the list (rollback after a failed mutation).
 */
export function rollback<T>(_list: T[], snapshot: T[]): T[] {
  return snapshot;
}
