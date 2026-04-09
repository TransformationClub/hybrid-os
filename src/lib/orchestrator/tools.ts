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

  createInitiative: tool({
    description:
      "Create a new initiative in Hybrid OS. Initiatives are strategic projects that contain work items, approvals, and a knowledge context. Use this when the user wants to start a new campaign, project, or strategic effort.",
    inputSchema: z.object({
      title: z.string().describe("Name of the initiative"),
      type: z
        .enum(["aeo-campaign", "abm-campaign", "custom"])
        .default("custom")
        .describe("Type of initiative"),
      goal: z.string().optional().describe("Primary goal or objective"),
      brief: z.string().optional().describe("Context, background, or detailed brief"),
    }),
    execute: async ({ title, type, goal, brief }) => {
      if (!isSupabaseConfigured) {
        const id = `init_mock_${Date.now()}`;
        return {
          success: true,
          initiative: { id, title, type, goal, status: "draft", created_at: new Date().toISOString() },
          message: `Initiative "${title}" created successfully. Navigate to /initiatives/${id} to view it.`,
        };
      }

      const supabase = await createClient();
      // Get the current user's workspace from session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      // Get the user's first workspace
      const { data: membership } = await supabase
        .from("workspace_memberships")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!membership) return { success: false, error: "No workspace found" };

      const { data, error } = await supabase
        .from("initiatives")
        .insert({
          workspace_id: membership.workspace_id,
          title,
          type,
          status: "draft",
          goal: goal ?? "",
          brief: brief ?? null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error || !data) return { success: false, error: error?.message ?? "Failed to create initiative" };

      return {
        success: true,
        initiative: data,
        message: `Initiative "${title}" created successfully. Navigate to /initiatives/${data.id} to view it.`,
      };
    },
  }),

  listInitiatives: tool({
    description:
      "List all initiatives in the workspace. Use this to show the user what initiatives exist, or to look up an initiative ID before linking or updating it.",
    inputSchema: z.object({}),
    execute: async () => {
      if (!isSupabaseConfigured) {
        return {
          success: true,
          initiatives: [
            { id: "init-001", title: "Q2 AEO Content Campaign", type: "aeo-campaign", status: "active", goal: "Increase AI search visibility" },
            { id: "init-002", title: "ABM Q2 — Enterprise", type: "abm-campaign", status: "planning", goal: "Close 5 enterprise accounts" },
          ],
          count: 2,
        };
      }

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: membership } = await supabase
        .from("workspace_memberships")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!membership) return { success: false, error: "No workspace found" };

      const { data, error } = await supabase
        .from("initiatives")
        .select("id, title, type, status, goal")
        .eq("workspace_id", membership.workspace_id)
        .neq("status", "archived")
        .order("created_at", { ascending: false });

      if (error) return { success: false, error: error.message };

      return {
        success: true,
        initiatives: data ?? [],
        count: data?.length ?? 0,
      };
    },
  }),

  manageSkill: tool({
    description:
      "Create, update, or list skills in Hybrid OS. Skills are reusable workflows that define how agents complete specific types of work (e.g. writing a blog post, running an ABM sequence). Use this when the user wants to build, edit, or view skills.",
    inputSchema: z.object({
      action: z
        .enum(["create", "update", "list"])
        .describe("Action to perform"),
      skillId: z.string().optional().describe("Required for 'update'"),
      name: z.string().optional().describe("Skill name"),
      purpose: z.string().optional().describe("What this skill is designed to accomplish"),
      description: z.string().optional().describe("Additional description"),
      qualityBar: z.string().optional().describe("Quality standards for outputs"),
      escalationRules: z.string().optional().describe("When to escalate to a human"),
    }),
    execute: async ({ action, skillId, name, purpose, description, qualityBar, escalationRules }) => {
      if (!isSupabaseConfigured) {
        if (action === "list") {
          return { success: true, skills: [{ id: "skill-mock-1", name: "Blog Post Writing", purpose: "Write SEO-optimised blog posts", isActive: true }], count: 1 };
        }
        const id = `skill_mock_${Date.now()}`;
        return { success: true, skill: { id, name, purpose }, message: `Skill "${name}" ${action === "create" ? "created" : "updated"}.` };
      }

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: membership } = await supabase
        .from("workspace_memberships")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!membership) return { success: false, error: "No workspace found" };

      if (action === "list") {
        const { data, error } = await supabase
          .from("skills")
          .select("id, name, purpose, is_active")
          .eq("workspace_id", membership.workspace_id)
          .order("name");
        if (error) return { success: false, error: error.message };
        return { success: true, skills: data ?? [], count: data?.length ?? 0 };
      }

      if (action === "create") {
        if (!name || !purpose) return { success: false, error: "name and purpose are required to create a skill" };
        const { data, error } = await supabase
          .from("skills")
          .insert({ workspace_id: membership.workspace_id, name, purpose, description: description ?? null, workflow: [], agents: [], tools: [], quality_bar: qualityBar ?? null, escalation_rules: escalationRules ?? null, is_active: true })
          .select()
          .single();
        if (error || !data) return { success: false, error: error?.message ?? "Failed to create skill" };
        return { success: true, skill: data, message: `Skill "${name}" created. Navigate to /skills/${data.id} to configure its workflow.` };
      }

      if (action === "update") {
        if (!skillId) return { success: false, error: "skillId is required for update" };
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (purpose !== undefined) updates.purpose = purpose;
        if (description !== undefined) updates.description = description;
        if (qualityBar !== undefined) updates.quality_bar = qualityBar;
        if (escalationRules !== undefined) updates.escalation_rules = escalationRules;
        const { data, error } = await supabase.from("skills").update(updates).eq("id", skillId).select().single();
        if (error || !data) return { success: false, error: error?.message ?? "Failed to update skill" };
        return { success: true, skill: data, message: "Skill updated successfully." };
      }

      return { success: false, error: "Invalid action" };
    },
  }),

  manageAgent: tool({
    description:
      "Create, update, or list AI agents in Hybrid OS. Agents are configured personas with specific roles, tools, and system prompts that execute work. Use this when the user wants to build, edit, or view agents.",
    inputSchema: z.object({
      action: z
        .enum(["create", "update", "list"])
        .describe("Action to perform"),
      agentId: z.string().optional().describe("Required for 'update'"),
      name: z.string().optional().describe("Agent name"),
      role: z.string().optional().describe("Agent role/function (e.g. 'Content Writer', 'Campaign Strategist')"),
      description: z.string().optional().describe("What this agent does"),
      systemPrompt: z.string().optional().describe("System prompt / instructions for the agent"),
      riskLevel: z
        .enum(["low", "medium", "high"])
        .optional()
        .describe("Risk level for agent actions"),
      canExecute: z.boolean().optional().describe("Whether the agent can execute actions autonomously"),
      requiresApproval: z.boolean().optional().describe("Whether actions require human approval"),
    }),
    execute: async ({ action, agentId, name, role, description, systemPrompt, riskLevel, canExecute, requiresApproval }) => {
      if (!isSupabaseConfigured) {
        if (action === "list") {
          return { success: true, agents: [{ id: "agent-mock-1", name: "Campaign Strategist", role: "strategist", riskLevel: "low", isActive: true }], count: 1 };
        }
        const id = `agent_mock_${Date.now()}`;
        return { success: true, agent: { id, name, role }, message: `Agent "${name}" ${action === "create" ? "created" : "updated"}.` };
      }

      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: membership } = await supabase
        .from("workspace_memberships")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!membership) return { success: false, error: "No workspace found" };

      if (action === "list") {
        const { data, error } = await supabase
          .from("agents")
          .select("id, name, role, risk_level, is_active")
          .eq("workspace_id", membership.workspace_id)
          .order("name");
        if (error) return { success: false, error: error.message };
        return { success: true, agents: data ?? [], count: data?.length ?? 0 };
      }

      if (action === "create") {
        if (!name || !role) return { success: false, error: "name and role are required to create an agent" };
        const { data, error } = await supabase
          .from("agents")
          .insert({ workspace_id: membership.workspace_id, name, role, description: description ?? null, risk_level: riskLevel ?? "low", can_execute: canExecute ?? false, requires_approval: requiresApproval ?? true, tools: [], system_prompt: systemPrompt ?? null, is_active: true })
          .select()
          .single();
        if (error || !data) return { success: false, error: error?.message ?? "Failed to create agent" };
        return { success: true, agent: data, message: `Agent "${name}" created. Navigate to /agents/${data.id} to configure it.` };
      }

      if (action === "update") {
        if (!agentId) return { success: false, error: "agentId is required for update" };
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name;
        if (role !== undefined) updates.role = role;
        if (description !== undefined) updates.description = description;
        if (riskLevel !== undefined) updates.risk_level = riskLevel;
        if (canExecute !== undefined) updates.can_execute = canExecute;
        if (requiresApproval !== undefined) updates.requires_approval = requiresApproval;
        if (systemPrompt !== undefined) updates.system_prompt = systemPrompt;
        const { data, error } = await supabase.from("agents").update(updates).eq("id", agentId).select().single();
        if (error || !data) return { success: false, error: error?.message ?? "Failed to update agent" };
        return { success: true, agent: data, message: "Agent updated successfully." };
      }

      return { success: false, error: "Invalid action" };
    },
  }),
};
