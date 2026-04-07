CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  author_id uuid NOT NULL REFERENCES users(id),
  author_name text NOT NULL,
  content text NOT NULL,
  mentions text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_workspace ON comments(workspace_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view comments"
  ON comments FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create comments in their workspace"
  ON comments FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can edit own comments"
  ON comments FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (author_id = auth.uid());
