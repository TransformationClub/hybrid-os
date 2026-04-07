// ============================================================
// Centralized mock data for Hybrid OS
// Used as fallback when Supabase is not configured.
// ============================================================

import type {
  Initiative,
  WorkItem,
  Approval,
  Agent,
  Skill,
  KnowledgeObject,
  AppEvent,
  ChatMessage,
  AgentRun,
} from "@/types";

// ===========================================================================
// Initiatives
// ===========================================================================

/**
 * Display-enriched initiative for use on the initiatives list page.
 * Extends the core Initiative type with UI-specific fields.
 */
export interface InitiativeCardData {
  id: string;
  title: string;
  type: Initiative["type"];
  status: Initiative["status"];
  goal: string;
  progress: number;
  lastActivity: string;
  agents: { initials: string; color: string }[];
}

export const mockInitiativeCards: InitiativeCardData[] = [
  {
    id: "init-001",
    title: "Q2 AEO Content Blitz",
    type: "aeo-campaign",
    status: "active",
    goal: "Capture 15 high-intent AI Engine queries with optimized content across 8 product categories.",
    progress: 62,
    lastActivity: "12 min ago",
    agents: [
      { initials: "CO", color: "bg-indigo-500 text-white" },
      { initials: "CW", color: "bg-violet-500 text-white" },
      { initials: "SE", color: "bg-sky-500 text-white" },
    ],
  },
  {
    id: "init-002",
    title: "Enterprise ABM - Acme Corp",
    type: "abm-campaign",
    status: "active",
    goal: "Multi-touch ABM play targeting Acme Corp buying committee across 6 personas.",
    progress: 38,
    lastActivity: "1 hr ago",
    agents: [
      { initials: "CO", color: "bg-indigo-500 text-white" },
      { initials: "AB", color: "bg-emerald-500 text-white" },
    ],
  },
  {
    id: "init-003",
    title: "Product-Led Growth Loop",
    type: "custom",
    status: "planning",
    goal: "Design and deploy an in-app referral loop that increases viral coefficient by 1.4x.",
    progress: 15,
    lastActivity: "3 hr ago",
    agents: [
      { initials: "CO", color: "bg-indigo-500 text-white" },
      { initials: "PM", color: "bg-amber-500 text-white" },
      { initials: "DA", color: "bg-rose-500 text-white" },
    ],
  },
  {
    id: "init-004",
    title: "Brand Awareness Sprint",
    type: "custom",
    status: "draft",
    goal: "Launch a 4-week awareness push across LinkedIn, podcast sponsorships, and co-marketing.",
    progress: 0,
    lastActivity: "2 days ago",
    agents: [{ initials: "CO", color: "bg-indigo-500 text-white" }],
  },
  {
    id: "init-005",
    title: "Q1 AEO Audit & Refresh",
    type: "aeo-campaign",
    status: "completed",
    goal: "Audit all existing AEO content and refresh underperforming pages to regain citation share.",
    progress: 100,
    lastActivity: "1 week ago",
    agents: [
      { initials: "CO", color: "bg-indigo-500 text-white" },
      { initials: "SE", color: "bg-sky-500 text-white" },
    ],
  },
];

// ===========================================================================
// Home page - Approvals queue (display-enriched)
// ===========================================================================

export interface ApprovalCardData {
  id: string;
  title: string;
  initiative: string;
  category: "content" | "communication" | "execution" | "workflow" | "integration";
  requestedBy: { name: string; initials: string; isAgent: boolean };
  timeAgo: string;
}

export const mockApprovalCards: ApprovalCardData[] = [
  {
    id: "apr-1",
    title: "Q2 ABM LinkedIn Ad Copy",
    initiative: "ABM Enterprise Push",
    category: "content",
    requestedBy: { name: "Campaign Agent", initials: "CA", isAgent: true },
    timeAgo: "12 min ago",
  },
  {
    id: "apr-2",
    title: "Pricing page hero rewrite",
    initiative: "Website Refresh",
    category: "content",
    requestedBy: { name: "Content Agent", initials: "CO", isAgent: true },
    timeAgo: "1 hr ago",
  },
  {
    id: "apr-3",
    title: "Launch email sequence (3 emails)",
    initiative: "Product Launch v3.2",
    category: "communication",
    requestedBy: { name: "Email Agent", initials: "EA", isAgent: true },
    timeAgo: "2 hr ago",
  },
  {
    id: "apr-4",
    title: "Outbound SDR call script update",
    initiative: "ABM Enterprise Push",
    category: "execution",
    requestedBy: { name: "Sarah Kim", initials: "SK", isAgent: false },
    timeAgo: "3 hr ago",
  },
];

// ===========================================================================
// Home page - Activity feed (display-enriched)
// ===========================================================================

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  CheckCircle2,
  Brain,
  Zap,
  FileText,
  Target,
} from "lucide-react";

export interface ActivityFeedItem {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  description: string;
  timestamp: string;
}

export const mockActivityFeed: ActivityFeedItem[] = [
  {
    id: "ev-1",
    icon: Bot,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    description: "Campaign Agent completed ABM target account scoring",
    timestamp: "8 min ago",
  },
  {
    id: "ev-2",
    icon: CheckCircle2,
    iconColor: "text-success",
    iconBg: "bg-success/10",
    description: "You approved the Q2 content calendar",
    timestamp: "42 min ago",
  },
  {
    id: "ev-3",
    icon: Brain,
    iconColor: "text-info",
    iconBg: "bg-info/10",
    description: "Second Brain updated with new competitor analysis",
    timestamp: "1 hr ago",
  },
  {
    id: "ev-4",
    icon: Zap,
    iconColor: "text-warning",
    iconBg: "bg-warning/10",
    description: "Skill 'weekly-brief' executed successfully",
    timestamp: "2 hr ago",
  },
  {
    id: "ev-5",
    icon: FileText,
    iconColor: "text-muted-foreground",
    iconBg: "bg-muted",
    description: "Content Agent drafted 3 blog outlines for review",
    timestamp: "3 hr ago",
  },
  {
    id: "ev-6",
    icon: Target,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    description: "ABM Enterprise Push moved to Active status",
    timestamp: "5 hr ago",
  },
];

// ===========================================================================
// Home page - Continue working (display-enriched)
// ===========================================================================

export interface ContinueWorkingItem {
  id: string;
  title: string;
  type: "abm-campaign" | "aeo-campaign" | "custom";
  progress: number;
  lastActivity: string;
  lastActivityTime: string;
}

export const mockContinueWorking: ContinueWorkingItem[] = [
  {
    id: "ini-1",
    title: "ABM Enterprise Push",
    type: "abm-campaign",
    progress: 62,
    lastActivity: "Target account list finalized",
    lastActivityTime: "2 hr ago",
  },
  {
    id: "ini-2",
    title: "Product Launch v3.2",
    type: "aeo-campaign",
    progress: 38,
    lastActivity: "Launch email sequence drafted",
    lastActivityTime: "3 hr ago",
  },
  {
    id: "ini-3",
    title: "Website Refresh",
    type: "custom",
    progress: 15,
    lastActivity: "Hero copy variants generated",
    lastActivityTime: "1 day ago",
  },
];

// ===========================================================================
// Initiative workspace - Chat messages
// ===========================================================================

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  agent?: string;
  content: string;
  time: string;
  sources?: { title: string; path: string; type: string; snippet?: string }[];
}

export const mockChatMessages: ChatMsg[] = [
  {
    id: "m1",
    role: "user",
    content:
      "Let's kick off the Q2 AEO Content Blitz. We need to capture high-intent AI Engine queries across our top 8 product categories.",
    time: "10:02 AM",
  },
  {
    id: "m2",
    role: "assistant",
    agent: "Orchestrator",
    content:
      "Great. I've pulled your ICP data and current AEO citation share from the Second Brain. Based on the gap analysis, I recommend prioritizing these 5 categories first where competitor citation share is weakest. I've drafted a strategy brief for your review on the canvas.",
    time: "10:02 AM",
    sources: [
      {
        title: "ICP Definition - Mid-Market SaaS",
        path: "Knowledge/Customers/icp-mid-market-saas",
        type: "customer",
        snippet: "Primary ICP: B2B SaaS companies, 50-500 employees, $5M-$50M ARR. VP Marketing or Head of Growth as primary buyer.",
      },
      {
        title: "Q2 2026 Strategic Priorities",
        path: "Organization/Strategy/q2-growth-plan",
        type: "strategy",
        snippet: "Three pillars for Q2: Launch AEO campaign framework, expand ABM playbook to 3 verticals, hit 50 active workspace milestone.",
      },
      {
        title: "Competitive Landscape Analysis",
        path: "Knowledge/Reference/competitive-landscape",
        type: "reference",
        snippet: "Market is consolidating around two models: fully autonomous AI and augmented human workflows.",
      },
    ],
  },
  {
    id: "m3",
    role: "user",
    content:
      "That looks solid. Can you expand the messaging angle for the 'workflow automation' category? I want us to lead with the hybrid team narrative.",
    time: "10:05 AM",
  },
  {
    id: "m4",
    role: "assistant",
    agent: "Orchestrator",
    content:
      'Updated. I\'ve refined the "workflow automation" messaging to center the hybrid human + agent narrative. The Content Writer agent is now drafting 3 pillar pieces, and the SEO Analyst is running query intent mapping. You\'ll see the work items appear in the Orchestrate tab.',
    time: "10:06 AM",
    sources: [
      {
        title: "Brand Voice Guidelines",
        path: "Knowledge/Brand/voice-guidelines",
        type: "brand",
        snippet: "Tone: bold, clear, clever, playful, insightful. Human writing only. Avoid fluffy filler and corporate jargon.",
      },
      {
        title: "Product Positioning Matrix",
        path: "Knowledge/Product/positioning-matrix",
        type: "product",
        snippet: "Key differentiator: human-in-the-loop orchestration with full transparency. Every agent action is traceable and approvable.",
      },
    ],
  },
  {
    id: "m5",
    role: "user",
    content: "Perfect. What approvals do you need from me before the agents start publishing?",
    time: "10:08 AM",
  },
  {
    id: "m6",
    role: "assistant",
    agent: "Orchestrator",
    content:
      "All content deliverables will go through your approval before publish. I've set the workflow so you review final drafts + meta descriptions. The SEO technical changes (schema markup, internal linking) are low-risk and I can handle those autonomously. Sound good?",
    time: "10:08 AM",
  },
];

// ===========================================================================
// Initiative workspace - Kanban work cards
// ===========================================================================

export interface WorkCard {
  id: string;
  title: string;
  type: "task" | "deliverable" | "approval";
  assignee: { initials: string; color: string; name: string };
  priority?: "high" | "medium" | "low";
}

export interface KanbanColumn {
  key: string;
  label: string;
  items: WorkCard[];
}

export const mockKanbanColumns: KanbanColumn[] = [
  {
    key: "todo",
    label: "To Do",
    items: [
      {
        id: "w1",
        title: "Draft pillar page: Workflow Automation",
        type: "deliverable",
        assignee: { initials: "CW", color: "bg-violet-500 text-white", name: "Content Writer" },
        priority: "high",
      },
      {
        id: "w2",
        title: "Query intent mapping - Category 3",
        type: "task",
        assignee: { initials: "SE", color: "bg-sky-500 text-white", name: "SEO Analyst" },
      },
    ],
  },
  {
    key: "in_progress",
    label: "In Progress",
    items: [
      {
        id: "w3",
        title: "Competitor citation audit",
        type: "task",
        assignee: { initials: "SE", color: "bg-sky-500 text-white", name: "SEO Analyst" },
        priority: "medium",
      },
      {
        id: "w4",
        title: "Draft pillar page: AI Marketing Stack",
        type: "deliverable",
        assignee: { initials: "CW", color: "bg-violet-500 text-white", name: "Content Writer" },
        priority: "high",
      },
    ],
  },
  {
    key: "review",
    label: "Review",
    items: [
      {
        id: "w5",
        title: "Schema markup implementation plan",
        type: "approval",
        assignee: { initials: "SE", color: "bg-sky-500 text-white", name: "SEO Analyst" },
      },
    ],
  },
  {
    key: "done",
    label: "Done",
    items: [
      {
        id: "w6",
        title: "ICP deep-dive research",
        type: "task",
        assignee: { initials: "CO", color: "bg-indigo-500 text-white", name: "Orchestrator" },
      },
      {
        id: "w7",
        title: "Content gap analysis report",
        type: "deliverable",
        assignee: { initials: "SE", color: "bg-sky-500 text-white", name: "SEO Analyst" },
      },
    ],
  },
];

// ===========================================================================
// Initiative workspace - Strategy data
// ===========================================================================

export const mockCampaignBrief = {
  title: "Q2 AEO Content Blitz",
  goal: "Capture 15 high-intent AI Engine queries with optimized content across 8 product categories. Increase AEO citation share from 12% to 25% by end of Q2.",
  audience:
    "B2B SaaS marketing leaders (VP/Director level) evaluating AI-powered marketing tools. Primary segments: mid-market (200-2000 employees) in tech, financial services, and healthcare.",
  messaging:
    "Lead with the hybrid team advantage: humans set strategy, agents execute at scale. Position as the only platform where marketing teams truly collaborate with AI agents rather than just prompting them.",
};

export const mockStrategyProposal = {
  title: "Recommended Strategy",
  points: [
    "Phase 1 (Weeks 1-2): Audit existing content, map competitor citations, identify 15 priority queries",
    "Phase 2 (Weeks 3-4): Create 5 pillar pages targeting top-gap queries with structured data",
    "Phase 3 (Weeks 5-6): Deploy supporting content cluster (15 articles) with internal linking architecture",
    "Phase 4 (Weeks 7-8): Monitor citation performance, iterate on underperforming pieces",
  ],
};

export const mockIcpSummary = {
  title: "ICP Summary",
  personas: [
    { name: "Marketing VP", focus: "ROI, team efficiency, board reporting" },
    { name: "Growth Director", focus: "Pipeline velocity, attribution, experiments" },
    { name: "Content Manager", focus: "Quality, scale, brand voice consistency" },
  ],
};

export const mockKeyMessages = [
  "Your marketing team, amplified by agents that actually understand your strategy.",
  "From months to days: go from campaign brief to full execution in a fraction of the time.",
  "Every agent action is traceable, approvable, and grounded in your Second Brain.",
];

// ===========================================================================
// Initiative workspace - Report data
// ===========================================================================

import { Eye, BarChart3, Users } from "lucide-react";

export interface MetricCard {
  label: string;
  value: string;
  change: string;
  up: boolean;
  icon: LucideIcon;
}

export const mockMetrics: MetricCard[] = [
  { label: "Sessions", value: "14,829", change: "+18%", up: true, icon: Eye },
  { label: "Pipeline Influenced", value: "$482K", change: "+32%", up: true, icon: Target },
  { label: "AEO Citation Share", value: "19.4%", change: "+7.4pp", up: true, icon: BarChart3 },
  { label: "Conversion Rate", value: "3.2%", change: "-0.4%", up: false, icon: Users },
];

export interface AlertItem {
  id: string;
  title: string;
  severity: "warning" | "critical";
  recommendation: string;
}

export const mockAlerts: AlertItem[] = [
  {
    id: "a1",
    title: "Pillar page 'AI Marketing Stack' has 0 internal links",
    severity: "warning",
    recommendation: "Add 4-6 contextual internal links from existing blog posts to improve page authority.",
  },
  {
    id: "a2",
    title: "Competitor gained citation for 'workflow automation tools'",
    severity: "critical",
    recommendation: "Expedite pillar page publish and submit structured data. Estimated recovery: 5-7 days.",
  },
];

// ===========================================================================
// Brain page - Knowledge items (display-enriched)
// ===========================================================================

export interface KnowledgeItem {
  id: string;
  title: string;
  type: string;
  folder: string;
  source: "user" | "agent" | "system";
  updatedAt: string;
  snippet: string;
  content: string;
}

export const mockKnowledge: KnowledgeItem[] = [
  {
    id: "k1",
    title: "Company Overview",
    type: "company",
    folder: "context",
    source: "user",
    updatedAt: "2 hours ago",
    snippet:
      "Hybrid OS is an agentic operating system for modern marketing and revenue teams. Founded in 2024, we help companies orchestrate human-AI collaboration at scale.",
    content:
      "# Company Overview\n\nHybrid OS is an **agentic operating system** for modern marketing and revenue teams. Founded in 2024, we help companies orchestrate human-AI collaboration at scale.\n\n## Mission\n\nEmpower every marketing team to operate like a team of 50, with AI agents that understand context, respect guardrails, and amplify human creativity.\n\n## Key Facts\n\n- Founded: 2024\n- Category: Agentic Marketing OS\n- Stage: Early growth\n- Team: 12 humans + 6 AI agents",
  },
  {
    id: "k2",
    title: "Brand Voice Guidelines",
    type: "brand",
    folder: "context",
    source: "user",
    updatedAt: "1 day ago",
    snippet:
      "Tone: bold, clear, clever, playful, insightful. Human writing only. Avoid fluffy filler and corporate jargon. Write with conviction.",
    content:
      "# Brand Voice Guidelines\n\n## Tone\n\nBold, clear, clever, playful, insightful. Human writing only.\n\n## Rules\n\n- Avoid fluffy filler and corporate jargon\n- Write with conviction\n- Never use em dashes\n- Lead with insight, not features\n- Sound like a smart friend, not a sales deck\n\n## Examples\n\n**Do:** Your marketing team, amplified by agents that actually understand your strategy.\n\n**Don't:** Leverage our cutting-edge AI-powered solution to synergize your marketing efforts.",
  },
  {
    id: "k3",
    title: "ICP Definition - Mid-Market SaaS",
    type: "customer",
    folder: "context",
    source: "agent",
    updatedAt: "3 days ago",
    snippet:
      "Primary ICP: B2B SaaS companies, 50-500 employees, $5M-$50M ARR. VP Marketing or Head of Growth as primary buyer. Pain: scaling content and campaigns without scaling headcount.",
    content:
      "# ICP Definition: Mid-Market SaaS\n\n## Demographics\n\n- **Company size:** 50-500 employees\n- **Revenue:** $5M-$50M ARR\n- **Industries:** SaaS, tech, financial services, healthcare\n\n## Buyer Personas\n\n- VP Marketing (primary)\n- Head of Growth (secondary)\n- Content Manager (influencer)\n\n## Pain Points\n\n- Scaling content and campaigns without scaling headcount\n- Maintaining brand consistency across channels\n- Attribution and reporting complexity\n- Agent fatigue from repetitive campaign tasks",
  },
  {
    id: "k4",
    title: "Product Positioning Matrix",
    type: "product",
    folder: "context",
    source: "user",
    updatedAt: "5 days ago",
    snippet:
      "Category: Agentic Marketing OS. Key differentiator: human-in-the-loop orchestration with full transparency. Competitors: Jasper, Copy.ai, Writer.",
    content:
      "# Product Positioning Matrix\n\n## Category\n\nAgentic Marketing OS\n\n## Key Differentiator\n\nHuman-in-the-loop orchestration with full transparency. Every agent action is traceable, approvable, and grounded in your Second Brain.\n\n## Competitive Landscape\n\n- **Jasper:** Content generation focus, no orchestration\n- **Copy.ai:** Fully autonomous, less control\n- **Writer:** Enterprise content governance, no agents\n- **Us:** Hybrid teams where humans set strategy, agents execute",
  },
  {
    id: "k5",
    title: "Q2 2026 Strategic Priorities",
    type: "strategy",
    folder: "context",
    source: "system",
    updatedAt: "1 week ago",
    snippet:
      "Three pillars for Q2: (1) Launch AEO campaign framework, (2) Expand ABM playbook to 3 verticals, (3) Hit 50 active workspace milestone.",
    content:
      "# Q2 2026 Strategic Priorities\n\n## Three Pillars\n\n- **Pillar 1:** Launch AEO campaign framework and capture 15 high-intent AI Engine queries\n- **Pillar 2:** Expand ABM playbook to 3 verticals (tech, finserv, healthcare)\n- **Pillar 3:** Hit 50 active workspace milestone\n\n## Key Metrics\n\n- AEO citation share: 12% to 25%\n- Active workspaces: 28 to 50\n- Pipeline influenced: $1.2M target",
  },
  {
    id: "k6",
    title: "Competitive Landscape Analysis",
    type: "reference",
    folder: "context",
    source: "agent",
    updatedAt: "2 weeks ago",
    snippet:
      "Market is consolidating around two models: fully autonomous AI (Copy.ai) and augmented human workflows (us). Our hybrid approach resonates with risk-aware enterprise buyers.",
    content:
      "# Competitive Landscape Analysis\n\n## Market Overview\n\nThe market is consolidating around two models:\n\n- **Fully autonomous AI** (Copy.ai, Writesonic): Speed-first, less control\n- **Augmented human workflows** (us, Writer): Quality-first, human oversight\n\n## Our Position\n\nOur hybrid approach resonates with risk-aware enterprise buyers who want AI leverage without losing control. Key advantages:\n\n- Transparent agent actions\n- Approval workflows built in\n- Context grounded in Second Brain\n- Human strategy, agent execution",
  },
];

// ===========================================================================
// Brain page - Folder tree
// ===========================================================================

export interface FolderNode {
  id: string;
  label: string;
  iconName: string;
  children?: FolderNode[];
  count?: number;
}

export const mockFolderTree: FolderNode[] = [
  {
    id: "context",
    label: "Context",
    iconName: "Building2",
    children: [
      { id: "context/company", label: "Company", iconName: "Building2", count: 3 },
      { id: "context/brand", label: "Brand", iconName: "Palette", count: 2 },
      { id: "context/product", label: "Product", iconName: "Package", count: 4 },
      { id: "context/customers", label: "Customers", iconName: "Users", count: 3 },
    ],
  },
  { id: "library", label: "Library", iconName: "BookOpen", count: 12 },
  {
    id: "organization",
    label: "Organization",
    iconName: "Users",
    children: [
      { id: "organization/marketing", label: "Marketing", iconName: "Megaphone", count: 8 },
      { id: "organization/sales", label: "Sales", iconName: "TrendingUp", count: 5 },
    ],
  },
  { id: "templates", label: "Templates", iconName: "LayoutTemplate", count: 6 },
  { id: "documentation", label: "Documentation", iconName: "FileCode", count: 4 },
];

// ===========================================================================
// Agents page (display-enriched)
// ===========================================================================

export interface MockAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  iconName: string;
  color: string;
  status: "active" | "idle" | "running";
  riskLevel: "low" | "medium" | "high";
  canExecute: boolean;
  requiresApproval: boolean;
  tools: string[];
}

export const mockAgents: MockAgent[] = [
  {
    id: "a1",
    name: "Orchestrator",
    role: "Chief of Staff",
    description:
      "Coordinates all agent activities, plans campaigns, and manages workflow orchestration across initiatives.",
    iconName: "Cpu",
    color: "bg-primary text-primary-foreground",
    status: "active",
    riskLevel: "low",
    canExecute: true,
    requiresApproval: false,
    tools: ["Planning", "Delegation", "Memory", "Search"],
  },
  {
    id: "a2",
    name: "Campaign Strategist",
    role: "Strategy Lead",
    description:
      "Designs campaign architectures, defines target audiences, and creates strategic briefs for execution teams.",
    iconName: "Target",
    color: "bg-indigo-600 text-white",
    status: "idle",
    riskLevel: "medium",
    canExecute: true,
    requiresApproval: true,
    tools: ["Research", "Analytics", "Brief Builder"],
  },
  {
    id: "a3",
    name: "Content Writer",
    role: "Creative Lead",
    description:
      "Generates high-quality content across formats: blog posts, landing pages, emails, and social media copy.",
    iconName: "PenTool",
    color: "bg-rose-600 text-white",
    status: "running",
    riskLevel: "medium",
    canExecute: true,
    requiresApproval: true,
    tools: ["Writing", "SEO", "Brand Voice", "Templates"],
  },
  {
    id: "a4",
    name: "Researcher",
    role: "Intelligence Analyst",
    description:
      "Gathers market intelligence, competitive analysis, audience insights, and keyword research to fuel strategy.",
    iconName: "FlaskConical",
    color: "bg-amber-600 text-white",
    status: "idle",
    riskLevel: "low",
    canExecute: true,
    requiresApproval: false,
    tools: ["Web Search", "Data Analysis", "Reports"],
  },
  {
    id: "a5",
    name: "QA Reviewer",
    role: "Quality Assurance",
    description:
      "Reviews all agent outputs for brand alignment, factual accuracy, tone consistency, and quality standards.",
    iconName: "ShieldCheck",
    color: "bg-emerald-600 text-white",
    status: "idle",
    riskLevel: "low",
    canExecute: false,
    requiresApproval: false,
    tools: ["Brand Check", "Fact Verify", "Style Guide"],
  },
  {
    id: "a6",
    name: "Optimizer",
    role: "Performance Lead",
    description:
      "Analyzes campaign performance, runs A/B tests, and recommends optimizations based on real-time data.",
    iconName: "Gauge",
    color: "bg-cyan-600 text-white",
    status: "idle",
    riskLevel: "high",
    canExecute: true,
    requiresApproval: true,
    tools: ["Analytics", "A/B Testing", "Reporting", "HubSpot"],
  },
];

// ===========================================================================
// Agents page - Recent runs (display-enriched)
// ===========================================================================

export interface MockRun {
  id: string;
  agentName: string;
  agentColor: string;
  initiative: string;
  status: "completed" | "running" | "failed";
  duration: string;
  startedAt: string;
}

export const mockRecentRuns: MockRun[] = [
  {
    id: "r1",
    agentName: "Content Writer",
    agentColor: "bg-rose-600",
    initiative: "AEO Campaign - Q2 Launch",
    status: "running",
    duration: "4m 22s",
    startedAt: "2 min ago",
  },
  {
    id: "r2",
    agentName: "Researcher",
    agentColor: "bg-amber-600",
    initiative: "ABM Campaign - Enterprise Tier",
    status: "completed",
    duration: "12m 08s",
    startedAt: "1 hour ago",
  },
  {
    id: "r3",
    agentName: "Campaign Strategist",
    agentColor: "bg-indigo-600",
    initiative: "AEO Campaign - Q2 Launch",
    status: "completed",
    duration: "8m 45s",
    startedAt: "3 hours ago",
  },
  {
    id: "r4",
    agentName: "Optimizer",
    agentColor: "bg-cyan-600",
    initiative: "Content Refresh - Blog Series",
    status: "failed",
    duration: "2m 11s",
    startedAt: "5 hours ago",
  },
];

// ===========================================================================
// Skills page (display-enriched)
// ===========================================================================

export interface MockSkill {
  id: string;
  name: string;
  purpose: string;
  iconName: string;
  iconColor: string;
  category: "campaign" | "content" | "optimization" | "other";
  stepCount: number;
  agents: { initials: string; color: string }[];
  lastRun: string;
}

export const mockSkills: MockSkill[] = [
  {
    id: "s1",
    name: "Campaign Planning",
    purpose:
      "End-to-end campaign strategy: research audience, define goals, create brief, and build execution timeline.",
    iconName: "Rocket",
    iconColor: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    category: "campaign",
    stepCount: 8,
    agents: [
      { initials: "OR", color: "bg-primary text-primary-foreground" },
      { initials: "CS", color: "bg-indigo-600 text-white" },
      { initials: "RE", color: "bg-amber-600 text-white" },
    ],
    lastRun: "2 hours ago",
  },
  {
    id: "s2",
    name: "AEO Campaign Execution",
    purpose:
      "Execute an Answer-Engine-Optimized campaign: keyword clusters, content briefs, draft articles, QA review, and publish.",
    iconName: "Target",
    iconColor: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    category: "campaign",
    stepCount: 12,
    agents: [
      { initials: "CS", color: "bg-indigo-600 text-white" },
      { initials: "CW", color: "bg-rose-600 text-white" },
      { initials: "QA", color: "bg-emerald-600 text-white" },
    ],
    lastRun: "1 day ago",
  },
  {
    id: "s3",
    name: "ABM Campaign",
    purpose:
      "Account-based marketing workflow: identify target accounts, personalize messaging, generate multi-channel touchpoints.",
    iconName: "Target",
    iconColor: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    category: "campaign",
    stepCount: 10,
    agents: [
      { initials: "OR", color: "bg-primary text-primary-foreground" },
      { initials: "CS", color: "bg-indigo-600 text-white" },
      { initials: "CW", color: "bg-rose-600 text-white" },
      { initials: "RE", color: "bg-amber-600 text-white" },
    ],
    lastRun: "3 days ago",
  },
  {
    id: "s4",
    name: "Content Generation",
    purpose:
      "Generate high-quality content from a brief: research, outline, draft, brand-check, and format for publishing.",
    iconName: "FileText",
    iconColor: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    category: "content",
    stepCount: 6,
    agents: [
      { initials: "CW", color: "bg-rose-600 text-white" },
      { initials: "QA", color: "bg-emerald-600 text-white" },
    ],
    lastRun: "5 hours ago",
  },
  {
    id: "s5",
    name: "Retro & Optimization",
    purpose:
      "Post-campaign retrospective: pull performance data, analyze results, surface insights, and recommend next actions.",
    iconName: "RefreshCw",
    iconColor: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
    category: "optimization",
    stepCount: 5,
    agents: [
      { initials: "OP", color: "bg-cyan-600 text-white" },
      { initials: "RE", color: "bg-amber-600 text-white" },
    ],
    lastRun: "1 week ago",
  },
  {
    id: "s6",
    name: "Onboarding",
    purpose:
      "New workspace setup: import brand context, configure agents, seed second brain, and run a test campaign.",
    iconName: "UserPlus",
    iconColor: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    category: "other",
    stepCount: 7,
    agents: [
      { initials: "OR", color: "bg-primary text-primary-foreground" },
    ],
    lastRun: "2 weeks ago",
  },
];

// ===========================================================================
// Settings page - Team members (display-enriched)
// ===========================================================================

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  avatar: string;
}

export const mockTeamMembers: TeamMember[] = [
  {
    id: "u1",
    name: "Luke Summerfield",
    email: "luke@hybridos.ai",
    role: "Admin",
    joinedAt: "Jan 15, 2026",
    avatar: "LS",
  },
  {
    id: "u2",
    name: "Sarah Chen",
    email: "sarah@hybridos.ai",
    role: "Strategist",
    joinedAt: "Feb 8, 2026",
    avatar: "SC",
  },
  {
    id: "u3",
    name: "Marcus Rivera",
    email: "marcus@hybridos.ai",
    role: "Operator",
    joinedAt: "Mar 1, 2026",
    avatar: "MR",
  },
];

// ===========================================================================
// Settings page - Integrations (display-enriched)
// ===========================================================================

export interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  icon: string;
  color: string;
}

export const mockIntegrations: IntegrationItem[] = [
  {
    id: "i1",
    name: "HubSpot",
    description: "CRM, marketing automation, and analytics platform. Syncs contacts, campaigns, and reporting data.",
    connected: true,
    icon: "HS",
    color: "bg-orange-500 text-white",
  },
  {
    id: "i2",
    name: "Google Drive",
    description: "Cloud storage for documents, spreadsheets, and presentations. Import and export content assets.",
    connected: false,
    icon: "GD",
    color: "bg-blue-500 text-white",
  },
  {
    id: "i3",
    name: "Slack",
    description: "Team messaging and notifications. Get real-time alerts on agent activity and approval requests.",
    connected: false,
    icon: "SL",
    color: "bg-purple-500 text-white",
  },
];
