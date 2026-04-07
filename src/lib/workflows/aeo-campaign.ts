/**
 * AEO (AI Engine Optimization) Campaign Workflow
 *
 * Orchestrates a full AEO campaign through 7 steps:
 *   1. Research & Audit
 *   2. Question Mapping
 *   3. Content Planning
 *   4. Content Creation
 *   5. SEO Optimization
 *   6. Review & Approval
 *   7. Publish & Monitor
 *
 * Each step emits progress events so callers can track execution in real time.
 * Works in mock mode when external tools return mock data.
 */

import { logEvent } from "@/lib/events/logger";
import { createHubSpotClient, isHubSpotConfigured } from "@/lib/hubspot/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AEOCampaignInput {
  workspaceId: string;
  initiativeId: string;
  topic: string;
  targetAudience: string;
  goals: string;
  knowledgeContext?: string;
}

export interface AEOCampaignResult {
  status: "completed" | "failed";
  plan?: { title: string; sections: string[] };
  workItems: string[];
  contentDrafts: string[];
  hubspotAssets?: string[];
  approvalId?: string;
  errors: string[];
}

export interface WorkflowEvent {
  type:
    | "step_started"
    | "step_completed"
    | "step_failed"
    | "workflow_completed"
    | "workflow_failed"
    | "approval_required";
  step?: number;
  totalSteps?: number;
  label?: string;
  data?: unknown;
}

export type WorkflowEventHandler = (event: WorkflowEvent) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 7;

function mockId(prefix: string): string {
  return `${prefix}_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Step 1: Research & Audit
// ---------------------------------------------------------------------------

async function stepResearchAndAudit(
  input: AEOCampaignInput,
  onEvent?: WorkflowEventHandler,
): Promise<{ knowledgeResults: string[]; auditFindings: string[] }> {
  onEvent?.({
    type: "step_started",
    step: 1,
    totalSteps: TOTAL_STEPS,
    label: "Research & Audit",
  });

  // In production this calls the orchestrator's searchKnowledge tool to find
  // existing content and brand guidelines in the workspace second brain.
  await delay(600);

  const knowledgeResults = [
    `Brand voice guidelines: bold, clear, human. Lead with insight.`,
    `Existing content inventory: 12 blog posts, 3 pillar pages on related topics.`,
    `Q2 growth strategy: Focus on AEO-driven content for top keywords.`,
    input.knowledgeContext ?? "No additional knowledge context provided.",
  ];

  const auditFindings = [
    `Current AEO score: 42/100 - significant room for improvement.`,
    `Missing FAQ schema on 8 existing pages.`,
    `Competitor "${input.topic}" coverage: 3 competitors have pillar content.`,
    `Top content gaps: How-to guides, comparison pages, FAQ collections.`,
  ];

  onEvent?.({
    type: "step_completed",
    step: 1,
    totalSteps: TOTAL_STEPS,
    label: "Research & Audit",
    data: {
      knowledgeCount: knowledgeResults.length,
      auditFindingCount: auditFindings.length,
      knowledgeResults,
      auditFindings,
    },
  });

  return { knowledgeResults, auditFindings };
}

// ---------------------------------------------------------------------------
// Step 2: Question Mapping
// ---------------------------------------------------------------------------

async function stepQuestionMapping(
  input: AEOCampaignInput,
  auditFindings: string[],
  onEvent?: WorkflowEventHandler,
): Promise<{ questions: Array<{ question: string; intent: string; priority: string; opportunity: string }> }> {
  onEvent?.({
    type: "step_started",
    step: 2,
    totalSteps: TOTAL_STEPS,
    label: "Question Mapping",
  });

  await delay(800);

  // Analyze audience questions and map to content opportunities
  const questions = [
    {
      question: `What is ${input.topic}?`,
      intent: "informational",
      priority: "high",
      opportunity: "Pillar page - definition and comprehensive guide",
    },
    {
      question: `How does ${input.topic} work for ${input.targetAudience}?`,
      intent: "informational",
      priority: "high",
      opportunity: "How-to guide with audience-specific examples",
    },
    {
      question: `Best ${input.topic} strategies in 2026?`,
      intent: "commercial",
      priority: "medium",
      opportunity: "Listicle with expert recommendations",
    },
    {
      question: `${input.topic} vs alternatives?`,
      intent: "commercial",
      priority: "medium",
      opportunity: "Comparison page with structured data",
    },
    {
      question: `How to measure ${input.topic} ROI?`,
      intent: "informational",
      priority: "high",
      opportunity: "Data-driven guide with calculator tool",
    },
  ];

  onEvent?.({
    type: "step_completed",
    step: 2,
    totalSteps: TOTAL_STEPS,
    label: "Question Mapping",
    data: {
      questionCount: questions.length,
      highPriority: questions.filter((q) => q.priority === "high").length,
      questions,
    },
  });

  return { questions };
}

// ---------------------------------------------------------------------------
// Step 3: Content Planning
// ---------------------------------------------------------------------------

async function stepContentPlanning(
  input: AEOCampaignInput,
  questions: Array<{ question: string; intent: string; priority: string; opportunity: string }>,
  onEvent?: WorkflowEventHandler,
): Promise<{ plan: { title: string; sections: string[] }; workItemIds: string[] }> {
  onEvent?.({
    type: "step_started",
    step: 3,
    totalSteps: TOTAL_STEPS,
    label: "Content Planning",
  });

  await delay(700);

  const plan = {
    title: `AEO Campaign: ${input.topic}`,
    sections: [
      "Pillar Page: Comprehensive Guide",
      "FAQ Collection (Schema-Optimized)",
      "How-To Guides (3 pieces)",
      "Comparison & Alternative Pages",
      "Data-Driven ROI Guide",
      "Supporting Blog Posts (5 pieces)",
      "Schema Markup Templates",
    ],
  };

  // Create work items for each content piece via createWorkItem tool
  const workItemTemplates = [
    { title: `Research: ${input.topic} keyword landscape`, type: "task" as const, agent: "Researcher" },
    { title: `Create: Pillar page for ${input.topic}`, type: "deliverable" as const, agent: "Content Writer" },
    { title: `Create: FAQ collection with schema markup`, type: "deliverable" as const, agent: "Content Writer" },
    { title: `Create: How-to guides batch (3 pieces)`, type: "deliverable" as const, agent: "Content Writer" },
    { title: `Create: Comparison and alternatives page`, type: "deliverable" as const, agent: "Content Writer" },
    { title: `Create: Supporting blog posts (5 pieces)`, type: "deliverable" as const, agent: "Content Writer" },
    { title: `Optimize: Apply AEO schema markup across all content`, type: "task" as const, agent: "Optimizer" },
    { title: `Review: QA all content drafts`, type: "approval" as const, agent: "QA Reviewer" },
  ];

  const workItemIds = workItemTemplates.map(() => mockId("wi"));

  onEvent?.({
    type: "step_completed",
    step: 3,
    totalSteps: TOTAL_STEPS,
    label: "Content Planning",
    data: {
      plan,
      workItemCount: workItemIds.length,
      items: workItemTemplates.map((t, i) => ({ id: workItemIds[i], title: t.title })),
    },
  });

  return { plan, workItemIds };
}

// ---------------------------------------------------------------------------
// Step 4: Content Creation
// ---------------------------------------------------------------------------

async function stepContentCreation(
  input: AEOCampaignInput,
  plan: { title: string; sections: string[] },
  onEvent?: WorkflowEventHandler,
): Promise<{ contentDrafts: Array<{ id: string; title: string; type: string; wordCount: number }> }> {
  onEvent?.({
    type: "step_started",
    step: 4,
    totalSteps: TOTAL_STEPS,
    label: "Content Creation",
  });

  // In production this calls the generateContent tool for each content piece
  await delay(1200);

  const contentDrafts = [
    { id: mockId("draft"), title: `The Complete Guide to ${input.topic}`, type: "pillar_page", wordCount: 3500 },
    { id: mockId("draft"), title: `${input.topic} FAQ: Top 20 Questions Answered`, type: "faq_page", wordCount: 2800 },
    { id: mockId("draft"), title: `How to Get Started with ${input.topic}`, type: "how_to", wordCount: 1800 },
    { id: mockId("draft"), title: `${input.topic}: What Every ${input.targetAudience} Needs to Know`, type: "blog_post", wordCount: 1500 },
    { id: mockId("draft"), title: `${input.topic} vs Traditional Approaches: A Comparison`, type: "comparison", wordCount: 2000 },
  ];

  onEvent?.({
    type: "step_completed",
    step: 4,
    totalSteps: TOTAL_STEPS,
    label: "Content Creation",
    data: {
      draftCount: contentDrafts.length,
      totalWordCount: contentDrafts.reduce((sum, d) => sum + d.wordCount, 0),
      drafts: contentDrafts,
    },
  });

  return { contentDrafts };
}

// ---------------------------------------------------------------------------
// Step 5: SEO Optimization
// ---------------------------------------------------------------------------

async function stepSEOOptimization(
  input: AEOCampaignInput,
  contentDrafts: Array<{ id: string; title: string; type: string; wordCount: number }>,
  onEvent?: WorkflowEventHandler,
): Promise<{ optimizations: Array<{ draftId: string; schemaType: string; faqCount: number; aeoScore: number }> }> {
  onEvent?.({
    type: "step_started",
    step: 5,
    totalSteps: TOTAL_STEPS,
    label: "SEO Optimization",
  });

  // Apply AEO-specific optimizations: schema markup, FAQ structure, featured snippet formatting
  await delay(900);

  const optimizations = contentDrafts.map((draft) => ({
    draftId: draft.id,
    schemaType: draft.type === "faq_page" ? "FAQPage" : draft.type === "how_to" ? "HowTo" : "Article",
    faqCount: draft.type === "faq_page" ? 20 : Math.floor(Math.random() * 5) + 3,
    aeoScore: 75 + Math.floor(Math.random() * 20),
  }));

  onEvent?.({
    type: "step_completed",
    step: 5,
    totalSteps: TOTAL_STEPS,
    label: "SEO Optimization",
    data: {
      optimizedCount: optimizations.length,
      averageAEOScore: Math.round(optimizations.reduce((s, o) => s + o.aeoScore, 0) / optimizations.length),
      optimizations,
    },
  });

  return { optimizations };
}

// ---------------------------------------------------------------------------
// Step 6: Review & Approval
// ---------------------------------------------------------------------------

async function stepReviewAndApproval(
  input: AEOCampaignInput,
  contentDrafts: Array<{ id: string; title: string; type: string; wordCount: number }>,
  onEvent?: WorkflowEventHandler,
): Promise<{ approvalId: string }> {
  onEvent?.({
    type: "step_started",
    step: 6,
    totalSteps: TOTAL_STEPS,
    label: "Review & Approval",
  });

  // Run QA review on all content, then create approval request via requestApproval tool
  await delay(800);

  const approvalId = mockId("apr");

  onEvent?.({
    type: "approval_required",
    step: 6,
    totalSteps: TOTAL_STEPS,
    label: "Review & Approval",
    data: {
      approvalId,
      title: `Approve AEO Campaign: ${input.topic}`,
      description: `${contentDrafts.length} content pieces targeting "${input.targetAudience}" have been drafted, optimized, and reviewed. Ready for publishing approval.`,
      category: "content",
      contentCount: contentDrafts.length,
      reviewResults: {
        passed: contentDrafts.length,
        issues: 0,
      },
    },
  });

  onEvent?.({
    type: "step_completed",
    step: 6,
    totalSteps: TOTAL_STEPS,
    label: "Review & Approval",
    data: { approvalId, reviewed: contentDrafts.length, passed: contentDrafts.length },
  });

  return { approvalId };
}

// ---------------------------------------------------------------------------
// Step 7: Publish & Monitor
// ---------------------------------------------------------------------------

async function stepPublishAndMonitor(
  input: AEOCampaignInput,
  contentDrafts: Array<{ id: string; title: string; type: string; wordCount: number }>,
  onEvent?: WorkflowEventHandler,
): Promise<string[]> {
  onEvent?.({
    type: "step_started",
    step: 7,
    totalSteps: TOTAL_STEPS,
    label: "Publish & Monitor",
  });

  await delay(700);

  let hubspotAssets: string[] = [];

  // If HubSpot is configured, create real draft assets; otherwise mock
  if (isHubSpotConfigured) {
    try {
      const client = createHubSpotClient("placeholder-token");
      const blogPost = await client.createDraftBlogPost({
        name: `AEO: ${input.topic}`,
        contentGroupId: "default",
        slug: input.topic.toLowerCase().replace(/\s+/g, "-"),
        htmlBody: `<p>Draft AEO pillar content for ${input.topic}</p>`,
        metaDescription: `Learn about ${input.topic} -- optimized for AI engine visibility.`,
      });
      hubspotAssets = [blogPost.id];
    } catch (err) {
      const msg = err instanceof Error ? err.message : "HubSpot API error";
      onEvent?.({
        type: "step_failed",
        step: 7,
        totalSteps: TOTAL_STEPS,
        label: "Publish & Monitor",
        data: { error: msg, fallback: "mock" },
      });
      // Fall through to mock path
    }
  }

  // Mock path (or fallback)
  if (hubspotAssets.length === 0) {
    hubspotAssets = contentDrafts.map(() => mockId("hs-asset"));
  }

  onEvent?.({
    type: "step_completed",
    step: 7,
    totalSteps: TOTAL_STEPS,
    label: "Publish & Monitor",
    data: {
      publishedCount: hubspotAssets.length,
      hubspotIds: hubspotAssets,
      monitoringEnabled: true,
      mock: !isHubSpotConfigured,
    },
  });

  return hubspotAssets;
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function runAEOCampaign(
  input: AEOCampaignInput,
  onEvent?: WorkflowEventHandler,
): Promise<AEOCampaignResult> {
  const errors: string[] = [];
  let plan: AEOCampaignResult["plan"];
  let workItems: string[] = [];
  let contentDraftIds: string[] = [];
  let hubspotAssets: string[] = [];
  let approvalId: string | undefined;

  try {
    // 1. Research & Audit -- searchKnowledge tool
    const { auditFindings } = await stepResearchAndAudit(input, onEvent);

    // 2. Question Mapping -- analyze audience questions
    const { questions } = await stepQuestionMapping(input, auditFindings, onEvent);

    // 3. Content Planning -- createWorkItem tool
    const planResult = await stepContentPlanning(input, questions, onEvent);
    plan = planResult.plan;
    workItems = planResult.workItemIds;

    // 4. Content Creation -- generateContent tool
    const { contentDrafts } = await stepContentCreation(input, plan, onEvent);
    contentDraftIds = contentDrafts.map((d) => d.id);

    // 5. SEO Optimization -- AEO-specific schema markup, FAQ structure
    await stepSEOOptimization(input, contentDrafts, onEvent);

    // 6. Review & Approval -- requestApproval tool
    const approval = await stepReviewAndApproval(input, contentDrafts, onEvent);
    approvalId = approval.approvalId;

    // 7. Publish & Monitor -- final publishing step
    hubspotAssets = await stepPublishAndMonitor(input, contentDrafts, onEvent);

    // Log workflow completion
    await logEvent({
      workspaceId: input.workspaceId,
      type: "skill.executed",
      actorType: "system",
      actorId: "workflow-aeo-campaign",
      entityType: "initiative",
      entityId: input.initiativeId,
      metadata: {
        workflow: "aeo_campaign",
        topic: input.topic,
        workItemCount: workItems.length,
        draftCount: contentDraftIds.length,
        hubspotAssetCount: hubspotAssets.length,
      },
    }).catch(() => {});

    onEvent?.({
      type: "workflow_completed",
      data: {
        workItems: workItems.length,
        contentDrafts: contentDraftIds.length,
        hubspotAssets: hubspotAssets.length,
        approvalId,
      },
    });

    return {
      status: "completed",
      plan,
      workItems,
      contentDrafts: contentDraftIds,
      hubspotAssets,
      approvalId,
      errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown workflow error";
    errors.push(msg);

    onEvent?.({
      type: "workflow_failed",
      data: { error: msg },
    });

    return {
      status: "failed",
      plan,
      workItems,
      contentDrafts: contentDraftIds,
      hubspotAssets,
      approvalId,
      errors,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
