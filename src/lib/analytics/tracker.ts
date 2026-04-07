import { logEvent } from "@/lib/events/logger";

// ------------------------------------------------------------
// Product analytics tracking — thin wrappers over the events
// table that attach product-specific metadata to each event.
// These are server-side helpers (not server actions).
// ------------------------------------------------------------

const SYSTEM_ACTOR = "system";

/**
 * Track a generic product event with arbitrary properties.
 */
export async function trackEvent(
  workspaceId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  await logEvent({
    workspaceId,
    type: event,
    actorType: "system",
    actorId: SYSTEM_ACTOR,
    entityType: "analytics",
    entityId: workspaceId,
    metadata: { ...properties, _tracked: true },
  });
}

/**
 * Track when a workspace finishes onboarding.
 */
export async function trackOnboardingComplete(
  workspaceId: string,
  durationMs: number,
): Promise<void> {
  await logEvent({
    workspaceId,
    type: "system.error", // closest generic bucket; metadata disambiguates
    actorType: "system",
    actorId: SYSTEM_ACTOR,
    entityType: "workspace",
    entityId: workspaceId,
    metadata: {
      _event: "onboarding.complete",
      durationMs,
      _tracked: true,
    },
  });
}

/**
 * Track when a new initiative is created.
 */
export async function trackInitiativeCreated(
  workspaceId: string,
  type: string,
): Promise<void> {
  await logEvent({
    workspaceId,
    type: "initiative.created",
    actorType: "system",
    actorId: SYSTEM_ACTOR,
    entityType: "initiative",
    entityId: workspaceId,
    metadata: { initiativeType: type, _tracked: true },
  });
}

/**
 * Track when an approval is resolved (approved / rejected / changes_requested).
 */
export async function trackApprovalResolved(
  workspaceId: string,
  duration: number,
  outcome: string,
): Promise<void> {
  await logEvent({
    workspaceId,
    type: "approval.resolved",
    actorType: "system",
    actorId: SYSTEM_ACTOR,
    entityType: "approval",
    entityId: workspaceId,
    metadata: { durationMs: duration, outcome, _tracked: true },
  });
}

/**
 * Track when an agent run completes.
 */
export async function trackAgentRunCompleted(
  workspaceId: string,
  agentName: string,
  durationMs: number,
  tokenUsage: number,
): Promise<void> {
  await logEvent({
    workspaceId,
    type: "agent.run_completed",
    actorType: "agent",
    actorId: agentName,
    entityType: "agent_run",
    entityId: workspaceId,
    metadata: { agentName, durationMs, tokenUsage, _tracked: true },
  });
}

/**
 * Track when a multi-step workflow completes.
 */
export async function trackWorkflowCompleted(
  workspaceId: string,
  workflowType: string,
  durationMs: number,
): Promise<void> {
  await logEvent({
    workspaceId,
    type: "skill.executed",
    actorType: "system",
    actorId: SYSTEM_ACTOR,
    entityType: "workflow",
    entityId: workspaceId,
    metadata: { workflowType, durationMs, _tracked: true },
  });
}
