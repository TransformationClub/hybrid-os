// ============================================================
// Core domain types for Hybrid OS
// ============================================================

// --- Workspace ---
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

// --- User ---
export type WorkspaceRole = "admin" | "strategist" | "operator" | "reviewer" | "viewer";

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface WorkspaceMembership {
  user_id: string;
  workspace_id: string;
  role: WorkspaceRole;
}

// --- Initiative ---
export type InitiativeType = "aeo-campaign" | "abm-campaign" | "custom";
export type InitiativeStatus = "draft" | "planning" | "active" | "paused" | "completed" | "archived";

export interface Initiative {
  id: string;
  workspace_id: string;
  title: string;
  type: InitiativeType;
  status: InitiativeStatus;
  goal?: string;
  brief?: string;
  success_criteria?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// --- Work Item ---
export type WorkItemStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "blocked";
export type WorkItemType = "task" | "deliverable" | "approval" | "blocker";

export interface WorkItem {
  id: string;
  initiative_id: string;
  title: string;
  description?: string;
  type: WorkItemType;
  status: WorkItemStatus;
  assigned_to?: string;
  assigned_agent?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

// --- Approval ---
export type ApprovalStatus = "pending" | "approved" | "rejected" | "changes_requested";
export type ApprovalCategory = "content" | "workflow" | "execution" | "integration" | "communication";

export interface Approval {
  id: string;
  initiative_id: string;
  work_item_id?: string;
  category: ApprovalCategory;
  title: string;
  description?: string;
  status: ApprovalStatus;
  requested_by: string;
  reviewed_by?: string;
  created_at: string;
  resolved_at?: string;
}

// --- Agent ---
export type AgentRiskLevel = "low" | "medium" | "high";

export interface Agent {
  id: string;
  workspace_id: string;
  name: string;
  role: string;
  description?: string;
  tone?: string;
  risk_level: AgentRiskLevel;
  can_execute: boolean;
  requires_approval: boolean;
  tools: string[];
  avatar_url?: string;
  is_active: boolean;
}

export type AgentRunStatus =
  | "queued"
  | "planning"
  | "waiting_approval"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "cancelled";

export interface AgentRun {
  id: string;
  agent_id: string;
  initiative_id?: string;
  work_item_id?: string;
  status: AgentRunStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  token_usage?: { input: number; output: number };
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

// --- Knowledge (Second Brain) ---
export type KnowledgeType =
  | "company"
  | "team"
  | "individual"
  | "skill"
  | "agent"
  | "reference"
  | "brand"
  | "customer"
  | "product"
  | "strategy";

export interface KnowledgeObject {
  id: string;
  workspace_id: string;
  path: string;
  title: string;
  type: KnowledgeType;
  content: string;
  source: "user" | "agent" | "system";
  created_at: string;
  updated_at: string;
}

// --- Skill ---
export interface Skill {
  id: string;
  workspace_id: string;
  name: string;
  purpose: string;
  description?: string;
  inputs?: Record<string, unknown>;
  workflow: SkillStep[];
  agents: string[];
  tools: string[];
  quality_bar?: string;
  escalation_rules?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillStep {
  id: string;
  order: number;
  label: string;
  agent_id?: string;
  action: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
}

// --- Event ---
export type EventType =
  | "initiative.created"
  | "initiative.updated"
  | "work_item.created"
  | "work_item.updated"
  | "approval.requested"
  | "approval.resolved"
  | "agent.run_started"
  | "agent.run_completed"
  | "agent.run_failed"
  | "knowledge.created"
  | "knowledge.updated"
  | "skill.executed"
  | "system.error";

export interface AppEvent {
  id: string;
  workspace_id: string;
  type: EventType;
  actor_type: "user" | "agent" | "system";
  actor_id: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// --- Chat ---
export type ChatMessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  metadata?: {
    agent_name?: string;
    action_type?: string;
    approval_id?: string;
    work_items?: string[];
  };
  created_at: string;
}
