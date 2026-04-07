"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { logEvent } from "@/lib/events/logger";
import type { Skill, SkillStep } from "@/types";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface CreateSkillParams {
  workspaceId: string;
  name: string;
  purpose: string;
  description?: string;
  workflow: SkillStep[];
  agents: string[];
  tools: string[];
  qualityBar?: string;
  escalationRules?: string;
}

interface UpdateSkillParams {
  skillId: string;
  name?: string;
  purpose?: string;
  description?: string;
  workflow?: SkillStep[];
  agents?: string[];
  tools?: string[];
  qualityBar?: string;
  escalationRules?: string;
  isActive?: boolean;
}

type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string };

// ------------------------------------------------------------
// Mock helpers (used when Supabase is not configured)
// ------------------------------------------------------------

function mockSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: crypto.randomUUID(),
    workspace_id: "mock-workspace",
    name: "Mock Skill",
    purpose: "A mock skill for development",
    workflow: [],
    agents: [],
    tools: [],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeStep(
  order: number,
  label: string,
  agentId: string,
  action: string,
  inputs?: Record<string, unknown>,
  outputs?: Record<string, unknown>,
): SkillStep {
  return {
    id: crypto.randomUUID(),
    order,
    label,
    agent_id: agentId,
    action,
    inputs,
    outputs,
  };
}

// ------------------------------------------------------------
// Skill CRUD
// ------------------------------------------------------------

export async function createSkill(
  params: CreateSkillParams,
): Promise<ActionResult<Skill>> {
  if (!isSupabaseConfigured) {
    return {
      data: mockSkill({
        workspace_id: params.workspaceId,
        name: params.name,
        purpose: params.purpose,
        description: params.description,
        workflow: params.workflow,
        agents: params.agents,
        tools: params.tools,
        quality_bar: params.qualityBar,
        escalation_rules: params.escalationRules,
      }),
    };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("skills")
      .insert({
        workspace_id: params.workspaceId,
        name: params.name,
        purpose: params.purpose,
        description: params.description ?? null,
        workflow: params.workflow,
        agents: params.agents,
        tools: params.tools,
        quality_bar: params.qualityBar ?? null,
        escalation_rules: params.escalationRules ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Skill };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create skill" };
  }
}

export async function updateSkill(
  params: UpdateSkillParams,
): Promise<ActionResult<Skill>> {
  if (!isSupabaseConfigured) {
    return {
      data: mockSkill({
        id: params.skillId,
        name: params.name,
        purpose: params.purpose,
        description: params.description,
        workflow: params.workflow,
        agents: params.agents,
        tools: params.tools,
        quality_bar: params.qualityBar,
        escalation_rules: params.escalationRules,
        is_active: params.isActive,
      }),
    };
  }

  try {
    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {};
    if (params.name !== undefined) updatePayload.name = params.name;
    if (params.purpose !== undefined) updatePayload.purpose = params.purpose;
    if (params.description !== undefined) updatePayload.description = params.description;
    if (params.workflow !== undefined) updatePayload.workflow = params.workflow;
    if (params.agents !== undefined) updatePayload.agents = params.agents;
    if (params.tools !== undefined) updatePayload.tools = params.tools;
    if (params.qualityBar !== undefined) updatePayload.quality_bar = params.qualityBar;
    if (params.escalationRules !== undefined) updatePayload.escalation_rules = params.escalationRules;
    if (params.isActive !== undefined) updatePayload.is_active = params.isActive;

    const { data, error } = await supabase
      .from("skills")
      .update(updatePayload)
      .eq("id", params.skillId)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Skill };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update skill" };
  }
}

export async function deleteSkill(
  skillId: string,
): Promise<ActionResult<{ success: boolean }>> {
  if (!isSupabaseConfigured) {
    return { data: { success: true } };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("skills")
      .update({ is_active: false })
      .eq("id", skillId);

    if (error) {
      return { error: error.message };
    }

    return { data: { success: true } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete skill" };
  }
}

export async function getSkills(
  workspaceId: string,
): Promise<ActionResult<Skill[]>> {
  if (!isSupabaseConfigured) {
    const mocks = DEFAULT_SKILLS.map((def) =>
      mockSkill({
        workspace_id: workspaceId,
        name: def.name,
        purpose: def.purpose,
        description: def.description,
        workflow: def.workflow,
        agents: def.agents,
        tools: def.tools,
        quality_bar: def.qualityBar,
        escalation_rules: def.escalationRules,
      }),
    );
    return { data: mocks };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      return { error: error.message };
    }

    return { data: (data ?? []) as Skill[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch skills" };
  }
}

export async function getSkill(
  skillId: string,
): Promise<ActionResult<Skill>> {
  if (!isSupabaseConfigured) {
    return { data: mockSkill({ id: skillId }) };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("id", skillId)
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data: data as Skill };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch skill" };
  }
}

// ------------------------------------------------------------
// Default Skills Seed
// ------------------------------------------------------------

const DEFAULT_SKILLS: Array<{
  name: string;
  purpose: string;
  description: string;
  workflow: SkillStep[];
  agents: string[];
  tools: string[];
  qualityBar?: string;
  escalationRules?: string;
}> = [
  // ---- 1. Onboarding ----
  {
    name: "Onboarding",
    purpose: "Guide a new workspace through initial setup, data connections, and first campaign suggestion",
    description:
      "Walks the user through a guided interview to capture business context, connects data sources, generates a second brain foundation, and suggests a first campaign.",
    workflow: [
      makeStep(1, "Guided Interview", "Orchestrator", "Conduct onboarding interview to capture business goals, audience, channels, brand voice, and competitive landscape", { prompts: ["business_goals", "target_audience", "channels", "brand_voice"] }, { onboarding_profile: "object" }),
      makeStep(2, "Data Connection", "Orchestrator", "Help user connect analytics, CRM, CMS, and ad platform integrations", { onboarding_profile: "object" }, { connected_sources: "string[]" }),
      makeStep(3, "Second Brain Generation", "Researcher", "Synthesize onboarding data into initial knowledge objects for the workspace second brain", { onboarding_profile: "object", connected_sources: "string[]" }, { knowledge_objects: "KnowledgeObject[]" }),
      makeStep(4, "First Campaign Suggestion", "Campaign Strategist", "Propose an initial campaign based on onboarding insights and connected data", { onboarding_profile: "object", knowledge_objects: "KnowledgeObject[]" }, { campaign_brief: "object" }),
    ],
    agents: ["Orchestrator", "Researcher", "Campaign Strategist"],
    tools: ["task-decomposition", "web-search", "data-analysis", "audience-analysis", "channel-planning"],
    qualityBar: "Onboarding profile is complete with all required fields. At least one data source connected. Campaign suggestion is actionable.",
    escalationRules: "Escalate to human if user is unresponsive after 2 prompts or if no data sources can be connected.",
  },

  // ---- 2. Campaign Planning ----
  {
    name: "Campaign Planning",
    purpose: "Research, strategize, and plan a full marketing campaign from brief to actionable work items",
    description:
      "End-to-end campaign planning: audience research, goal definition, creative brief, timeline, and decomposed work items ready for execution.",
    workflow: [
      makeStep(1, "Research Audience", "Researcher", "Gather audience insights, competitor campaigns, and market trends relevant to the campaign objective", { campaign_objective: "string" }, { research_brief: "object" }),
      makeStep(2, "Define Goals & KPIs", "Campaign Strategist", "Set measurable goals, KPIs, and success criteria based on research findings", { research_brief: "object" }, { goals: "object", kpis: "string[]" }),
      makeStep(3, "Create Campaign Brief", "Campaign Strategist", "Draft a comprehensive campaign brief including messaging pillars, channel strategy, and audience segments", { research_brief: "object", goals: "object" }, { campaign_brief: "object" }),
      makeStep(4, "Build Timeline", "Orchestrator", "Create a phased timeline with milestones, dependencies, and deadlines", { campaign_brief: "object" }, { timeline: "object" }),
      makeStep(5, "Generate Work Items", "Orchestrator", "Decompose campaign brief and timeline into assignable work items with owners and due dates", { campaign_brief: "object", timeline: "object" }, { work_items: "WorkItem[]" }),
    ],
    agents: ["Researcher", "Campaign Strategist", "Orchestrator"],
    tools: ["web-search", "data-analysis", "audience-analysis", "channel-planning", "competitive-research", "task-decomposition"],
    qualityBar: "Brief covers audience, channels, messaging, and KPIs. Timeline has clear milestones. Work items are specific and assignable.",
    escalationRules: "Escalate for human approval before finalizing the campaign brief. Escalate if budget decisions are required.",
  },

  // ---- 3. AEO Campaign ----
  {
    name: "AEO Campaign",
    purpose: "Plan and execute an Answer Engine Optimization campaign to increase AI-generated search visibility",
    description:
      "Full AEO workflow: keyword and topic research, strategy development, content creation, QA, optimization, and performance reporting.",
    workflow: [
      makeStep(1, "Keyword & Topic Research", "Researcher", "Identify high-value keywords, question patterns, and topic clusters where AI search engines surface answers", { target_domain: "string", competitors: "string[]" }, { keyword_map: "object", topic_clusters: "object" }),
      makeStep(2, "Strategy Development", "Campaign Strategist", "Define AEO strategy including content formats, target answer positions, and distribution plan", { keyword_map: "object", topic_clusters: "object" }, { aeo_strategy: "object" }),
      makeStep(3, "Content Creation", "Content Writer", "Produce optimized content designed to be surfaced by AI answer engines, following AEO best practices", { aeo_strategy: "object", keyword_map: "object" }, { content_drafts: "object[]" }),
      makeStep(4, "QA Review", "QA Reviewer", "Review content for factual accuracy, brand alignment, AEO formatting, and schema markup", { content_drafts: "object[]" }, { review_feedback: "object[]", approved_content: "object[]" }),
      makeStep(5, "Optimization", "Optimizer", "Analyze initial performance signals, A/B test content variants, and refine for better answer engine placement", { approved_content: "object[]", performance_data: "object" }, { optimization_recommendations: "object[]" }),
      makeStep(6, "Performance Reporting", "Optimizer", "Compile performance report with AI search visibility metrics, traffic impact, and next-step recommendations", { optimization_recommendations: "object[]", performance_data: "object" }, { performance_report: "object" }),
    ],
    agents: ["Researcher", "Campaign Strategist", "Content Writer", "QA Reviewer", "Optimizer"],
    tools: ["web-search", "seo-optimization", "content-generation", "brand-voice-check", "content-review", "analytics-read", "ab-testing", "performance-reporting"],
    qualityBar: "Content passes QA review. All content includes proper schema markup. Performance report includes actionable next steps.",
    escalationRules: "Escalate content for human approval before publishing. Escalate if performance drops below baseline after optimization.",
  },

  // ---- 4. ABM Campaign ----
  {
    name: "ABM Campaign",
    purpose: "Design and execute an Account-Based Marketing campaign targeting high-value accounts",
    description:
      "End-to-end ABM: account targeting, persona mapping, multi-channel personalized content, execution, and performance analysis.",
    workflow: [
      makeStep(1, "Account Targeting", "Researcher", "Identify and score target accounts using firmographic, technographic, and intent data", { ideal_customer_profile: "object" }, { target_accounts: "object[]", account_scores: "object" }),
      makeStep(2, "Persona Mapping", "Campaign Strategist", "Map buying committee personas for each target account with pain points, motivations, and preferred channels", { target_accounts: "object[]" }, { persona_maps: "object[]" }),
      makeStep(3, "Multi-Channel Content", "Content Writer", "Create personalized content for each persona and channel: emails, landing pages, ads, and sales collateral", { persona_maps: "object[]", target_accounts: "object[]" }, { content_matrix: "object" }),
      makeStep(4, "Campaign Execution", "Orchestrator", "Coordinate multi-channel launch: schedule emails, deploy ads, activate sales plays, and track engagement", { content_matrix: "object", target_accounts: "object[]" }, { execution_log: "object", engagement_data: "object" }),
      makeStep(5, "Performance Analysis", "Optimizer", "Analyze account engagement, pipeline impact, and ROI. Surface insights and recommend next plays per account", { engagement_data: "object", target_accounts: "object[]" }, { abm_report: "object", next_plays: "object[]" }),
    ],
    agents: ["Researcher", "Campaign Strategist", "Content Writer", "Orchestrator", "Optimizer"],
    tools: ["web-search", "data-analysis", "audience-analysis", "content-generation", "brand-voice-check", "task-decomposition", "analytics-read", "performance-reporting"],
    qualityBar: "Target list is scored and validated. Content is personalized per persona. Performance report includes per-account engagement.",
    escalationRules: "Escalate for human approval on target account list and before launching outbound sequences. Escalate budget decisions.",
  },

  // ---- 5. Retro & Optimization ----
  {
    name: "Retro & Optimization",
    purpose: "Analyze campaign performance, surface insights, and update the workspace second brain with learnings",
    description:
      "Post-campaign retrospective: pull performance data, analyze results against goals, surface actionable insights, and persist learnings to the second brain.",
    workflow: [
      makeStep(1, "Pull Performance Data", "Researcher", "Aggregate performance data from analytics, ad platforms, CRM, and engagement tools for the target initiative", { initiative_id: "string" }, { raw_performance_data: "object" }),
      makeStep(2, "Analyze Results", "Optimizer", "Compare results against goals and KPIs. Identify what worked, what underperformed, and key contributing factors", { raw_performance_data: "object", goals: "object" }, { analysis: "object" }),
      makeStep(3, "Surface Insights", "Campaign Strategist", "Distill analysis into strategic insights: audience learnings, channel effectiveness, messaging takeaways, and recommendations", { analysis: "object" }, { insights: "object[]", recommendations: "string[]" }),
      makeStep(4, "Update Second Brain", "Orchestrator", "Persist insights, recommendations, and performance benchmarks to the workspace knowledge base for future reference", { insights: "object[]", recommendations: "string[]" }, { knowledge_objects_created: "number" }),
    ],
    agents: ["Researcher", "Optimizer", "Campaign Strategist", "Orchestrator"],
    tools: ["analytics-read", "data-analysis", "performance-reporting", "report-generation", "task-decomposition"],
    qualityBar: "Analysis covers all defined KPIs. Insights are specific and actionable. At least 3 knowledge objects written back to second brain.",
    escalationRules: "Escalate if performance data is incomplete or if results are significantly below targets.",
  },
];

// ------------------------------------------------------------
// Feedback logging (called from client via server action)
// ------------------------------------------------------------

export async function logSkillFeedback(params: {
  workspaceId: string;
  skillId: string;
  rating: "up" | "down";
  text?: string;
  runStatus?: string;
  totalDuration?: number;
  stepCount?: number;
}): Promise<void> {
  await logEvent({
    workspaceId: params.workspaceId,
    type: "skill.executed",
    actorType: "user",
    actorId: "current-user",
    entityType: "skill",
    entityId: params.skillId,
    metadata: {
      feedback: {
        rating: params.rating,
        text: params.text,
        runStatus: params.runStatus,
        totalDuration: params.totalDuration,
        stepCount: params.stepCount,
      },
    },
  });
}

// ------------------------------------------------------------
// Default Skills Seed
// ------------------------------------------------------------

export async function seedDefaultSkills(
  workspaceId: string,
): Promise<ActionResult<Skill[]>> {
  if (!isSupabaseConfigured) {
    const mocks = DEFAULT_SKILLS.map((def) =>
      mockSkill({
        workspace_id: workspaceId,
        name: def.name,
        purpose: def.purpose,
        description: def.description,
        workflow: def.workflow,
        agents: def.agents,
        tools: def.tools,
        quality_bar: def.qualityBar,
        escalation_rules: def.escalationRules,
      }),
    );
    return { data: mocks };
  }

  try {
    const supabase = await createClient();

    const rows = DEFAULT_SKILLS.map((def) => ({
      workspace_id: workspaceId,
      name: def.name,
      purpose: def.purpose,
      description: def.description,
      workflow: def.workflow,
      agents: def.agents,
      tools: def.tools,
      quality_bar: def.qualityBar ?? null,
      escalation_rules: def.escalationRules ?? null,
      is_active: true,
    }));

    const { data, error } = await supabase
      .from("skills")
      .insert(rows)
      .select();

    if (error) {
      return { error: error.message };
    }

    return { data: (data ?? []) as Skill[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to seed default skills" };
  }
}
