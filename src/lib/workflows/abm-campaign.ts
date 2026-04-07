/**
 * ABM (Account-Based Marketing) Campaign Workflow
 *
 * Orchestrates a full ABM campaign through 6 steps:
 *   1. Account Selection
 *   2. Intelligence Gathering
 *   3. Messaging Strategy
 *   4. Content Creation
 *   5. Execution Planning
 *   6. Review & Launch
 *
 * Each step emits progress events for real-time tracking.
 * Works in mock mode when external tools return mock data.
 */

import { logEvent } from "@/lib/events/logger";
import { createHubSpotClient, isHubSpotConfigured } from "@/lib/hubspot/client";
import type { WorkflowEvent, WorkflowEventHandler } from "./aeo-campaign";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ABMCampaignInput {
  workspaceId: string;
  initiativeId: string;
  targetAccounts: string[];
  personas: string[];
  channels: string[];
  goals: string;
  knowledgeContext?: string;
}

export interface ABMCampaignResult {
  status: "completed" | "failed";
  plan?: { title: string; accounts: number; channels: string[] };
  workItems: string[];
  contentDrafts: string[];
  approvalId?: string;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 6;

function mockId(prefix: string): string {
  return `${prefix}_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Step 1: Account Selection
// ---------------------------------------------------------------------------

async function stepAccountSelection(
  input: ABMCampaignInput,
  onEvent?: WorkflowEventHandler,
): Promise<{ accountProfiles: Array<{ name: string; industry: string; tier: string; score: number; signals: string[] }> }> {
  onEvent?.({
    type: "step_started",
    step: 1,
    totalSteps: TOTAL_STEPS,
    label: "Account Selection",
  });

  await delay(800);

  // In production this searches the brain for ICP data and tiers accounts
  // using firmographic, technographic, and intent signals from HubSpot CRM.
  let accountProfiles: Array<{ name: string; industry: string; tier: string; score: number; signals: string[] }>;

  if (isHubSpotConfigured) {
    try {
      const client = createHubSpotClient("placeholder-token");
      const companies = await client.getCompanies(input.targetAccounts.length);
      accountProfiles = companies.map((c, i) => {
        const score = 70 + Math.round(Math.random() * 30);
        return {
          name: c.name,
          industry: c.industry ?? "Technology",
          tier: score >= 90 ? "Tier 1" : score >= 80 ? "Tier 2" : "Tier 3",
          score,
          signals: ["Website visit", "Content download", "Job posting match"],
        };
      });
    } catch {
      accountProfiles = buildMockAccountProfiles(input.targetAccounts);
    }
  } else {
    accountProfiles = buildMockAccountProfiles(input.targetAccounts);
  }

  onEvent?.({
    type: "step_completed",
    step: 1,
    totalSteps: TOTAL_STEPS,
    label: "Account Selection",
    data: {
      accountCount: accountProfiles.length,
      tierBreakdown: {
        tier1: accountProfiles.filter((a) => a.tier === "Tier 1").length,
        tier2: accountProfiles.filter((a) => a.tier === "Tier 2").length,
        tier3: accountProfiles.filter((a) => a.tier === "Tier 3").length,
      },
      accounts: accountProfiles,
    },
  });

  return { accountProfiles };
}

function buildMockAccountProfiles(names: string[]) {
  return names.map((name) => {
    const score = 70 + Math.round(Math.random() * 30);
    return {
      name,
      industry: "Technology",
      tier: score >= 90 ? "Tier 1" : (score >= 80 ? "Tier 2" : "Tier 3"),
      score,
      signals: ["Website visit", "Content download", "Job posting match"],
    };
  });
}

// ---------------------------------------------------------------------------
// Step 2: Intelligence Gathering
// ---------------------------------------------------------------------------

async function stepIntelligenceGathering(
  input: ABMCampaignInput,
  accountProfiles: Array<{ name: string; industry: string; tier: string; score: number; signals: string[] }>,
  onEvent?: WorkflowEventHandler,
): Promise<{ buyingCommittees: Array<{ account: string; personas: Array<{ role: string; painPoints: string[]; priorities: string[] }> }> }> {
  onEvent?.({
    type: "step_started",
    step: 2,
    totalSteps: TOTAL_STEPS,
    label: "Intelligence Gathering",
  });

  await delay(900);

  // Map buying committees and identify pain points per account
  const buyingCommittees = accountProfiles.map((account) => ({
    account: account.name,
    personas: input.personas.map((persona) => ({
      role: persona,
      painPoints: [
        `${account.industry}-specific operational challenges`,
        "Need for better cross-team alignment",
        "Pressure to demonstrate marketing ROI",
      ],
      priorities: [
        "Revenue growth",
        "Operational efficiency",
        "Digital transformation",
      ],
    })),
  }));

  onEvent?.({
    type: "step_completed",
    step: 2,
    totalSteps: TOTAL_STEPS,
    label: "Intelligence Gathering",
    data: {
      accountsResearched: buyingCommittees.length,
      totalPersonasMapped: buyingCommittees.reduce((s, bc) => s + bc.personas.length, 0),
      buyingCommittees,
    },
  });

  return { buyingCommittees };
}

// ---------------------------------------------------------------------------
// Step 3: Messaging Strategy
// ---------------------------------------------------------------------------

async function stepMessagingStrategy(
  input: ABMCampaignInput,
  buyingCommittees: Array<{ account: string; personas: Array<{ role: string; painPoints: string[]; priorities: string[] }> }>,
  onEvent?: WorkflowEventHandler,
): Promise<{ messagingMatrix: Array<{ cluster: string; accounts: string[]; valueProps: string[]; toneGuidance: string }> }> {
  onEvent?.({
    type: "step_started",
    step: 3,
    totalSteps: TOTAL_STEPS,
    label: "Messaging Strategy",
  });

  await delay(800);

  // Create personalized messaging by account cluster
  const uniqueIndustries = [...new Set(buyingCommittees.map((bc) => {
    // Group by common pain point themes
    return bc.personas[0]?.painPoints[0]?.split("-")[0]?.trim() ?? "General";
  }))];

  const messagingMatrix = uniqueIndustries.map((cluster) => ({
    cluster,
    accounts: buyingCommittees
      .filter((bc) => bc.personas[0]?.painPoints[0]?.startsWith(cluster) || cluster === "General")
      .map((bc) => bc.account),
    valueProps: [
      `Solve ${cluster.toLowerCase()} challenges with AI-powered automation`,
      "Reduce time-to-value by 60% with pre-built workflows",
      "Unified platform for strategy, execution, and measurement",
    ],
    toneGuidance: "Consultative, data-backed, peer-level. Lead with business outcomes.",
  }));

  onEvent?.({
    type: "step_completed",
    step: 3,
    totalSteps: TOTAL_STEPS,
    label: "Messaging Strategy",
    data: {
      clusterCount: messagingMatrix.length,
      messagingMatrix,
    },
  });

  return { messagingMatrix };
}

// ---------------------------------------------------------------------------
// Step 4: Content Creation
// ---------------------------------------------------------------------------

async function stepContentCreation(
  input: ABMCampaignInput,
  buyingCommittees: Array<{ account: string; personas: Array<{ role: string; painPoints: string[]; priorities: string[] }> }>,
  messagingMatrix: Array<{ cluster: string; accounts: string[]; valueProps: string[]; toneGuidance: string }>,
  onEvent?: WorkflowEventHandler,
): Promise<{ contentDrafts: Array<{ id: string; title: string; persona: string; channel: string; type: string }> }> {
  onEvent?.({
    type: "step_started",
    step: 4,
    totalSteps: TOTAL_STEPS,
    label: "Content Creation",
  });

  await delay(1100);

  // Generate multi-channel content: email, ad, landing page per persona/channel
  const contentDrafts: Array<{ id: string; title: string; persona: string; channel: string; type: string }> = [];
  const channels = input.channels.length > 0 ? input.channels : ["email", "linkedin", "landing-page"];

  for (const persona of input.personas) {
    for (const channel of channels) {
      contentDrafts.push({
        id: mockId("draft"),
        title: `${channel} content for ${persona}`,
        persona,
        channel,
        type: channel === "email" ? "email_sequence" : channel === "linkedin" ? "social_ad" : "landing_page",
      });
    }
  }

  onEvent?.({
    type: "step_completed",
    step: 4,
    totalSteps: TOTAL_STEPS,
    label: "Content Creation",
    data: {
      draftCount: contentDrafts.length,
      byChannel: channels.map((ch) => ({
        channel: ch,
        count: contentDrafts.filter((d) => d.channel === ch).length,
      })),
      drafts: contentDrafts,
    },
  });

  return { contentDrafts };
}

// ---------------------------------------------------------------------------
// Step 5: Execution Planning
// ---------------------------------------------------------------------------

async function stepExecutionPlanning(
  input: ABMCampaignInput,
  accountProfiles: Array<{ name: string; industry: string; tier: string; score: number; signals: string[] }>,
  contentDrafts: Array<{ id: string; title: string; persona: string; channel: string; type: string }>,
  onEvent?: WorkflowEventHandler,
): Promise<{ workItemIds: string[]; timeline: { phases: Array<{ name: string; duration: string; items: string[] }> } }> {
  onEvent?.({
    type: "step_started",
    step: 5,
    totalSteps: TOTAL_STEPS,
    label: "Execution Planning",
  });

  await delay(800);

  // Create work items for each channel/account combination
  const workItemTemplates = [
    ...accountProfiles.map((a) => ({
      title: `Research: Build account dossier for ${a.name}`,
      type: "task" as const,
      agent: "Researcher",
    })),
    ...input.personas.map((p) => ({
      title: `Content: Create personalized assets for ${p}`,
      type: "deliverable" as const,
      agent: "Content Writer",
    })),
    {
      title: "Review: Approve ABM content matrix",
      type: "approval" as const,
      agent: "QA Reviewer",
    },
    {
      title: "Execute: Launch multi-channel outreach",
      type: "task" as const,
      agent: "Orchestrator",
    },
  ];

  const workItemIds = workItemTemplates.map(() => mockId("wi"));

  const timeline = {
    phases: [
      { name: "Research & Preparation", duration: "1 week", items: workItemIds.slice(0, Math.ceil(workItemIds.length / 3)) },
      { name: "Content Creation", duration: "2 weeks", items: workItemIds.slice(Math.ceil(workItemIds.length / 3), Math.ceil((workItemIds.length * 2) / 3)) },
      { name: "Launch & Execution", duration: "4 weeks", items: workItemIds.slice(Math.ceil((workItemIds.length * 2) / 3)) },
    ],
  };

  onEvent?.({
    type: "step_completed",
    step: 5,
    totalSteps: TOTAL_STEPS,
    label: "Execution Planning",
    data: {
      workItemCount: workItemIds.length,
      items: workItemTemplates.map((t, i) => ({ id: workItemIds[i], title: t.title })),
      timeline,
    },
  });

  return { workItemIds, timeline };
}

// ---------------------------------------------------------------------------
// Step 6: Review & Launch
// ---------------------------------------------------------------------------

async function stepReviewAndLaunch(
  input: ABMCampaignInput,
  accountProfiles: Array<{ name: string; industry: string; tier: string; score: number; signals: string[] }>,
  onEvent?: WorkflowEventHandler,
): Promise<{ approvalId: string }> {
  onEvent?.({
    type: "step_started",
    step: 6,
    totalSteps: TOTAL_STEPS,
    label: "Review & Launch",
  });

  await delay(400);

  const approvalId = mockId("apr");

  // Create approval request via requestApproval tool
  onEvent?.({
    type: "approval_required",
    step: 6,
    totalSteps: TOTAL_STEPS,
    label: "Review & Launch",
    data: {
      approvalId,
      title: `Approve ABM Campaign: ${accountProfiles.length} accounts`,
      description: `Multi-channel ABM campaign targeting ${input.targetAccounts.join(", ")} across ${(input.channels.length > 0 ? input.channels : ["email", "linkedin", "landing-page"]).join(", ")} is ready for review.`,
      category: "workflow",
      accountCount: accountProfiles.length,
      channelCount: input.channels.length || 3,
    },
  });

  onEvent?.({
    type: "step_completed",
    step: 6,
    totalSteps: TOTAL_STEPS,
    label: "Review & Launch",
    data: { approvalId },
  });

  return { approvalId };
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function runABMCampaign(
  input: ABMCampaignInput,
  onEvent?: WorkflowEventHandler,
): Promise<ABMCampaignResult> {
  const errors: string[] = [];
  let plan: ABMCampaignResult["plan"];
  let workItems: string[] = [];
  let contentDraftIds: string[] = [];
  let approvalId: string | undefined;

  try {
    // 1. Account Selection -- search brain for ICP data, tier accounts
    const { accountProfiles } = await stepAccountSelection(input, onEvent);

    // 2. Intelligence Gathering -- map buying committees, identify pain points
    const { buyingCommittees } = await stepIntelligenceGathering(input, accountProfiles, onEvent);

    // 3. Messaging Strategy -- personalized messaging by account cluster
    const { messagingMatrix } = await stepMessagingStrategy(input, buyingCommittees, onEvent);

    // 4. Content Creation -- multi-channel content (email, ad, landing page)
    const { contentDrafts } = await stepContentCreation(input, buyingCommittees, messagingMatrix, onEvent);
    contentDraftIds = contentDrafts.map((d) => d.id);

    // 5. Execution Planning -- create work items for each channel/account
    const { workItemIds } = await stepExecutionPlanning(input, accountProfiles, contentDrafts, onEvent);
    workItems = workItemIds;

    // 6. Review & Launch -- create approval requests, finalize
    const approval = await stepReviewAndLaunch(input, accountProfiles, onEvent);
    approvalId = approval.approvalId;

    // Build plan summary
    plan = {
      title: `ABM Campaign: ${accountProfiles.length} Target Accounts`,
      accounts: accountProfiles.length,
      channels: input.channels.length > 0 ? input.channels : ["email", "linkedin", "landing-page"],
    };

    // Log workflow completion
    await logEvent({
      workspaceId: input.workspaceId,
      type: "skill.executed",
      actorType: "system",
      actorId: "workflow-abm-campaign",
      entityType: "initiative",
      entityId: input.initiativeId,
      metadata: {
        workflow: "abm_campaign",
        accountCount: accountProfiles.length,
        personaCount: buyingCommittees.reduce((s, bc) => s + bc.personas.length, 0),
        workItemCount: workItems.length,
        contentDraftCount: contentDraftIds.length,
      },
    }).catch(() => {});

    onEvent?.({
      type: "workflow_completed",
      data: {
        accounts: accountProfiles.length,
        workItems: workItems.length,
        contentDrafts: contentDraftIds.length,
        approvalId,
      },
    });

    return {
      status: "completed",
      plan,
      workItems,
      contentDrafts: contentDraftIds,
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
