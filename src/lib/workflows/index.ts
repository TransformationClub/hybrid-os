/**
 * Workflow Registry
 *
 * Central registry for all marketing workflow orchestrations.
 * Each workflow has a runner function, display name, and description.
 */

import {
  runAEOCampaign,
  type AEOCampaignInput,
  type AEOCampaignResult,
  type WorkflowEvent,
  type WorkflowEventHandler,
} from "./aeo-campaign";

import {
  runABMCampaign,
  type ABMCampaignInput,
  type ABMCampaignResult,
} from "./abm-campaign";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkflowType = "aeo_campaign" | "abm_campaign";

export type WorkflowInput = AEOCampaignInput | ABMCampaignInput;
export type WorkflowResult = AEOCampaignResult | ABMCampaignResult;

export interface WorkflowDefinition {
  name: string;
  description: string;
  type: WorkflowType;
  runner: (input: never, onEvent?: WorkflowEventHandler) => Promise<WorkflowResult>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const workflows: Record<WorkflowType, WorkflowDefinition> = {
  aeo_campaign: {
    name: "AEO Campaign",
    description:
      "Plan and execute an AI Engine Optimization campaign with content creation, QA, and optional HubSpot integration.",
    type: "aeo_campaign",
    runner: runAEOCampaign as WorkflowDefinition["runner"],
  },
  abm_campaign: {
    name: "ABM Campaign",
    description:
      "Design and execute an Account-Based Marketing campaign with persona mapping, multi-channel content, and timeline.",
    type: "abm_campaign",
    runner: runABMCampaign as WorkflowDefinition["runner"],
  },
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/**
 * Get a workflow definition by type. Returns undefined if not found.
 */
export function getWorkflow(type: string): WorkflowDefinition | undefined {
  return workflows[type as WorkflowType];
}

/**
 * List all registered workflows with their metadata.
 */
export function listWorkflows(): Array<{
  type: WorkflowType;
  name: string;
  description: string;
}> {
  return Object.entries(workflows).map(([type, def]) => ({
    type: type as WorkflowType,
    name: def.name,
    description: def.description,
  }));
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export type {
  AEOCampaignInput,
  AEOCampaignResult,
  ABMCampaignInput,
  ABMCampaignResult,
  WorkflowEvent,
  WorkflowEventHandler,
};

export { runAEOCampaign, runABMCampaign };
