/**
 * Approval Enforcement
 *
 * Middleware/guard that determines whether an action requires user approval
 * before execution. High-risk actions (publishing, sending, budget changes)
 * always require approval; low-risk actions (search, internal generation)
 * can run autonomously.
 */

import type { ApprovalCategory } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApprovalCheckResult {
  required: boolean;
  category: ApprovalCategory;
  reason: string;
}

export interface ActionContext {
  initiativeId?: string;
  contentType?: string;
  description?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Action classification rules
// ---------------------------------------------------------------------------

/**
 * Actions that always require approval before execution.
 * Mapped to their default category and reason.
 */
const APPROVAL_REQUIRED_ACTIONS: Record<
  string,
  { category: ApprovalCategory; reason: string }
> = {
  publishContent: {
    category: "content",
    reason: "Publishing content externally requires human review.",
  },
  sendEmail: {
    category: "communication",
    reason: "Sending emails to external recipients requires approval.",
  },
  createHubSpotDraft: {
    category: "integration",
    reason: "Creating HubSpot drafts that may trigger automation requires approval.",
  },
  updateBudget: {
    category: "execution",
    reason: "Budget-related changes require explicit approval.",
  },
  reallocateBudget: {
    category: "execution",
    reason: "Budget reallocation requires explicit approval.",
  },
  schedulePublication: {
    category: "content",
    reason: "Scheduling content for publication requires review.",
  },
  launchCampaign: {
    category: "execution",
    reason: "Launching a campaign is a high-impact action that requires approval.",
  },
  sendSlackMessage: {
    category: "communication",
    reason: "Sending external messages on behalf of the user requires approval.",
  },
  generateContent: {
    category: "content",
    reason: "Generated content should be reviewed before use.",
  },
  updateSecondBrain: {
    category: "workflow",
    reason: "Knowledge base updates should be reviewed before persisting.",
  },
};

/**
 * Actions that can run autonomously without approval.
 */
const AUTONOMOUS_ACTIONS = new Set([
  "searchKnowledge",
  "createWorkItem",
  "updateWorkItem",
  "requestApproval",
  "generateInternalNotes",
  "analyzeData",
  "summarizeContent",
  "listApprovals",
  "getInitiativeDetails",
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a given action requires approval before execution.
 *
 * @param action  - The action identifier (tool name or action slug)
 * @param context - Optional context about the action being performed
 * @returns An ApprovalCheckResult indicating whether approval is needed
 */
export function requireApproval(
  action: string,
  _context?: ActionContext,
): ApprovalCheckResult {
  // Check if the action is in the always-require list
  const rule = APPROVAL_REQUIRED_ACTIONS[action];
  if (rule) {
    return {
      required: true,
      category: rule.category,
      reason: rule.reason,
    };
  }

  // Check if the action is explicitly autonomous
  if (AUTONOMOUS_ACTIONS.has(action)) {
    return {
      required: false,
      category: "workflow",
      reason: "This action can run autonomously.",
    };
  }

  // Default: unknown actions require approval as a safety measure
  return {
    required: true,
    category: "execution",
    reason: `Unknown action "${action}" requires approval by default.`,
  };
}

/**
 * Convenience helper: returns true if the action can proceed without approval.
 */
export function canRunAutonomously(
  action: string,
  context?: ActionContext,
): boolean {
  return !requireApproval(action, context).required;
}
