"use server";

import { getRecentEvents } from "./logger";
import type { AppEvent } from "@/types";

/**
 * Server action wrapper around getRecentEvents so it can be
 * called from client components without importing server-only modules.
 */
export async function fetchRecentEvents(
  workspaceId: string,
  limit = 30,
  entityType?: string,
  entityId?: string,
): Promise<AppEvent[]> {
  return getRecentEvents(workspaceId, limit, entityType, entityId);
}

/**
 * Fetch recent events filtered by initiative ID.
 * Safe to call from client components.
 */
export async function fetchInitiativeActivity(
  workspaceId: string,
  initiativeId: string,
  limit = 20,
): Promise<AppEvent[]> {
  return getRecentEvents(workspaceId, limit, undefined, undefined, initiativeId);
}
