-- HubSpot integration connections table
CREATE TABLE IF NOT EXISTS hubspot_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  portal_id text NOT NULL,
  hub_domain text NOT NULL DEFAULT '',
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hubspot_connections_workspace_unique UNIQUE (workspace_id)
);

-- Index for workspace lookup
CREATE INDEX IF NOT EXISTS idx_hubspot_connections_workspace
  ON hubspot_connections(workspace_id);

-- RLS
ALTER TABLE hubspot_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view connections"
  ON hubspot_connections FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage connections"
  ON hubspot_connections FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Updated_at trigger
CREATE TRIGGER set_hubspot_connections_updated_at
  BEFORE UPDATE ON hubspot_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
