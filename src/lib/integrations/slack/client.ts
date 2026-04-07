import type {
  SlackChannel,
  SlackBlock,
  SlackOAuthResponse,
} from "./types";
import type { Approval, Initiative } from "@/types";

// ============================================================
// Configuration
// ============================================================

const SLACK_API_BASE = "https://slack.com/api";
const SLACK_AUTH_BASE = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";

const SCOPES = ["chat:write", "channels:read"].join(",");

export const isSlackConfigured = !!(
  process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET
);

// ============================================================
// Deep-link builder
// ============================================================

/**
 * Build an app deep-link URL for embedding in Slack messages.
 * e.g. `https://app.example.com/initiatives/abc123`
 */
export function buildDeepLink(
  page: string,
  entityId?: string
): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.hybrid-os.com";
  if (entityId) {
    return `${base}/${page}/${entityId}`;
  }
  return `${base}/${page}`;
}

// ============================================================
// OAuth helpers
// ============================================================

export function getSlackAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });
  return `${SLACK_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<SlackOAuthResponse> {
  const res = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Slack token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as SlackOAuthResponse;
  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error ?? "unknown"}`);
  }

  return data;
}

// ============================================================
// API client factory
// ============================================================

export interface SlackClient {
  listChannels(): Promise<SlackChannel[]>;
  sendMessage(
    channelId: string,
    text: string,
    blocks?: SlackBlock[]
  ): Promise<{ ok: boolean; ts?: string; error?: string }>;
  sendApprovalPrompt(
    channelId: string,
    approval: Approval
  ): Promise<{ ok: boolean; error?: string }>;
  sendStatusUpdate(
    channelId: string,
    initiative: Initiative,
    status: string
  ): Promise<{ ok: boolean; error?: string }>;
}

export function createSlackClient(accessToken: string): SlackClient {
  if (!isSlackConfigured) {
    return createMockClient();
  }
  return createLiveClient(accessToken);
}

// ============================================================
// Live client (Slack Web API)
// ============================================================

function createLiveClient(accessToken: string): SlackClient {
  async function slackFetch<T>(
    method: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(`${SLACK_API_BASE}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Slack API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    async listChannels(): Promise<SlackChannel[]> {
      const data = await slackFetch<{
        ok: boolean;
        channels: Array<{
          id: string;
          name: string;
          is_private: boolean;
          num_members: number;
        }>;
        error?: string;
      }>("conversations.list", {
        types: "public_channel",
        exclude_archived: true,
        limit: 200,
      });

      if (!data.ok) {
        throw new Error(`Slack channels list error: ${data.error ?? "unknown"}`);
      }

      return data.channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        is_private: ch.is_private,
        num_members: ch.num_members,
      }));
    },

    async sendMessage(
      channelId: string,
      text: string,
      blocks?: SlackBlock[]
    ): Promise<{ ok: boolean; ts?: string; error?: string }> {
      const payload: Record<string, unknown> = { channel: channelId, text };
      if (blocks) {
        payload.blocks = blocks;
      }
      return slackFetch("chat.postMessage", payload);
    },

    async sendApprovalPrompt(
      channelId: string,
      approval: Approval
    ): Promise<{ ok: boolean; error?: string }> {
      const deepLink = buildDeepLink("approvals", approval.id);

      const blocks: SlackBlock[] = [
        {
          type: "header",
          text: { type: "plain_text", text: "Approval Required" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${approval.title}*\n${approval.description ?? "No description provided."}\n\n<${deepLink}|View in Hybrid OS>`,
          },
          fields: [
            { type: "mrkdwn", text: `*Category:*\n${approval.category}` },
            { type: "mrkdwn", text: `*Status:*\n${approval.status}` },
          ],
        },
        { type: "divider" },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Approve", emoji: true },
              style: "primary",
              action_id: `approve_${approval.id}`,
              value: approval.id,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "Reject", emoji: true },
              style: "danger",
              action_id: `reject_${approval.id}`,
              value: approval.id,
            },
          ],
        },
      ];

      const fallbackText = `Approval required: ${approval.title}`;
      return this.sendMessage(channelId, fallbackText, blocks);
    },

    async sendStatusUpdate(
      channelId: string,
      initiative: Initiative,
      status: string
    ): Promise<{ ok: boolean; error?: string }> {
      const blocks: SlackBlock[] = [
        {
          type: "header",
          text: { type: "plain_text", text: "Initiative Status Update" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${initiative.title}*`,
          },
          fields: [
            { type: "mrkdwn", text: `*Type:*\n${initiative.type}` },
            { type: "mrkdwn", text: `*Status:*\n${status}` },
          ],
        },
      ];

      const fallbackText = `Status update: ${initiative.title} is now ${status}`;
      return this.sendMessage(channelId, fallbackText, blocks);
    },
  };
}

// ============================================================
// Mock client (used when Slack is not configured)
// ============================================================

function createMockClient(): SlackClient {
  return {
    async listChannels(): Promise<SlackChannel[]> {
      return [
        { id: "C001", name: "general", is_private: false, num_members: 24 },
        { id: "C002", name: "marketing", is_private: false, num_members: 12 },
        { id: "C003", name: "approvals", is_private: false, num_members: 8 },
      ];
    },

    async sendMessage(
      channelId: string,
      text: string,
      blocks?: SlackBlock[]
    ): Promise<{ ok: boolean; ts?: string; error?: string }> {
      console.log(
        `[slack:mock] sendMessage to ${channelId}: ${text}`,
        blocks ? `(${blocks.length} blocks)` : ""
      );
      return { ok: true, ts: `mock-${Date.now()}` };
    },

    async sendApprovalPrompt(
      channelId: string,
      approval: Approval
    ): Promise<{ ok: boolean; error?: string }> {
      console.log(
        `[slack:mock] sendApprovalPrompt to ${channelId}: ${approval.title}`
      );
      return { ok: true };
    },

    async sendStatusUpdate(
      channelId: string,
      initiative: Initiative,
      status: string
    ): Promise<{ ok: boolean; error?: string }> {
      console.log(
        `[slack:mock] sendStatusUpdate to ${channelId}: ${initiative.title} -> ${status}`
      );
      return { ok: true };
    },
  };
}
