// ============================================================
// Slack integration types
// ============================================================

export interface SlackConnection {
  id: string;
  workspace_id: string;
  team_id: string;
  team_name: string;
  access_token: string;
  bot_user_id: string;
  default_channel_id?: string;
  connected_at: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members?: number;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  thread_ts?: string;
}

// ============================================================
// Block Kit types (simplified subset)
// ============================================================

export type SlackBlock =
  | SlackSectionBlock
  | SlackActionsBlock
  | SlackDividerBlock
  | SlackHeaderBlock
  | SlackContextBlock;

export interface SlackSectionBlock {
  type: "section";
  text: {
    type: "mrkdwn" | "plain_text";
    text: string;
  };
  accessory?: SlackBlockElement;
  fields?: Array<{ type: "mrkdwn" | "plain_text"; text: string }>;
}

export interface SlackActionsBlock {
  type: "actions";
  elements: SlackBlockElement[];
}

export interface SlackDividerBlock {
  type: "divider";
}

export interface SlackHeaderBlock {
  type: "header";
  text: {
    type: "plain_text";
    text: string;
  };
}

export interface SlackContextBlock {
  type: "context";
  elements: Array<{ type: "mrkdwn" | "plain_text"; text: string }>;
}

export type SlackBlockElement = SlackButtonElement;

export interface SlackButtonElement {
  type: "button";
  text: {
    type: "plain_text";
    text: string;
    emoji?: boolean;
  };
  action_id: string;
  value?: string;
  style?: "primary" | "danger";
  url?: string;
}

// ============================================================
// OAuth types
// ============================================================

export interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
  };
  error?: string;
}
