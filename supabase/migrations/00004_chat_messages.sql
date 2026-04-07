-- Chat message persistence for initiative workspaces
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL DEFAULT '',
  parts jsonb NOT NULL DEFAULT '[]',
  tool_invocations jsonb,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_initiative
  ON chat_messages(initiative_id, created_at);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view chat messages"
  ON chat_messages FOR SELECT
  USING (user_has_workspace_access(workspace_id));

CREATE POLICY "Members can insert chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (user_has_workspace_access(workspace_id));
