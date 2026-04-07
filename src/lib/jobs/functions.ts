import { inngest } from "./inngest";
import { logEvent } from "@/lib/events/logger";

// ============================================================
// 1. Process Ingestion
// ============================================================

export const processIngestion = inngest.createFunction(
  {
    id: "process-ingestion",
    retries: 3,
    triggers: [{ event: "ingestion/file.uploaded" }],
  },
  async ({ event, step }) => {
    const { workspaceId, fileId, fileName, filePath, fileSize, mimeType } =
      event.data;

    // Step 1: Download and parse the file content
    const parsed = await step.run("parse-file", async () => {
      const { isSupabaseConfigured, createClient } = await import(
        "@/lib/supabase/server"
      );

      let content = "";
      let title = fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      const metadata: Record<string, unknown> = {
        filename: fileName,
        fileSize,
        mimeType,
      };

      if (isSupabaseConfigured) {
        const supabase = await createClient();
        const { data, error } = await supabase.storage
          .from("uploads")
          .download(filePath);

        if (error) {
          throw new Error(`Failed to download file: ${error.message}`);
        }

        content = await data.text();
      } else {
        // Mock mode: generate placeholder content
        content = `[Mock content for ${fileName}]`;
      }

      // Detect knowledge type from content
      const { detectKnowledgeType, extractTitle } = await import(
        "@/lib/ingestion/parser"
      );
      const type = detectKnowledgeType(content, fileName);
      title = extractTitle(content, fileName);

      return { content, title, type, metadata };
    });

    // Step 2: Create the knowledge object
    const knowledgeObjectId = await step.run(
      "create-knowledge-object",
      async () => {
        const { isSupabaseConfigured, createClient } = await import(
          "@/lib/supabase/server"
        );

        if (!isSupabaseConfigured) {
          console.log(
            `[jobs:process-ingestion] Mock: would create knowledge object for "${parsed.title}"`
          );
          return `mock-ko-${Date.now()}`;
        }

        const supabase = await createClient();
        const { data, error } = await supabase
          .from("knowledge_objects")
          .insert({
            workspace_id: workspaceId,
            title: parsed.title,
            type: parsed.type,
            content: parsed.content,
            path: filePath,
            source: "user",
            metadata: {
              ...parsed.metadata,
              processing_status: "embedding",
            },
          })
          .select("id")
          .single();

        if (error) {
          throw new Error(
            `Failed to create knowledge object: ${error.message}`
          );
        }

        return data.id as string;
      }
    );

    // Step 3: Generate and store embedding
    await step.run("generate-embedding", async () => {
      const { updateKnowledgeEmbedding } = await import(
        "@/lib/embeddings/service"
      );
      await updateKnowledgeEmbedding(knowledgeObjectId, parsed.content);

      // Mark processing as complete
      const { isSupabaseConfigured, createClient } = await import(
        "@/lib/supabase/server"
      );
      if (isSupabaseConfigured) {
        const supabase = await createClient();
        await supabase
          .from("knowledge_objects")
          .update({
            metadata: {
              ...parsed.metadata,
              processing_status: "complete",
            },
          })
          .eq("id", knowledgeObjectId);
      }
    });

    // Step 4: Log the event
    await step.run("log-event", async () => {
      await logEvent({
        workspaceId,
        type: "ingestion.completed",
        actorType: "system",
        actorId: "inngest",
        entityType: "knowledge_object",
        entityId: knowledgeObjectId,
        metadata: {
          fileName,
          fileId,
          knowledgeType: parsed.type,
        },
      });
    });

    return {
      knowledgeObjectId,
      title: parsed.title,
      type: parsed.type,
      status: "complete",
    };
  }
);

// ============================================================
// 2. Send Email Notification
// ============================================================

export const sendEmailNotification = inngest.createFunction(
  {
    id: "send-email-notification",
    retries: 3,
    triggers: [{ event: "notification/email.send" }],
  },
  async ({ event, step }) => {
    const { to, subject, html, notificationType, workspaceId, userId } =
      event.data;

    const result = await step.run("send-email", async () => {
      const { sendEmail } = await import("@/lib/notifications/email");
      return sendEmail(to, subject, html);
    });

    if (result.error) {
      throw new Error(`Email send failed: ${result.error}`);
    }

    await step.run("log-event", async () => {
      await logEvent({
        workspaceId: workspaceId ?? "system",
        type: "notification.email_sent",
        actorType: "system",
        actorId: "inngest",
        entityType: "notification",
        entityId: result.id ?? "unknown",
        metadata: {
          to,
          subject,
          notificationType,
          userId,
        },
      });
    });

    return { emailId: result.id, status: "sent" };
  }
);

// ============================================================
// 3. Sync HubSpot Data
// ============================================================

export const syncHubSpotData = inngest.createFunction(
  {
    id: "sync-hubspot-data",
    retries: 2,
    triggers: [{ event: "hubspot/sync.requested" }],
  },
  async ({ event, step }) => {
    const { workspaceId } = event.data;

    const result = await step.run("sync-to-brain", async () => {
      const { syncHubSpotToBrain } = await import("@/lib/hubspot/actions");
      return syncHubSpotToBrain(workspaceId);
    });

    if (result.error) {
      throw new Error(`HubSpot sync failed: ${result.error}`);
    }

    await step.run("log-event", async () => {
      await logEvent({
        workspaceId,
        type: "hubspot.sync_completed",
        actorType: "system",
        actorId: "inngest",
        entityType: "integration",
        entityId: "hubspot",
        metadata: {
          synced: result.synced,
          objectCount: result.objects.length,
        },
      });
    });

    return { synced: result.synced, objects: result.objects };
  }
);

// ============================================================
// 4. Generate Weekly Digest (cron: Monday 8am UTC)
// ============================================================

export const generateDigest = inngest.createFunction(
  {
    id: "generate-digest",
    retries: 2,
    triggers: [{ cron: "0 8 * * 1" }],
  },
  async ({ step }) => {
    // Step 1: Gather digest data from all workspaces
    const digestData = await step.run("gather-digest-data", async () => {
      const { isSupabaseConfigured, createClient } = await import(
        "@/lib/supabase/server"
      );

      if (!isSupabaseConfigured) {
        return {
          workspaces: [
            {
              workspaceId: "mock-workspace",
              email: "user@example.com",
              summary: {
                period: `Week of ${new Date().toISOString().split("T")[0]}`,
                initiativesCompleted: 3,
                approvalsResolved: 7,
                agentRunsTotal: 42,
                highlights: ["ABM campaign launched", "Content pipeline cleared"],
              },
            },
          ],
        };
      }

      const supabase = await createClient();
      const oneWeekAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Get all workspaces with active users
      const { data: workspaces } = await supabase
        .from("workspace_members")
        .select("workspace_id, users(email)")
        .eq("role", "owner");

      if (!workspaces || workspaces.length === 0) {
        return { workspaces: [] };
      }

      const results = [];
      for (const ws of workspaces) {
        const wsId = ws.workspace_id;

        const [initiatives, approvals, agentRuns] = await Promise.all([
          supabase
            .from("initiatives")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", wsId)
            .eq("status", "completed")
            .gte("updated_at", oneWeekAgo),
          supabase
            .from("approvals")
            .select("id", { count: "exact", head: true })
            .in("status", ["approved", "rejected"])
            .gte("resolved_at", oneWeekAgo),
          supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", wsId)
            .like("type", "agent.%")
            .gte("created_at", oneWeekAgo),
        ]);

        const userEmail =
          (ws.users as unknown as { email: string })?.email ??
          "user@example.com";

        results.push({
          workspaceId: wsId,
          email: userEmail,
          summary: {
            period: `Week of ${new Date().toISOString().split("T")[0]}`,
            initiativesCompleted: initiatives.count ?? 0,
            approvalsResolved: approvals.count ?? 0,
            agentRunsTotal: agentRuns.count ?? 0,
          },
        });
      }

      return { workspaces: results };
    });

    // Step 2: Send digest emails
    const sentCount = await step.run("send-digest-emails", async () => {
      const { sendDigestEmail } = await import("@/lib/notifications/email");
      let sent = 0;

      for (const ws of digestData.workspaces) {
        const result = await sendDigestEmail(ws.email, ws.summary);
        if (!result.error) {
          sent++;
        }
      }

      return sent;
    });

    return {
      workspacesProcessed: digestData.workspaces.length,
      emailsSent: sentCount,
    };
  }
);

// ============================================================
// 5. Refresh HubSpot Tokens (cron: every hour)
// ============================================================

export const refreshHubSpotTokens = inngest.createFunction(
  {
    id: "refresh-hubspot-tokens",
    retries: 2,
    triggers: [{ cron: "0 * * * *" }],
  },
  async ({ step }) => {
    const refreshResults = await step.run("refresh-all-tokens", async () => {
      const { isSupabaseConfigured, createClient } = await import(
        "@/lib/supabase/server"
      );
      const { isHubSpotConfigured } = await import("@/lib/hubspot/client");

      if (!isSupabaseConfigured || !isHubSpotConfigured) {
        console.log(
          "[jobs:refresh-hubspot-tokens] Skipping: services not configured"
        );
        return { refreshed: 0, errors: 0 };
      }

      const supabase = await createClient();

      // Find connections expiring in the next 30 minutes
      const expirationThreshold = new Date(
        Date.now() + 30 * 60 * 1000
      ).toISOString();

      const { data: connections } = await supabase
        .from("hubspot_connections")
        .select("workspace_id, expires_at")
        .lte("expires_at", expirationThreshold);

      if (!connections || connections.length === 0) {
        return { refreshed: 0, errors: 0 };
      }

      const { refreshHubSpotToken } = await import("@/lib/hubspot/actions");
      let refreshed = 0;
      let errors = 0;

      for (const conn of connections) {
        const result = await refreshHubSpotToken(conn.workspace_id);
        if (result.error) {
          console.error(
            `[jobs:refresh-hubspot-tokens] Failed for workspace ${conn.workspace_id}: ${result.error}`
          );
          errors++;
        } else {
          refreshed++;
        }
      }

      return { refreshed, errors };
    });

    await step.run("log-event", async () => {
      await logEvent({
        workspaceId: "system",
        type: "hubspot.tokens_refreshed",
        actorType: "system",
        actorId: "inngest",
        entityType: "integration",
        entityId: "hubspot",
        metadata: refreshResults,
      });
    });

    return refreshResults;
  }
);
