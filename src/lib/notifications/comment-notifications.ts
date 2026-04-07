"use server";

import { dispatchNotification } from "./dispatcher";
import type { CommentMentionMetadata } from "@/components/collaboration/comment-thread";

// ------------------------------------------------------------
// Comment notification helpers
// ------------------------------------------------------------

interface CommentNotificationParams {
  workspaceId: string;
  commenterName: string;
  commenterId: string;
  commentText: string;
  entityType: "work_item" | "knowledge_object" | "initiative";
  entityId: string;
  entityTitle?: string;
  initiativeId?: string;
  /** If the entity is a work item, who is it assigned to? */
  assigneeUserId?: string;
  /** Mention metadata extracted from the comment */
  mentions?: CommentMentionMetadata;
}

/**
 * Dispatch notifications for a new comment:
 * 1. Notify each @mentioned user
 * 2. Notify the assignee (if the comment is on an assigned work item and they were not the commenter)
 */
export async function dispatchCommentNotifications(
  params: CommentNotificationParams
): Promise<void> {
  const {
    workspaceId,
    commenterName,
    commenterId,
    commentText,
    entityType,
    entityId,
    entityTitle,
    initiativeId,
    assigneeUserId,
    mentions,
  } = params;

  const notifiedUserIds = new Set<string>();

  // 1. Notify mentioned users
  if (mentions && mentions.mentionedUserIds.length > 0) {
    for (const userId of mentions.mentionedUserIds) {
      // Don't notify the commenter about their own mention
      if (userId === commenterId) continue;
      notifiedUserIds.add(userId);

      await dispatchNotification(workspaceId, {
        type: "mention",
        mentionedUserId: userId,
        mentionerName: commenterName,
        commentText,
        entityType,
        entityId,
        entityTitle,
        initiativeId,
      });
    }
  }

  // 2. Notify assignee if they're not the commenter and not already notified via mention
  if (
    assigneeUserId &&
    assigneeUserId !== commenterId &&
    !notifiedUserIds.has(assigneeUserId)
  ) {
    await dispatchNotification(workspaceId, {
      type: "comment_on_assigned",
      assigneeUserId,
      commenterName,
      commentText,
      workItemTitle: entityTitle ?? "Work item",
      workItemId: entityId,
      initiativeId,
    });
  }
}
