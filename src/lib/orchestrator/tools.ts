import { tool } from "ai";
import { z } from "zod";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { PgVectorRetrievalAdapter } from "@/lib/retrieval/pgvector-adapter";
import { logApprovalEvent, logWorkItemEvent } from "@/lib/events/logger";
import { updateKnowledgeEmbedding } from "@/lib/embeddings/service";
import { requireApproval } from "@/lib/approvals/enforcement";

/**
 * Tools available to the orchestrator during chat.
 *
 * Each tool is defined with a Zod parameter schema and an execute function.
 * When Supabase is not configured, tools return mock success responses so the
 * UI can still demonstrate the interaction pattern.
 */
export const orchestratorTools = {
  searchKnowledge: tool({
    description:
      "Search the second brain for relevant knowledge objects. Use this when you need to reference strategy docs, playbooks, brand guidelines, customer profiles, or any stored knowledge.",
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant knowledge"),
      types: z
        .array(z.string())
        .optional()
        .describe(
          "Filter by knowledge type (e.g. 'strategy', 'brand', 'customer', 'product')"
        ),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
    }),
    execute: async ({ query, types, maxResults }) => {
      if (!isSupabaseConfigured) {
        return {
          success: true,
          results: [
            {
              title: "Brand Voice Guidelines",
              path: "Knowledge/Brand/voice-guidelines",
              snippet:
                "Our brand voice is bold, clear, and human. We lead with insight and avoid corporate jargon.",
              type: "brand",
            },
            {
              title: "Q2 Growth Strategy",
              path: "Organization/Strategy/q2-growth-plan",
              snippet:
                "Focus on AEO-driven content, expand ABM program to 50 target accounts, and launch partner co-marketing.",
              type: "strategy",
            },
          ],
        };
      }

      const retrieval = new PgVectorRetrievalAdapter();
      const results = await retrieval.search({
        query,
        workspaceId: "current", // resolved by the adapter from auth context
        filters: types ? { types } : undefined,
        topK: maxResults,
      });

      return {
        success: true,
        results: results.map((r) => ({
          title: r.title,
          path: r.path,
          snippet:
            r.content.length > 300
              ? r.content.slice(0, 300) + "..."
              : r.content,
          type: r.type,
        })),
      };
    },
  }),

  createWorkItem: tool({
    description:
      "Create a new work item (task, deliverable, approval, or blocker) on the initiative's kanban board. Use this to break plans into trackable, actionable items.",
    inputSchema: z.object({
      initiativeId: z.string().describe("The initiative to add the work item to"),
      title: z.string().describe("Clear, actionable title for the work item"),
      description: z
        .string()
        .optional()
        .describe("Detailed description of what needs to be done"),
      type: z
        .enum(["task", "deliverable", "approval", "blocker"])
        .describe("The type of work item"),
      status: z
        .enum(["backlog", "todo", "in_progress", "review", "done", "blocked"])
        .optional()
        .default("todo")
        .describe("Initial status for the work item"),
      assignedAgent: z
        .string()
        .optional()
        .describe("Agent to assign the work item to"),
      dueDate: z
        .string()
        .optional()
        .describe("Due date in ISO 8601 format"),
    }),
    execute: async ({
      initiativeId,
      title,
      description,
      type,
      status,
      assignedAgent,
      dueDate,
    }) => {
      if (!isSupabaseConfigured) {
        return {
          success: true,
          workItem: {
            id: `wi_mock_${Date.now()}`,
            initiative_id: initiativeId,
            title,
            description,
            type,
            status,
            assigned_agent: assignedAgent,
            due_date: dueDate,
            created_at: new Date().toISOString(),
          },
        };
      }

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("work_items")
        .insert({
          initiative_id: initiativeId,
          title,
          description,
          type,
          status,
          assigned_agent: assignedAgent,
          due_date: dueDate,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Fire-and-forget event logging
      logWorkItemEvent("current", data.id, "created", "agent", "orchestrator").catch(() => {});

      return { success: true, workItem: data };
    },
  }),

  updateWorkItem: tool({
    description:
      "Update an existing work item's status or details. Use this to move items across the board or add context.",
    inputSchema: z.object({
      workItemId: z.string().describe("The ID of the work item to update"),
      status: z
        .enum(["backlog", "todo", "in_progress", "review", "done", "blocked"])
        .optional()
        .describe("New status for the work item"),
      title: z.string().optional().describe("Updated title"),
      description: z.string().optional().describe("Updated description"),
      assignedAgent: z
        .string()
        .optional()
        .describe("Agent to reassign the work item to"),
    }),
    execute: async ({ workItemId, status, title, description, assignedAgent }) => {
      if (!isSupabaseConfigured) {
        return {
          success: true,
          workItem: {
            id: workItemId,
            status: status ?? "in_progress",
            title: title ?? "Updated work item",
            updated_at: new Date().toISOString(),
          },
        };
      }

      const supabase = await createClient();
      const updates: Record<string, unknown> = {};
      if (status !== undefined) updates.status = status;
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (assignedAgent !== undefined) updates.assigned_agent = assignedAgent;
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("work_items")
        .update(updates)
        .eq("id", workItemId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Fire-and-forget event logging
      logWorkItemEvent("current", data.id, "updated", "agent", "orchestrator").catch(() => {});

      return { success: true, workItem: data };
    },
  }),

  requestApproval: tool({
    description:
      "Create an approval request for the user. Use this before publishing content, making budget decisions, or taking any high-risk action.",
    inputSchema: z.object({
      initiativeId: z.string().describe("The initiative this approval belongs to"),
      title: z.string().describe("Clear title describing what needs approval"),
      description: z
        .string()
        .describe("Detailed description of what is being approved and why"),
      category: z
        .enum(["content", "workflow", "execution", "integration", "communication"])
        .describe("The category of this approval"),
      workItemId: z
        .string()
        .optional()
        .describe("Associated work item, if any"),
    }),
    execute: async ({
      initiativeId,
      title,
      description,
      category,
      workItemId,
    }) => {
      if (!isSupabaseConfigured) {
        const mockId = `apr_mock_${Date.now()}`;

        // Fire-and-forget event logging
        logApprovalEvent("current", mockId, "created", "agent", "orchestrator").catch(() => {});

        return {
          success: true,
          approval: {
            id: mockId,
            initiative_id: initiativeId,
            title,
            description,
            category,
            work_item_id: workItemId,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        };
      }

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("approvals")
        .insert({
          initiative_id: initiativeId,
          title,
          description,
          category,
          work_item_id: workItemId,
          status: "pending",
          requested_by: "orchestrator",
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Fire-and-forget event logging
      logApprovalEvent("current", data.id, "created", "agent", "orchestrator").catch(() => {});

      return { success: true, approval: data };
    },
  }),

  generateContent: tool({
    description:
      "Generate a content deliverable (blog post, email, social post, ad copy, etc.) and save it as a deliverable work item. The generated content should be presented to the user for review.",
    inputSchema: z.object({
      initiativeId: z.string().describe("The initiative this content belongs to"),
      contentType: z
        .enum([
          "blog_post",
          "email",
          "social_post",
          "ad_copy",
          "landing_page",
          "case_study",
          "whitepaper",
          "other",
        ])
        .describe("The type of content to generate"),
      title: z.string().describe("Title or subject for the content"),
      brief: z
        .string()
        .describe(
          "Detailed brief: target audience, key messages, tone, length, and any specific requirements"
        ),
      outline: z
        .string()
        .optional()
        .describe("Optional outline or structure to follow"),
    }),
    execute: async ({ initiativeId, contentType, title, brief, outline }) => {
      // Check if this action requires approval before proceeding
      const approvalCheck = requireApproval("generateContent", {
        initiativeId,
        contentType,
      });

      if (approvalCheck.required) {
        // Auto-create an approval request instead of executing
        const approvalId = `apr_auto_${Date.now()}`;

        if (isSupabaseConfigured) {
          const supabase = await createClient();
          const { data: approvalData } = await supabase
            .from("approvals")
            .insert({
              initiative_id: initiativeId,
              title: `Generate content: ${title}`,
              description: `${approvalCheck.reason}\n\nContent type: ${contentType}\nBrief: ${brief}`,
              category: approvalCheck.category,
              status: "pending",
              requested_by: "orchestrator",
            })
            .select()
            .single();

          if (approvalData) {
            logApprovalEvent("current", approvalData.id, "created", "agent", "orchestrator").catch(() => {});
          }
        }

        return {
          success: false,
          awaitingApproval: true,
          approvalId,
          message: `Awaiting approval: ${approvalCheck.reason}`,
          category: approvalCheck.category,
        };
      }

      if (!isSupabaseConfigured) {
        return {
          success: true,
          deliverable: {
            id: `del_mock_${Date.now()}`,
            initiative_id: initiativeId,
            title,
            content_type: contentType,
            brief,
            outline,
            status: "review",
            message:
              "Content draft created and saved as a deliverable. Please review and approve before publishing.",
            created_at: new Date().toISOString(),
          },
        };
      }

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("work_items")
        .insert({
          initiative_id: initiativeId,
          title: `[${contentType}] ${title}`,
          description: `**Brief:** ${brief}${outline ? `\n\n**Outline:**\n${outline}` : ""}`,
          type: "deliverable",
          status: "review",
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        deliverable: {
          ...data,
          message:
            "Content draft created and saved as a deliverable. Please review and approve before publishing.",
        },
      };
    },
  }),

  updateSecondBrain: tool({
    description:
      "Propose an update to a knowledge object in the second brain. This creates a pending update that the user can review and approve.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "The path for the knowledge object (e.g. 'Knowledge/Brand/voice-guidelines')"
        ),
      title: z.string().describe("Title of the knowledge object"),
      content: z
        .string()
        .describe("The content to write or update"),
      type: z
        .enum([
          "company",
          "team",
          "individual",
          "skill",
          "agent",
          "reference",
          "brand",
          "customer",
          "product",
          "strategy",
        ])
        .describe("The type of knowledge object"),
      reason: z
        .string()
        .describe("Why this update is being proposed"),
    }),
    execute: async ({ path, title, content, type, reason }) => {
      // Check if this action requires approval before proceeding
      const approvalCheck = requireApproval("updateSecondBrain", { path, type });

      if (approvalCheck.required) {
        const approvalId = `apr_auto_${Date.now()}`;

        if (isSupabaseConfigured) {
          const supabase = await createClient();
          const { data: approvalData } = await supabase
            .from("approvals")
            .insert({
              initiative_id: "knowledge-update",
              title: `Update knowledge: ${title}`,
              description: `${approvalCheck.reason}\n\nPath: ${path}\nReason: ${reason}`,
              category: approvalCheck.category,
              status: "pending",
              requested_by: "orchestrator",
            })
            .select()
            .single();

          if (approvalData) {
            logApprovalEvent("current", approvalData.id, "created", "agent", "orchestrator").catch(() => {});
          }
        }

        return {
          success: false,
          awaitingApproval: true,
          approvalId,
          message: `Awaiting approval: ${approvalCheck.reason}`,
          category: approvalCheck.category,
        };
      }

      if (!isSupabaseConfigured) {
        return {
          success: true,
          proposal: {
            id: `kb_mock_${Date.now()}`,
            path,
            title,
            type,
            reason,
            status: "pending_review",
            message:
              "Knowledge update proposed. Please review and approve before it is written to the second brain.",
            created_at: new Date().toISOString(),
          },
        };
      }

      const supabase = await createClient();

      // Check if the knowledge object already exists at this path
      const { data: existing } = await supabase
        .from("knowledge_objects")
        .select("id")
        .eq("path", path)
        .maybeSingle();

      if (existing) {
        // Update existing object
        const { data, error } = await supabase
          .from("knowledge_objects")
          .update({
            title,
            content,
            type,
            source: "agent" as const,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        // Fire-and-forget embedding generation
        updateKnowledgeEmbedding(data.id as string, content).catch(() => {});

        return {
          success: true,
          proposal: {
            ...data,
            reason,
            action: "updated",
            message: "Knowledge object updated in the second brain.",
          },
        };
      }

      // Create new knowledge object
      const { data, error } = await supabase
        .from("knowledge_objects")
        .insert({
          path,
          title,
          content,
          type,
          source: "agent" as const,
          workspace_id: "current", // resolved from auth context
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Fire-and-forget embedding generation
      updateKnowledgeEmbedding(data.id as string, content).catch(() => {});

      return {
        success: true,
        proposal: {
          ...data,
          reason,
          action: "created",
          message: "New knowledge object created in the second brain.",
        },
      };
    },
  }),
};
