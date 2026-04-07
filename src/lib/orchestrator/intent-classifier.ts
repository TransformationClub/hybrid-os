/**
 * Intent Classifier
 *
 * Classifies user messages into intents using keyword matching and
 * simple heuristics. No LLM call required. Each intent maps to
 * suggested tools, relevant agents, and recommended actions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Intent =
  | "campaign_planning"
  | "content_creation"
  | "knowledge_search"
  | "workflow_execution"
  | "approval_management"
  | "reporting"
  | "general_conversation";

export interface IntentResult {
  intent: Intent;
  confidence: number;
  suggestedTools: string[];
  suggestedAction: string;
}

// ---------------------------------------------------------------------------
// Intent rules: keywords, tools, agents, and actions
// ---------------------------------------------------------------------------

interface IntentRule {
  intent: Intent;
  keywords: string[];
  /** Phrases that boost confidence when found as a complete match */
  phrases: string[];
  suggestedTools: string[];
  suggestedAction: string;
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: "campaign_planning",
    keywords: [
      "campaign",
      "abm",
      "launch",
      "audience",
      "target",
      "segment",
      "channel",
      "plan",
      "strategy",
      "initiative",
      "roadmap",
      "timeline",
      "budget",
      "allocat",
    ],
    phrases: [
      "campaign plan",
      "launch campaign",
      "target audience",
      "go to market",
      "marketing plan",
      "campaign strategy",
    ],
    suggestedTools: ["createWorkItem", "searchKnowledge", "requestApproval"],
    suggestedAction: "Plan and structure a marketing campaign",
  },
  {
    intent: "content_creation",
    keywords: [
      "write",
      "draft",
      "blog",
      "email",
      "social",
      "post",
      "copy",
      "headline",
      "article",
      "whitepaper",
      "case study",
      "landing page",
      "content",
      "generate",
      "create",
      "ad",
    ],
    phrases: [
      "write a blog",
      "draft an email",
      "social post",
      "ad copy",
      "landing page",
      "case study",
      "content brief",
      "generate content",
    ],
    suggestedTools: ["generateContent", "searchKnowledge"],
    suggestedAction: "Generate or refine content deliverables",
  },
  {
    intent: "knowledge_search",
    keywords: [
      "find",
      "search",
      "look up",
      "what is",
      "what are",
      "where",
      "who",
      "brand",
      "guideline",
      "playbook",
      "reference",
      "documentation",
      "knowledge",
    ],
    phrases: [
      "brand guidelines",
      "search the brain",
      "look up",
      "find information",
      "what do we know",
      "second brain",
    ],
    suggestedTools: ["searchKnowledge"],
    suggestedAction: "Search the knowledge base for relevant information",
  },
  {
    intent: "workflow_execution",
    keywords: [
      "run",
      "execute",
      "trigger",
      "workflow",
      "skill",
      "automate",
      "automation",
      "process",
      "sequence",
      "pipeline",
    ],
    phrases: [
      "run the skill",
      "execute workflow",
      "trigger automation",
      "start the process",
      "run skill",
    ],
    suggestedTools: ["createWorkItem", "updateWorkItem"],
    suggestedAction: "Execute a skill or workflow",
  },
  {
    intent: "approval_management",
    keywords: [
      "approve",
      "reject",
      "approval",
      "review",
      "pending",
      "sign off",
      "authorize",
      "permission",
    ],
    phrases: [
      "pending approvals",
      "approve this",
      "reject this",
      "needs approval",
      "sign off on",
      "review and approve",
    ],
    suggestedTools: ["requestApproval"],
    suggestedAction: "Manage approval requests",
  },
  {
    intent: "reporting",
    keywords: [
      "report",
      "metric",
      "analytics",
      "performance",
      "dashboard",
      "kpi",
      "conversion",
      "roi",
      "traffic",
      "engagement",
      "stats",
      "data",
      "numbers",
    ],
    phrases: [
      "how is the campaign performing",
      "show me the numbers",
      "performance report",
      "conversion rate",
      "give me a report",
    ],
    suggestedTools: ["searchKnowledge"],
    suggestedAction: "Generate or retrieve performance reports",
  },
];

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/**
 * Classify a user message into an intent.
 *
 * Uses keyword frequency and phrase matching to score each intent,
 * then returns the highest-scoring one. Falls back to
 * `general_conversation` if no intent scores above the threshold.
 */
export function classify(message: string): IntentResult {
  const lower = message.toLowerCase();
  const words = lower.split(/\s+/);

  let bestScore = 0;
  let bestRule: IntentRule | null = null;

  for (const rule of INTENT_RULES) {
    let score = 0;

    // Keyword hits (each keyword match adds 1 point)
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        score += 1;
      }
    }

    // Phrase hits (each phrase match adds 3 points -- stronger signal)
    for (const phrase of rule.phrases) {
      if (lower.includes(phrase)) {
        score += 3;
      }
    }

    // Bonus for question patterns that suggest search intent
    if (
      rule.intent === "knowledge_search" &&
      /^(what|where|who|how|why|can you find|do we have)\b/.test(lower)
    ) {
      score += 2;
    }

    // Bonus for imperative verbs that suggest execution
    if (
      rule.intent === "workflow_execution" &&
      /^(run|execute|trigger|start|launch)\b/.test(lower)
    ) {
      score += 2;
    }

    // Normalize by keyword count to avoid bias toward rules with more keywords
    const normalizedScore = rule.keywords.length > 0
      ? score / Math.sqrt(rule.keywords.length)
      : 0;

    if (normalizedScore > bestScore) {
      bestScore = normalizedScore;
      bestRule = rule;
    }
  }

  // Minimum threshold to classify as a specific intent
  const CONFIDENCE_THRESHOLD = 0.5;

  if (bestRule && bestScore >= CONFIDENCE_THRESHOLD) {
    // Map score to a 0-1 confidence range (cap at 0.95)
    const confidence = Math.min(0.95, bestScore / 5);

    return {
      intent: bestRule.intent,
      confidence,
      suggestedTools: bestRule.suggestedTools,
      suggestedAction: bestRule.suggestedAction,
    };
  }

  // Fallback
  return {
    intent: "general_conversation",
    confidence: 0.3,
    suggestedTools: [],
    suggestedAction: "Respond conversationally",
  };
}

/**
 * Returns a system prompt hint string for the classified intent.
 * This helps the LLM focus its response on the right domain.
 */
export function intentToPromptHint(result: IntentResult): string {
  const hints: Record<Intent, string> = {
    campaign_planning:
      "The user appears to be planning or discussing a marketing campaign. Focus on strategy, audiences, channels, and timelines. Suggest creating work items to track deliverables.",
    content_creation:
      "The user wants to create or refine content. Focus on drafting, tone, audience fit, and brand alignment. Use the generateContent tool when appropriate.",
    knowledge_search:
      "The user is looking for information. Search the knowledge base first, then synthesize a clear answer from what you find.",
    workflow_execution:
      "The user wants to run or trigger a workflow or skill. Help them configure inputs and confirm before executing.",
    approval_management:
      "The user is managing approvals. Help them review, approve, or reject pending items efficiently.",
    reporting:
      "The user wants performance data or reports. Focus on metrics, trends, and actionable insights.",
    general_conversation:
      "Respond naturally. If the conversation shifts toward a specific marketing task, offer to help with the relevant tools.",
  };

  return hints[result.intent];
}
