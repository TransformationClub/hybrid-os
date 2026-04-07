import { getSlackConnection } from "@/lib/integrations/slack/actions";
import { createSlackClient, buildDeepLink } from "@/lib/integrations/slack/client";
import {
  sendApprovalRequestEmail,
  sendDigestEmail,
  sendErrorAlertEmail,
} from "./email";
import {
  getNotificationPreferences,
  type NotificationPreferences as UserNotificationPreferences,
} from "./preferences";
import type { Approval, Initiative } from "@/types";

// ============================================================
// Notification event types
// ============================================================

export type NotificationEvent =
  | {
      type: "approval_requested";
      approval: Approval;
    }
  | {
      type: "approval_resolved";
      approval: Approval;
    }
  | {
      type: "agent_run_completed";
      agentId: string;
      initiativeId: string;
      summary: string;
    }
  | {
      type: "agent_run_failed";
      agentId: string;
      initiativeId: string;
      error: string;
    }
  | {
      type: "initiative_status_changed";
      initiative: Initiative;
      newStatus: string;
    }
  | {
      type: "weekly_digest";
      summary: {
        period: string;
        initiativesCompleted: number;
        approvalsResolved: number;
        agentRunsTotal: number;
        highlights?: string[];
      };
    }
  | {
      type: "mention";
      mentionedUserId: string;
      mentionerName: string;
      commentText: string;
      entityType: "work_item" | "knowledge_object" | "initiative";
      entityId: string;
      entityTitle?: string;
      initiativeId?: string;
    }
  | {
      type: "comment_on_assigned";
      assigneeUserId: string;
      commenterName: string;
      commentText: string;
      workItemTitle: string;
      workItemId: string;
      initiativeId?: string;
    }
  | {
      type: "assignment";
      assigneeUserId: string;
      assignerName: string;
      workItemTitle: string;
      workItemId: string;
      initiativeName?: string;
      initiativeId?: string;
    }
  | {
      type: "error";
      title: string;
      message: string;
      initiativeId?: string;
      agentId?: string;
    };

// ============================================================
// User notification preferences
// ============================================================

export interface NotificationPreferences {
  email?: string;
  slackChannelId?: string;
  channels: {
    slack: boolean;
    email: boolean;
  };
  events: {
    approvals: boolean;
    agentRuns: boolean;
    weeklyDigest: boolean;
    errors: boolean;
  };
}

/**
 * Default preferences -- send everything to both channels.
 */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: { slack: true, email: true },
  events: {
    approvals: true,
    agentRuns: true,
    weeklyDigest: true,
    errors: true,
  },
};

// ============================================================
// Dispatcher
// ============================================================

/**
 * Map a notification event to the relevant key in the user-level
 * notification preferences. Returns null when there is no matching
 * preference (meaning the event should always be sent).
 */
function getUserEmailPrefKey(
  event: NotificationEvent
): keyof UserNotificationPreferences | null {
  switch (event.type) {
    case "approval_requested":
    case "approval_resolved":
      return "email_approvals";
    case "agent_run_failed":
      return "email_agent_failures";
    case "initiative_status_changed":
      return "email_initiative_updates";
    case "weekly_digest":
      return "email_weekly_digest";
    case "mention":
    case "comment_on_assigned":
    case "assignment":
      // These map to the initiative updates email pref
      return "email_initiative_updates";
    default:
      return null;
  }
}

function getUserInAppPrefKey(
  event: NotificationEvent
): keyof UserNotificationPreferences | null {
  switch (event.type) {
    case "approval_requested":
    case "approval_resolved":
      return "in_app_approvals";
    case "agent_run_completed":
    case "agent_run_failed":
      return "in_app_agent_activity";
    case "mention":
    case "comment_on_assigned":
    case "assignment":
      return "in_app_mentions";
    default:
      return null;
  }
}

/**
 * Route a notification event to the appropriate channels based on
 * user preferences. Fire-and-forget: returns silently on errors.
 */
export async function dispatchNotification(
  workspaceId: string,
  event: NotificationEvent,
  preferences: NotificationPreferences = DEFAULT_PREFERENCES,
  userId?: string
): Promise<void> {
  try {
    // Determine which event category this falls into
    const eventCategory = getEventCategory(event);
    if (!preferences.events[eventCategory]) {
      return; // User has disabled this category
    }

    // Fetch granular user-level notification preferences
    const userPrefs = await getNotificationPreferences(userId);

    const promises: Promise<unknown>[] = [];

    // --- Slack (treated like in-app for preference gating) ---
    if (preferences.channels.slack && preferences.slackChannelId) {
      const inAppKey = getUserInAppPrefKey(event);
      const inAppAllowed = inAppKey === null || userPrefs[inAppKey];
      if (inAppAllowed) {
        promises.push(
          dispatchToSlack(workspaceId, preferences.slackChannelId, event)
        );
      }
    }

    // --- Email ---
    if (preferences.channels.email && preferences.email) {
      const emailKey = getUserEmailPrefKey(event);
      const emailAllowed = emailKey === null || userPrefs[emailKey];
      if (emailAllowed) {
        promises.push(dispatchToEmail(preferences.email, event));
      }
    }

    await Promise.allSettled(promises);
  } catch (err) {
    // Fire-and-forget: log but never throw
    console.error("[dispatcher] dispatchNotification error:", err);
  }
}

// ============================================================
// Helpers
// ============================================================

function getEventCategory(
  event: NotificationEvent
): keyof NotificationPreferences["events"] {
  switch (event.type) {
    case "approval_requested":
    case "approval_resolved":
      return "approvals";
    case "agent_run_completed":
    case "agent_run_failed":
      return "agentRuns";
    case "weekly_digest":
      return "weeklyDigest";
    case "mention":
    case "comment_on_assigned":
    case "assignment":
      // Mentions/comments/assignments always send (fall through to approvals as closest match)
      return "approvals";
    case "initiative_status_changed":
    case "error":
      return "errors";
  }
}

async function dispatchToSlack(
  workspaceId: string,
  channelId: string,
  event: NotificationEvent
): Promise<void> {
  try {
    const { connection } = await getSlackConnection(workspaceId);
    const client = createSlackClient(connection?.access_token ?? "");

    switch (event.type) {
      case "approval_requested":
        await client.sendApprovalPrompt(channelId, event.approval);
        break;

      case "approval_resolved": {
        const approvalLink = buildDeepLink("approvals", event.approval.id);
        await client.sendMessage(
          channelId,
          `Approval *${event.approval.title}* was ${event.approval.status}. <${approvalLink}|View>`
        );
        break;
      }

      case "initiative_status_changed": {
        const initLink = buildDeepLink("initiatives", event.initiative.id);
        await client.sendStatusUpdate(
          channelId,
          event.initiative,
          event.newStatus
        );
        // Follow up with a deep link
        await client.sendMessage(
          channelId,
          `<${initLink}|View initiative in Hybrid OS>`
        );
        break;
      }

      case "agent_run_completed": {
        const runLink = buildDeepLink("initiatives", event.initiativeId);
        await client.sendMessage(
          channelId,
          `Agent \`${event.agentId}\` completed a run for initiative \`${event.initiativeId}\`.\n>${event.summary}\n<${runLink}|View initiative>`
        );
        break;
      }

      case "agent_run_failed": {
        const failLink = buildDeepLink("initiatives", event.initiativeId);
        await client.sendMessage(
          channelId,
          `Agent \`${event.agentId}\` failed for initiative \`${event.initiativeId}\`.\n>Error: ${event.error}\n<${failLink}|View initiative>`
        );
        break;
      }

      case "weekly_digest": {
        const d = event.summary;
        await client.sendMessage(
          channelId,
          `*Weekly Digest (${d.period})*\nInitiatives completed: ${d.initiativesCompleted} | Approvals resolved: ${d.approvalsResolved} | Agent runs: ${d.agentRunsTotal}`
        );
        break;
      }

      case "mention": {
        const mentionLink = buildDeepLink("initiatives", event.initiativeId ?? event.entityId);
        await client.sendMessage(
          channelId,
          `*${event.mentionerName}* mentioned you in a comment:\n>${event.commentText.slice(0, 200)}\n<${mentionLink}|View>`
        );
        break;
      }

      case "comment_on_assigned": {
        const commentLink = buildDeepLink("initiatives", event.initiativeId ?? event.workItemId);
        await client.sendMessage(
          channelId,
          `*${event.commenterName}* commented on *${event.workItemTitle}* (assigned to you):\n>${event.commentText.slice(0, 200)}\n<${commentLink}|View>`
        );
        break;
      }

      case "assignment": {
        const assignLink = buildDeepLink("initiatives", event.initiativeId ?? event.workItemId);
        await client.sendMessage(
          channelId,
          `*${event.assignerName}* assigned you to *${event.workItemTitle}*${event.initiativeName ? ` in ${event.initiativeName}` : ""}.\n<${assignLink}|View>`
        );
        break;
      }

      case "error":
        await client.sendMessage(
          channelId,
          `*[Alert]* ${event.title}\n>${event.message}`
        );
        break;
    }
  } catch (err) {
    console.error("[dispatcher] Slack dispatch error:", err);
  }
}

async function dispatchToEmail(
  email: string,
  event: NotificationEvent
): Promise<void> {
  try {
    switch (event.type) {
      case "approval_requested":
        await sendApprovalRequestEmail(email, event.approval);
        break;

      case "approval_resolved":
        await sendApprovalRequestEmail(email, event.approval);
        break;

      case "weekly_digest":
        await sendDigestEmail(email, event.summary);
        break;

      case "agent_run_failed":
      case "error": {
        const title =
          event.type === "error" ? event.title : `Agent run failed: ${event.agentId}`;
        const message =
          event.type === "error" ? event.message : event.error;
        await sendErrorAlertEmail(email, {
          title,
          message,
          initiativeId:
            event.type === "error" ? event.initiativeId : event.initiativeId,
          agentId: event.type === "error" ? event.agentId : event.agentId,
        });
        break;
      }

      case "agent_run_completed":
        // No email for successful runs -- too noisy
        break;

      case "initiative_status_changed":
        // Status changes are Slack-only by default
        break;

      case "mention":
        // Mention notifications: email with context
        await sendErrorAlertEmail(email, {
          title: `${event.mentionerName} mentioned you`,
          message: event.commentText.slice(0, 300),
          initiativeId: event.initiativeId,
        });
        break;

      case "comment_on_assigned":
        await sendErrorAlertEmail(email, {
          title: `New comment on "${event.workItemTitle}"`,
          message: `${event.commenterName}: ${event.commentText.slice(0, 300)}`,
          initiativeId: event.initiativeId,
        });
        break;

      case "assignment":
        await sendErrorAlertEmail(email, {
          title: `You were assigned to "${event.workItemTitle}"`,
          message: `${event.assignerName} assigned you${event.initiativeName ? ` in ${event.initiativeName}` : ""}.`,
          initiativeId: event.initiativeId,
        });
        break;
    }
  } catch (err) {
    console.error("[dispatcher] Email dispatch error:", err);
  }
}
