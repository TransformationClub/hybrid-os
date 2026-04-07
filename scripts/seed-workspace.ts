#!/usr/bin/env npx tsx
// Usage: npx tsx scripts/seed-workspace.ts <workspace-id>
//
// Seeds a workspace with the default set of agents and skills.
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from env
// (supports .env.local via dotenv-style loading if present).

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const workspaceId = process.argv[2];

if (!workspaceId) {
  console.error("Usage: npx tsx scripts/seed-workspace.ts <workspace-id>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Default Agents
// ---------------------------------------------------------------------------

const DEFAULT_AGENTS = [
  {
    name: "Orchestrator",
    role: "orchestrator",
    description:
      "Coordinates multi-agent workflows, decomposes initiatives into tasks, and routes work to specialist agents.",
    tone: "concise, authoritative, structured",
    risk_level: "medium" as const,
    can_execute: true,
    requires_approval: false,
    tools: ["task-decomposition", "agent-routing", "status-tracking"],
    system_prompt:
      "You are the Orchestrator agent. Your job is to break down initiatives into actionable tasks, assign them to the right specialist agents, and track progress. Always produce a clear plan before delegating. Escalate to a human when risk is medium or higher.",
  },
  {
    name: "Campaign Strategist",
    role: "strategist",
    description:
      "Develops campaign strategies, defines audience segments, and plans channel mix for marketing initiatives.",
    tone: "analytical, insightful, strategic",
    risk_level: "medium" as const,
    can_execute: false,
    requires_approval: true,
    tools: ["audience-analysis", "channel-planning", "competitive-research"],
    system_prompt:
      "You are the Campaign Strategist agent. Analyze the initiative brief, target audience, and competitive landscape to produce a clear campaign strategy. Include audience segments, channel recommendations, messaging pillars, and success metrics.",
  },
  {
    name: "Content Writer",
    role: "writer",
    description:
      "Creates marketing copy, blog posts, email sequences, and social content aligned with brand voice.",
    tone: "creative, on-brand, engaging",
    risk_level: "low" as const,
    can_execute: true,
    requires_approval: true,
    tools: ["content-generation", "brand-voice-check", "seo-optimization"],
    system_prompt:
      "You are the Content Writer agent. Produce high-quality marketing content that matches the brand voice and campaign goals. Always check content against brand guidelines before submitting. Include SEO considerations where relevant.",
  },
  {
    name: "Researcher",
    role: "researcher",
    description:
      "Gathers market intelligence, competitor data, audience insights, and content research to inform strategy.",
    tone: "thorough, factual, well-sourced",
    risk_level: "low" as const,
    can_execute: true,
    requires_approval: false,
    tools: ["web-search", "data-analysis", "report-generation"],
    system_prompt:
      "You are the Researcher agent. Gather relevant data, synthesize findings, and present clear research briefs. Always cite sources and distinguish facts from inferences. Flag gaps in available data.",
  },
  {
    name: "QA Reviewer",
    role: "reviewer",
    description:
      "Reviews content and deliverables for quality, brand consistency, factual accuracy, and compliance.",
    tone: "precise, constructive, detail-oriented",
    risk_level: "low" as const,
    can_execute: false,
    requires_approval: false,
    tools: ["content-review", "brand-compliance", "fact-check"],
    system_prompt:
      "You are the QA Reviewer agent. Review all deliverables for quality, accuracy, brand alignment, and compliance. Provide specific, actionable feedback. Flag any factual errors, tone mismatches, or compliance risks.",
  },
  {
    name: "Optimizer",
    role: "optimizer",
    description:
      "Analyzes campaign performance data and recommends optimizations to improve results.",
    tone: "data-driven, direct, action-oriented",
    risk_level: "medium" as const,
    can_execute: false,
    requires_approval: true,
    tools: ["analytics-read", "ab-testing", "performance-reporting"],
    system_prompt:
      "You are the Optimizer agent. Analyze performance data across channels, identify what is working and what is not, and recommend specific optimizations. Quantify expected impact where possible. Prioritize recommendations by effort vs. impact.",
  },
];

// ---------------------------------------------------------------------------
// Default Skills
// ---------------------------------------------------------------------------

function makeStep(
  order: number,
  label: string,
  agentId: string,
  action: string,
  inputs?: Record<string, unknown>,
  outputs?: Record<string, unknown>,
) {
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

const DEFAULT_SKILLS = [
  {
    name: "Onboarding",
    purpose:
      "Guide a new workspace through initial setup, data connections, and first campaign suggestion",
    description:
      "Walks the user through a guided interview to capture business context, connects data sources, generates a second brain foundation, and suggests a first campaign.",
    workflow: [
      makeStep(1, "Guided Interview", "Orchestrator", "Conduct onboarding interview"),
      makeStep(2, "Data Connection", "Orchestrator", "Help user connect integrations"),
      makeStep(3, "Second Brain Generation", "Researcher", "Synthesize onboarding data into knowledge objects"),
      makeStep(4, "First Campaign Suggestion", "Campaign Strategist", "Propose an initial campaign"),
    ],
    agents: ["Orchestrator", "Researcher", "Campaign Strategist"],
    tools: ["task-decomposition", "web-search", "data-analysis", "audience-analysis", "channel-planning"],
    quality_bar:
      "Onboarding profile is complete with all required fields. At least one data source connected. Campaign suggestion is actionable.",
    escalation_rules:
      "Escalate to human if user is unresponsive after 2 prompts or if no data sources can be connected.",
  },
  {
    name: "Campaign Planning",
    purpose:
      "Research, strategize, and plan a full marketing campaign from brief to actionable work items",
    description:
      "End-to-end campaign planning: audience research, goal definition, creative brief, timeline, and decomposed work items ready for execution.",
    workflow: [
      makeStep(1, "Research Audience", "Researcher", "Gather audience insights and market trends"),
      makeStep(2, "Define Goals & KPIs", "Campaign Strategist", "Set measurable goals and success criteria"),
      makeStep(3, "Create Campaign Brief", "Campaign Strategist", "Draft comprehensive campaign brief"),
      makeStep(4, "Build Timeline", "Orchestrator", "Create phased timeline with milestones"),
      makeStep(5, "Generate Work Items", "Orchestrator", "Decompose into assignable work items"),
    ],
    agents: ["Researcher", "Campaign Strategist", "Orchestrator"],
    tools: ["web-search", "data-analysis", "audience-analysis", "channel-planning", "competitive-research", "task-decomposition"],
    quality_bar:
      "Brief covers audience, channels, messaging, and KPIs. Timeline has clear milestones. Work items are specific and assignable.",
    escalation_rules:
      "Escalate for human approval before finalizing the campaign brief. Escalate if budget decisions are required.",
  },
  {
    name: "AEO Campaign",
    purpose:
      "Plan and execute an Answer Engine Optimization campaign to increase AI-generated search visibility",
    description:
      "Full AEO workflow: keyword and topic research, strategy development, content creation, QA, optimization, and performance reporting.",
    workflow: [
      makeStep(1, "Keyword & Topic Research", "Researcher", "Identify high-value keywords and topic clusters"),
      makeStep(2, "Strategy Development", "Campaign Strategist", "Define AEO strategy and distribution plan"),
      makeStep(3, "Content Creation", "Content Writer", "Produce optimized content for AI answer engines"),
      makeStep(4, "QA Review", "QA Reviewer", "Review content for accuracy and AEO formatting"),
      makeStep(5, "Optimization", "Optimizer", "Analyze performance and refine content"),
      makeStep(6, "Performance Reporting", "Optimizer", "Compile performance report with recommendations"),
    ],
    agents: ["Researcher", "Campaign Strategist", "Content Writer", "QA Reviewer", "Optimizer"],
    tools: ["web-search", "seo-optimization", "content-generation", "brand-voice-check", "content-review", "analytics-read", "ab-testing", "performance-reporting"],
    quality_bar:
      "Content passes QA review. All content includes proper schema markup. Performance report includes actionable next steps.",
    escalation_rules:
      "Escalate content for human approval before publishing. Escalate if performance drops below baseline after optimization.",
  },
  {
    name: "ABM Campaign",
    purpose:
      "Design and execute an Account-Based Marketing campaign targeting high-value accounts",
    description:
      "End-to-end ABM: account targeting, persona mapping, multi-channel personalized content, execution, and performance analysis.",
    workflow: [
      makeStep(1, "Account Targeting", "Researcher", "Identify and score target accounts"),
      makeStep(2, "Persona Mapping", "Campaign Strategist", "Map buying committee personas"),
      makeStep(3, "Multi-Channel Content", "Content Writer", "Create personalized content per persona"),
      makeStep(4, "Campaign Execution", "Orchestrator", "Coordinate multi-channel launch"),
      makeStep(5, "Performance Analysis", "Optimizer", "Analyze engagement and recommend next plays"),
    ],
    agents: ["Researcher", "Campaign Strategist", "Content Writer", "Orchestrator", "Optimizer"],
    tools: ["web-search", "data-analysis", "audience-analysis", "content-generation", "brand-voice-check", "task-decomposition", "analytics-read", "performance-reporting"],
    quality_bar:
      "Target list is scored and validated. Content is personalized per persona. Performance report includes per-account engagement.",
    escalation_rules:
      "Escalate for human approval on target account list and before launching outbound sequences. Escalate budget decisions.",
  },
  {
    name: "Retro & Optimization",
    purpose:
      "Analyze campaign performance, surface insights, and update the workspace second brain with learnings",
    description:
      "Post-campaign retrospective: pull performance data, analyze results against goals, surface actionable insights, and persist learnings to the second brain.",
    workflow: [
      makeStep(1, "Pull Performance Data", "Researcher", "Aggregate performance data from all sources"),
      makeStep(2, "Analyze Results", "Optimizer", "Compare results against goals and KPIs"),
      makeStep(3, "Surface Insights", "Campaign Strategist", "Distill analysis into strategic insights"),
      makeStep(4, "Update Second Brain", "Orchestrator", "Persist insights to workspace knowledge base"),
    ],
    agents: ["Researcher", "Optimizer", "Campaign Strategist", "Orchestrator"],
    tools: ["analytics-read", "data-analysis", "performance-reporting", "report-generation", "task-decomposition"],
    quality_bar:
      "Analysis covers all defined KPIs. Insights are specific and actionable. At least 3 knowledge objects written back to second brain.",
    escalation_rules:
      "Escalate if performance data is incomplete or if results are significantly below targets.",
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Seeding workspace: ${workspaceId}\n`);

  // Verify workspace exists
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .single();

  if (wsError || !workspace) {
    console.error(`Workspace not found: ${workspaceId}`);
    console.error(wsError?.message ?? "No matching row");
    process.exit(1);
  }

  console.log(`Found workspace: ${workspace.name}\n`);

  // Seed agents
  console.log("--- Seeding Agents ---");
  const agentRows = DEFAULT_AGENTS.map((a) => ({
    workspace_id: workspaceId,
    ...a,
    is_active: true,
  }));

  const { data: agents, error: agentError } = await supabase
    .from("agents")
    .insert(agentRows)
    .select("id, name");

  if (agentError) {
    console.error("Failed to seed agents:", agentError.message);
    process.exit(1);
  }

  for (const agent of agents ?? []) {
    console.log(`  Created agent: ${agent.name} (${agent.id})`);
  }
  console.log(`  Total: ${agents?.length ?? 0} agents\n`);

  // Seed skills
  console.log("--- Seeding Skills ---");
  const skillRows = DEFAULT_SKILLS.map((s) => ({
    workspace_id: workspaceId,
    ...s,
    is_active: true,
  }));

  const { data: skills, error: skillError } = await supabase
    .from("skills")
    .insert(skillRows)
    .select("id, name");

  if (skillError) {
    console.error("Failed to seed skills:", skillError.message);
    process.exit(1);
  }

  for (const skill of skills ?? []) {
    console.log(`  Created skill: ${skill.name} (${skill.id})`);
  }
  console.log(`  Total: ${skills?.length ?? 0} skills\n`);

  // Summary
  console.log("--- Seed Complete ---");
  console.log(`  Workspace: ${workspace.name} (${workspaceId})`);
  console.log(`  Agents:    ${agents?.length ?? 0}`);
  console.log(`  Skills:    ${skills?.length ?? 0}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
