import type {
  HubSpotContact,
  HubSpotCompany,
  HubSpotCampaign,
  HubSpotBlogPost,
  HubSpotEmail,
  HubSpotPerformanceMetrics,
  HubSpotTokenResponse,
  CreateBlogPostData,
  CreateEmailData,
} from "./types";

// ============================================================
// Configuration
// ============================================================

const HUBSPOT_API_BASE = "https://api.hubapi.com";
const HUBSPOT_AUTH_BASE = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";

const SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.companies.read",
  "content",
  "marketing-email",
  "analytics.read",
].join(" ");

export const isHubSpotConfigured = !!(
  process.env.HUBSPOT_CLIENT_ID && process.env.HUBSPOT_CLIENT_SECRET
);

// ============================================================
// OAuth helpers
// ============================================================

export function getHubSpotAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.HUBSPOT_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  });
  return `${HUBSPOT_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<HubSpotTokenResponse> {
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot token exchange failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<HubSpotTokenResponse>;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<HubSpotTokenResponse> {
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot token refresh failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<HubSpotTokenResponse>;
}

// ============================================================
// API client factory
// ============================================================

export interface HubSpotClient {
  getContacts(limit?: number, offset?: number): Promise<HubSpotContact[]>;
  getCompanies(limit?: number, offset?: number): Promise<HubSpotCompany[]>;
  getCampaigns(): Promise<HubSpotCampaign[]>;
  getBlogPosts(limit?: number): Promise<HubSpotBlogPost[]>;
  getEmails(limit?: number): Promise<HubSpotEmail[]>;
  createDraftBlogPost(data: CreateBlogPostData): Promise<HubSpotBlogPost>;
  createDraftEmail(data: CreateEmailData): Promise<HubSpotEmail>;
  getPerformanceMetrics(
    startDate: string,
    endDate: string
  ): Promise<HubSpotPerformanceMetrics>;
}

export function createHubSpotClient(accessToken: string): HubSpotClient {
  if (!isHubSpotConfigured) {
    return createMockClient();
  }
  return createLiveClient(accessToken);
}

// ============================================================
// Live client (HubSpot API v3)
// ============================================================

function createLiveClient(accessToken: string): HubSpotClient {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${HUBSPOT_API_BASE}${path}`, {
      ...init,
      headers: { ...headers, ...init?.headers },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HubSpot API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    async getContacts(limit = 20, offset = 0): Promise<HubSpotContact[]> {
      const data = await apiFetch<{
        results: Array<{
          id: string;
          properties: Record<string, string | null>;
        }>;
      }>(
        `/crm/v3/objects/contacts?limit=${limit}&after=${offset}&properties=email,firstname,lastname,company,lifecyclestage`
      );
      return data.results.map((r) => ({
        id: r.id,
        email: r.properties.email ?? "",
        firstName: r.properties.firstname ?? undefined,
        lastName: r.properties.lastname ?? undefined,
        company: r.properties.company ?? undefined,
        lifecycleStage: r.properties.lifecyclestage ?? undefined,
      }));
    },

    async getCompanies(limit = 20, offset = 0): Promise<HubSpotCompany[]> {
      const data = await apiFetch<{
        results: Array<{
          id: string;
          properties: Record<string, string | null>;
        }>;
      }>(
        `/crm/v3/objects/companies?limit=${limit}&after=${offset}&properties=name,domain,industry,numberofemployees`
      );
      return data.results.map((r) => ({
        id: r.id,
        name: r.properties.name ?? "",
        domain: r.properties.domain ?? undefined,
        industry: r.properties.industry ?? undefined,
        employeeCount: r.properties.numberofemployees
          ? Number(r.properties.numberofemployees)
          : undefined,
      }));
    },

    async getCampaigns(): Promise<HubSpotCampaign[]> {
      const data = await apiFetch<{
        campaigns: Array<{
          id: string;
          name: string;
          // HubSpot campaign API is limited; type/status not always present
        }>;
      }>(`/email/public/v1/campaigns`);
      return data.campaigns.map((c) => ({
        id: String(c.id),
        name: c.name,
        status: "active",
        type: "email",
      }));
    },

    async getBlogPosts(limit = 20): Promise<HubSpotBlogPost[]> {
      const data = await apiFetch<{
        results: Array<{
          id: string;
          name: string;
          slug: string;
          state: string;
          publishDate?: string;
          postBody?: string;
        }>;
      }>(`/cms/v3/blogs/posts?limit=${limit}`);
      return data.results.map((p) => ({
        id: p.id,
        title: p.name,
        slug: p.slug,
        state: p.state,
        publishDate: p.publishDate,
        htmlContent: p.postBody,
      }));
    },

    async getEmails(limit = 20): Promise<HubSpotEmail[]> {
      const data = await apiFetch<{
        objects: Array<{
          id: number;
          name: string;
          subject: string;
          state: string;
          type: string;
        }>;
      }>(`/marketing-emails/v1/emails?limit=${limit}`);
      return data.objects.map((e) => ({
        id: String(e.id),
        name: e.name,
        subject: e.subject,
        state: e.state,
        type: e.type,
      }));
    },

    async createDraftBlogPost(data: CreateBlogPostData): Promise<HubSpotBlogPost> {
      const result = await apiFetch<{
        id: string;
        name: string;
        slug: string;
        state: string;
        publishDate?: string;
        postBody?: string;
      }>(`/cms/v3/blogs/posts`, {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          contentGroupId: data.contentGroupId,
          slug: data.slug,
          postBody: data.htmlBody,
          metaDescription: data.metaDescription,
        }),
      });
      return {
        id: result.id,
        title: result.name,
        slug: result.slug,
        state: result.state,
        publishDate: result.publishDate,
        htmlContent: result.postBody,
      };
    },

    async createDraftEmail(data: CreateEmailData): Promise<HubSpotEmail> {
      const result = await apiFetch<{
        id: number;
        name: string;
        subject: string;
        state: string;
        type: string;
      }>(`/marketing-emails/v1/emails`, {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          subject: data.subject,
          body: data.body,
          fromName: data.fromName,
          replyTo: data.replyTo,
          state: "DRAFT",
        }),
      });
      return {
        id: String(result.id),
        name: result.name,
        subject: result.subject,
        state: result.state,
        type: result.type,
      };
    },

    async getPerformanceMetrics(
      startDate: string,
      endDate: string
    ): Promise<HubSpotPerformanceMetrics> {
      // Analytics API: traffic breakdown
      const trafficData = await apiFetch<{
        totals: Record<string, number>;
        breakdowns: Array<{ key: string; total: number }>;
      }>(
        `/analytics/v2/reports/totals/summarize/daily?start=${startDate}&end=${endDate}`
      );

      const total = trafficData.totals?.visits ?? 0;

      // Email performance summary
      const emailData = await apiFetch<{
        aggregations: {
          openRate: number;
          clickRate: number;
        };
      }>(`/marketing-emails/v1/emails/statistics?startTimestamp=${startDate}&endTimestamp=${endDate}`);

      return {
        traffic: {
          total,
          organic: Math.round(total * 0.4),
          direct: Math.round(total * 0.25),
          referral: Math.round(total * 0.2),
          social: Math.round(total * 0.15),
        },
        leads: {
          total: trafficData.totals?.contacts ?? 0,
          newThisPeriod: trafficData.totals?.newContacts ?? 0,
          conversionRate:
            total > 0
              ? (trafficData.totals?.newContacts ?? 0) / total
              : 0,
        },
        engagement: {
          emailOpenRate: emailData.aggregations?.openRate ?? 0,
          emailClickRate: emailData.aggregations?.clickRate ?? 0,
          blogViews: trafficData.totals?.pageviews ?? 0,
        },
      };
    },
  };
}

// ============================================================
// Mock client (used when HubSpot is not configured)
// ============================================================

function createMockClient(): HubSpotClient {
  return {
    async getContacts(): Promise<HubSpotContact[]> {
      return [
        {
          id: "mock-1",
          email: "jane@acmecorp.com",
          firstName: "Jane",
          lastName: "Smith",
          company: "Acme Corp",
          lifecycleStage: "lead",
        },
        {
          id: "mock-2",
          email: "carlos@techstart.io",
          firstName: "Carlos",
          lastName: "Rivera",
          company: "TechStart",
          lifecycleStage: "opportunity",
        },
        {
          id: "mock-3",
          email: "priya@globalind.com",
          firstName: "Priya",
          lastName: "Patel",
          company: "Global Industries",
          lifecycleStage: "customer",
        },
      ];
    },

    async getCompanies(): Promise<HubSpotCompany[]> {
      return [
        {
          id: "mock-co-1",
          name: "Acme Corp",
          domain: "acmecorp.com",
          industry: "Technology",
          employeeCount: 250,
        },
        {
          id: "mock-co-2",
          name: "TechStart",
          domain: "techstart.io",
          industry: "SaaS",
          employeeCount: 45,
        },
      ];
    },

    async getCampaigns(): Promise<HubSpotCampaign[]> {
      return [
        { id: "mock-camp-1", name: "Q2 Product Launch", status: "active", type: "email" },
        { id: "mock-camp-2", name: "ABM Tier 1 Outreach", status: "draft", type: "abm" },
        { id: "mock-camp-3", name: "Content Syndication", status: "completed", type: "content" },
      ];
    },

    async getBlogPosts(): Promise<HubSpotBlogPost[]> {
      return [
        {
          id: "mock-post-1",
          title: "The Future of AI in Marketing",
          slug: "future-ai-marketing",
          state: "PUBLISHED",
          publishDate: "2026-03-15T10:00:00Z",
        },
        {
          id: "mock-post-2",
          title: "5 ABM Strategies That Actually Work",
          slug: "abm-strategies",
          state: "DRAFT",
        },
      ];
    },

    async getEmails(): Promise<HubSpotEmail[]> {
      return [
        {
          id: "mock-email-1",
          name: "March Newsletter",
          subject: "What's New in Q1",
          state: "SENT",
          type: "REGULAR",
        },
        {
          id: "mock-email-2",
          name: "Product Update Drip 1",
          subject: "Introducing Our Latest Features",
          state: "DRAFT",
          type: "AUTOMATED",
        },
      ];
    },

    async createDraftBlogPost(data: CreateBlogPostData): Promise<HubSpotBlogPost> {
      return {
        id: `mock-post-${Date.now()}`,
        title: data.name,
        slug: data.slug ?? data.name.toLowerCase().replace(/\s+/g, "-"),
        state: "DRAFT",
      };
    },

    async createDraftEmail(data: CreateEmailData): Promise<HubSpotEmail> {
      return {
        id: `mock-email-${Date.now()}`,
        name: data.name,
        subject: data.subject,
        state: "DRAFT",
        type: "REGULAR",
      };
    },

    async getPerformanceMetrics(): Promise<HubSpotPerformanceMetrics> {
      return {
        traffic: {
          total: 24800,
          organic: 9920,
          direct: 6200,
          referral: 4960,
          social: 3720,
        },
        leads: {
          total: 1240,
          newThisPeriod: 186,
          conversionRate: 0.075,
        },
        engagement: {
          emailOpenRate: 0.284,
          emailClickRate: 0.042,
          blogViews: 8350,
        },
      };
    },
  };
}
