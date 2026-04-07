-- ============================================================
-- Invitations table for team invite via email
-- ============================================================

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role workspace_role not null default 'viewer',
  invited_by uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  token text not null unique default gen_random_uuid()::text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index idx_invitations_workspace on invitations (workspace_id);
create index idx_invitations_email on invitations (email);
create index idx_invitations_token on invitations (token);
create index idx_invitations_status on invitations (status);

-- Prevent duplicate pending invitations for the same email + workspace
create unique index idx_invitations_unique_pending
  on invitations (workspace_id, email)
  where status = 'pending';

-- RLS policies
alter table invitations enable row level security;

create policy "Workspace admins can manage invitations"
  on invitations for all
  using (
    workspace_id in (
      select workspace_id from workspace_memberships
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can view invitations sent to their email"
  on invitations for select
  using (
    email = (select email from users where id = auth.uid())
  );
