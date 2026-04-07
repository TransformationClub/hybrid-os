import { inngest } from "./inngest";

/**
 * Trigger async file ingestion processing.
 */
export async function triggerIngestion(
  workspaceId: string,
  fileId: string,
  fileName: string,
  filePath: string,
  fileSize?: number,
  mimeType?: string
) {
  await inngest.send({
    name: "ingestion/file.uploaded",
    data: {
      workspaceId,
      fileId,
      fileName,
      filePath,
      fileSize: fileSize ?? 0,
      mimeType: mimeType ?? "application/octet-stream",
    },
  });
}

/**
 * Trigger an email notification via the background job queue.
 */
export async function triggerEmailNotification(
  userId: string,
  type: string,
  data: {
    to: string | string[];
    subject: string;
    html: string;
    workspaceId?: string;
  }
) {
  await inngest.send({
    name: "notification/email.send",
    data: {
      to: data.to,
      subject: data.subject,
      html: data.html,
      notificationType: type,
      workspaceId: data.workspaceId,
      userId,
    },
  });
}

/**
 * Trigger a HubSpot data sync to Second Brain.
 */
export async function triggerHubSpotSync(workspaceId: string) {
  await inngest.send({
    name: "hubspot/sync.requested",
    data: {
      workspaceId,
    },
  });
}
