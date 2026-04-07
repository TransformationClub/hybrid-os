// ============================================================
// HubSpot integration types
// ============================================================

export interface HubSpotConnection {
  id: string;
  workspace_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  portal_id: string;
  hub_domain: string;
  connected_at: string;
}

export interface HubSpotContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  lifecycleStage?: string;
}

export interface HubSpotCompany {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
}

export interface HubSpotCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
}

export interface HubSpotBlogPost {
  id: string;
  title: string;
  slug: string;
  state: string;
  publishDate?: string;
  htmlContent?: string;
}

export interface HubSpotEmail {
  id: string;
  name: string;
  subject: string;
  state: string;
  type: string;
}

export interface HubSpotPerformanceMetrics {
  traffic: {
    total: number;
    organic: number;
    direct: number;
    referral: number;
    social: number;
  };
  leads: {
    total: number;
    newThisPeriod: number;
    conversionRate: number;
  };
  engagement: {
    emailOpenRate: number;
    emailClickRate: number;
    blogViews: number;
  };
}

/** Token response from HubSpot OAuth exchange */
export interface HubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/** Payload for creating a draft blog post */
export interface CreateBlogPostData {
  name: string;
  contentGroupId: string;
  slug?: string;
  htmlBody?: string;
  metaDescription?: string;
}

/** Payload for creating a draft marketing email */
export interface CreateEmailData {
  name: string;
  subject: string;
  body?: string;
  fromName?: string;
  replyTo?: string;
}
