-- ============================================================
-- Hybrid OS - Initial Database Schema
-- ============================================================
-- This migration creates all core tables for the v1 product.
-- Run against a Supabase Postgres database.
-- ============================================================

-- Extensions note:
-- pgvector must be enabled via Supabase Dashboard > Database > Extensions before running this migration
-- uuid-ossp is not needed; gen_random_uuid() is used instead (built-in PostgreSQL 13+)

-- ============================================================
-- WORKSPACES
-- ============================================================

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_workspaces_slug on workspaces (slug);

-- ============================================================
-- USERS & MEMBERSHIPS
-- ============================================================

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type workspace_role as enum ('admin', 'strategist', 'operator', 'reviewer', 'viewer');

create table workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role workspace_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create index idx_memberships_workspace on workspace_memberships (workspace_id);
create index idx_memberships_user on workspace_memberships (user_id);

-- ============================================================
-- INITIATIVES
-- ============================================================

create type initiative_type as enum ('aeo-campaign', 'abm-campaign', 'custom');
create type initiative_status as enum ('draft', 'planning', 'active', 'paused', 'completed', 'archived');

create table initiatives (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  type initiative_type not null default 'custom',
  status initiative_status not null default 'draft',
  goal text,
  brief text,
  success_criteria text,
  metadata jsonb not null default '{}',
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_initiatives_workspace on initiatives (workspace_id);
create index idx_initiatives_status on initiatives (workspace_id, status);

-- ============================================================
-- WORK ITEMS
-- ============================================================

create type work_item_status as enum ('backlog', 'todo', 'in_progress', 'review', 'done', 'blocked');
create type work_item_type as enum ('task', 'deliverable', 'approval', 'blocker');

create table work_items (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  title text not null,
  description text,
  type work_item_type not null default 'task',
  status work_item_status not null default 'todo',
  assigned_to uuid references users(id),
  assigned_agent uuid,
  priority smallint not null default 0,
  due_date date,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_work_items_initiative on work_items (initiative_id);
create index idx_work_items_status on work_items (initiative_id, status);
create index idx_work_items_assignee on work_items (assigned_to) where assigned_to is not null;

-- ============================================================
-- APPROVALS
-- ============================================================

create type approval_status as enum ('pending', 'approved', 'rejected', 'changes_requested');
create type approval_category as enum ('content', 'workflow', 'execution', 'integration', 'communication');

create table approvals (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiatives(id) on delete cascade,
  work_item_id uuid references work_items(id) on delete set null,
  category approval_category not null,
  title text not null,
  description text,
  status approval_status not null default 'pending',
  requested_by text not null,
  reviewed_by uuid references users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_approvals_initiative on approvals (initiative_id);
create index idx_approvals_status on approvals (status) where status = 'pending';

-- ============================================================
-- AGENTS
-- ============================================================

create type agent_risk_level as enum ('low', 'medium', 'high');

create table agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  role text not null,
  description text,
  tone text,
  risk_level agent_risk_level not null default 'low',
  can_execute boolean not null default false,
  requires_approval boolean not null default true,
  tools text[] not null default '{}',
  avatar_url text,
  system_prompt text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agents_workspace on agents (workspace_id);

-- ============================================================
-- AGENT RUNS
-- ============================================================

create type agent_run_status as enum (
  'queued', 'planning', 'waiting_approval', 'running',
  'completed', 'failed', 'blocked', 'cancelled'
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  initiative_id uuid references initiatives(id) on delete set null,
  work_item_id uuid references work_items(id) on delete set null,
  status agent_run_status not null default 'queued',
  input jsonb,
  output jsonb,
  error text,
  token_usage jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_agent_runs_agent on agent_runs (agent_id);
create index idx_agent_runs_initiative on agent_runs (initiative_id) where initiative_id is not null;
create index idx_agent_runs_status on agent_runs (status) where status in ('queued', 'running', 'planning');

-- ============================================================
-- KNOWLEDGE OBJECTS (Second Brain)
-- ============================================================

create type knowledge_type as enum (
  'company', 'team', 'individual', 'skill', 'agent',
  'reference', 'brand', 'customer', 'product', 'strategy'
);
create type knowledge_source as enum ('user', 'agent', 'system');

create table knowledge_objects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  path text not null,
  title text not null,
  type knowledge_type not null,
  content text not null default '',
  source knowledge_source not null default 'user',
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_knowledge_workspace on knowledge_objects (workspace_id);
create index idx_knowledge_path on knowledge_objects (workspace_id, path);
create index idx_knowledge_type on knowledge_objects (workspace_id, type);
create index idx_knowledge_embedding on knowledge_objects
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);

create table knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  knowledge_object_id uuid not null references knowledge_objects(id) on delete cascade,
  content text not null,
  changed_by text not null,
  change_reason text,
  version_number integer not null default 1,
  created_at timestamptz not null default now()
);

create index idx_knowledge_versions on knowledge_versions (knowledge_object_id);

-- ============================================================
-- SKILLS
-- ============================================================

create table skills (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  purpose text not null,
  description text,
  inputs jsonb not null default '{}',
  workflow jsonb not null default '[]',
  agents text[] not null default '{}',
  tools text[] not null default '{}',
  quality_bar text,
  escalation_rules text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_skills_workspace on skills (workspace_id);

-- ============================================================
-- EVENTS (unified audit + activity log)
-- ============================================================

create table events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type text not null,
  actor_type text not null default 'system',
  actor_id text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_events_workspace on events (workspace_id);
create index idx_events_type on events (workspace_id, type);
create index idx_events_entity on events (entity_type, entity_id);
create index idx_events_created on events (workspace_id, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table workspaces enable row level security;
alter table users enable row level security;
alter table workspace_memberships enable row level security;
alter table initiatives enable row level security;
alter table work_items enable row level security;
alter table approvals enable row level security;
alter table agents enable row level security;
alter table agent_runs enable row level security;
alter table knowledge_objects enable row level security;
alter table knowledge_versions enable row level security;
alter table skills enable row level security;
alter table events enable row level security;

-- Basic RLS policies: workspace members can access their workspace data

create policy "Users can view own profile"
  on users for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on users for update
  using (id = auth.uid());

create policy "Workspace members can view workspace"
  on workspaces for select
  using (
    id in (
      select workspace_id from workspace_memberships
      where user_id = auth.uid()
    )
  );

create policy "Workspace members can view memberships"
  on workspace_memberships for select
  using (
    workspace_id in (
      select workspace_id from workspace_memberships
      where user_id = auth.uid()
    )
  );

-- Helper function for workspace access checks
create or replace function user_has_workspace_access(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from workspace_memberships
    where workspace_id = ws_id
    and user_id = auth.uid()
  );
$$;

-- Workspace-scoped policies using the helper function
create policy "Members can view initiatives"
  on initiatives for select
  using (user_has_workspace_access(workspace_id));

create policy "Members can view work items"
  on work_items for select
  using (
    initiative_id in (
      select id from initiatives
      where user_has_workspace_access(workspace_id)
    )
  );

create policy "Members can view approvals"
  on approvals for select
  using (
    initiative_id in (
      select id from initiatives
      where user_has_workspace_access(workspace_id)
    )
  );

create policy "Members can view agents"
  on agents for select
  using (user_has_workspace_access(workspace_id));

create policy "Members can view agent runs"
  on agent_runs for select
  using (
    agent_id in (
      select id from agents
      where user_has_workspace_access(workspace_id)
    )
  );

create policy "Members can view knowledge"
  on knowledge_objects for select
  using (user_has_workspace_access(workspace_id));

create policy "Members can view knowledge versions"
  on knowledge_versions for select
  using (
    knowledge_object_id in (
      select id from knowledge_objects
      where user_has_workspace_access(workspace_id)
    )
  );

create policy "Members can view skills"
  on skills for select
  using (user_has_workspace_access(workspace_id));

create policy "Members can view events"
  on events for select
  using (user_has_workspace_access(workspace_id));

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_updated_at before update on workspaces
  for each row execute function update_updated_at();
create trigger users_updated_at before update on users
  for each row execute function update_updated_at();
create trigger initiatives_updated_at before update on initiatives
  for each row execute function update_updated_at();
create trigger work_items_updated_at before update on work_items
  for each row execute function update_updated_at();
create trigger agents_updated_at before update on agents
  for each row execute function update_updated_at();
create trigger knowledge_objects_updated_at before update on knowledge_objects
  for each row execute function update_updated_at();
create trigger skills_updated_at before update on skills
  for each row execute function update_updated_at();
