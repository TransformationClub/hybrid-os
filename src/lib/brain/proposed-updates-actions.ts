"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { updateKnowledgeEmbedding } from "@/lib/embeddings/service";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface ProposedUpdate {
  id: string;
  path: string;
  title: string;
  type: string;
  content: string;
  reason: string;
  proposed_by: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  existing_content?: string;
  created_at: string;
}

type ActionResult<T> = { data: T; error?: never } | { data?: never; error: string };

// ------------------------------------------------------------
// In-memory mock state (used when Supabase is not configured)
// ------------------------------------------------------------

const mockProposals: ProposedUpdate[] = [
  {
    id: "prop-1",
    path: "Knowledge/Brand/voice-guidelines",
    title: "Brand Voice Guidelines",
    type: "brand",
    content:
      "# Brand Voice Guidelines\n\nOur brand voice is bold, clear, and human.\n\n## Principles\n1. Lead with insight, not jargon\n2. Be direct but never cold\n3. Use active voice\n4. Show, don't tell\n\n## Tone Spectrum\n- Blog posts: conversational, playful\n- Product docs: precise, helpful\n- Sales decks: confident, outcome-focused",
    reason: "Expanded voice guidelines with tone spectrum after analyzing top-performing content",
    proposed_by: "Content Strategist",
    status: "pending",
    existing_content:
      "# Brand Voice Guidelines\n\nOur brand voice is bold, clear, and human.\n\n## Principles\n1. Lead with insight, not jargon\n2. Be direct but never cold",
    created_at: "2026-04-05T14:30:00Z",
  },
  {
    id: "prop-2",
    path: "Knowledge/Customers/ideal-customer-profile",
    title: "Ideal Customer Profile",
    type: "customer",
    content:
      "# Ideal Customer Profile\n\n## Firmographics\n- B2B SaaS, 50-500 employees\n- Series B+ funding\n- $10M-$100M ARR\n\n## Technographics\n- Uses HubSpot or Salesforce\n- Active content marketing program\n- 3+ person marketing team\n\n## Pain Points\n- Scaling content without scaling headcount\n- Maintaining brand consistency across channels\n- Measuring content ROI",
    reason: "Created ICP based on closed-won analysis from Q1 pipeline data",
    proposed_by: "Growth Analyst",
    status: "pending",
    created_at: "2026-04-04T10:15:00Z",
  },
  {
    id: "prop-3",
    path: "Organization/Marketing/campaign-playbook",
    title: "Campaign Launch Playbook",
    type: "strategy",
    content:
      "# Campaign Launch Playbook\n\n## Pre-Launch (T-14 days)\n- [ ] Define campaign brief and success metrics\n- [ ] Create content calendar\n- [ ] Set up tracking and attribution\n\n## Launch Week\n- [ ] Publish hero content\n- [ ] Activate email sequences\n- [ ] Launch paid promotion\n\n## Post-Launch\n- [ ] Weekly performance review\n- [ ] Optimize based on data\n- [ ] Document learnings",
    reason: "Standardizing our campaign launch process based on last 3 successful launches",
    proposed_by: "Campaign Orchestrator",
    status: "pending",
    created_at: "2026-04-03T16:45:00Z",
  },
  {
    id: "prop-4",
    path: "Knowledge/Product/positioning-matrix",
    title: "Product Positioning Matrix",
    type: "product",
    content:
      "# Product Positioning Matrix\n\n## Category\nAI-powered marketing operating system\n\n## Target Buyer\nVP Marketing / Head of Growth at mid-market B2B SaaS\n\n## Key Differentiators\n1. Human-in-the-loop agent orchestration\n2. Second brain knowledge persistence\n3. Full-funnel campaign automation\n\n## Competitive Alternatives\n- Jasper (content only)\n- HubSpot (automation only)\n- Agency (expensive, slow)",
    reason: "Updated positioning after competitive analysis and customer interviews",
    proposed_by: "Product Marketing Manager",
    status: "pending",
    existing_content:
      "# Product Positioning Matrix\n\n## Category\nAI marketing platform\n\n## Target Buyer\nMarketing leaders",
    created_at: "2026-04-02T09:00:00Z",
  },
];

// Mutable copy for in-memory state
let inMemoryProposals = [...mockProposals];

// ------------------------------------------------------------
// Server actions
// ------------------------------------------------------------

export async function getProposedUpdates(
  workspaceId?: string
): Promise<ActionResult<ProposedUpdate[]>> {
  if (!isSupabaseConfigured) {
    return { data: inMemoryProposals.filter((p) => p.status === "pending") };
  }

  try {
    const supabase = await createClient();

    const query = supabase
      .from("knowledge_objects")
      .select("*")
      .eq("metadata->>proposed", "true")
      .eq("metadata->>status", "pending")
      .order("created_at", { ascending: false });

    if (workspaceId) {
      query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message };
    }

    const proposals: ProposedUpdate[] = (data ?? []).map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        id: row.id as string,
        path: row.path as string,
        title: row.title as string,
        type: row.type as string,
        content: row.content as string,
        reason: (meta.reason as string) ?? "",
        proposed_by: (meta.proposed_by as string) ?? "Agent",
        status: "pending" as const,
        existing_content: meta.existing_content as string | undefined,
        created_at: row.created_at as string,
      };
    });

    return { data: proposals };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch proposals" };
  }
}

export async function approveProposedUpdate(
  proposalId: string
): Promise<ActionResult<{ success: boolean }>> {
  if (!isSupabaseConfigured) {
    inMemoryProposals = inMemoryProposals.map((p) =>
      p.id === proposalId ? { ...p, status: "approved" as const } : p
    );
    return { data: { success: true } };
  }

  try {
    const supabase = await createClient();

    // Get the proposal
    const { data: proposal, error: fetchError } = await supabase
      .from("knowledge_objects")
      .select("*")
      .eq("id", proposalId)
      .single();

    if (fetchError || !proposal) {
      return { error: fetchError?.message ?? "Proposal not found" };
    }

    // Approve: update the metadata to mark as approved and remove proposed flag
    const existingMeta = (proposal.metadata ?? {}) as Record<string, unknown>;
    const { error: updateError } = await supabase
      .from("knowledge_objects")
      .update({
        metadata: {
          ...existingMeta,
          proposed: false,
          status: "approved",
          approved_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    if (updateError) {
      return { error: updateError.message };
    }

    // Fire-and-forget embedding generation for the approved content
    updateKnowledgeEmbedding(proposalId, proposal.content as string).catch(() => {});

    return { data: { success: true } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to approve proposal" };
  }
}

export async function rejectProposedUpdate(
  proposalId: string,
  reason?: string
): Promise<ActionResult<{ success: boolean }>> {
  if (!isSupabaseConfigured) {
    inMemoryProposals = inMemoryProposals.map((p) =>
      p.id === proposalId
        ? { ...p, status: "rejected" as const, rejection_reason: reason }
        : p
    );
    return { data: { success: true } };
  }

  try {
    const supabase = await createClient();

    const { data: proposal, error: fetchError } = await supabase
      .from("knowledge_objects")
      .select("metadata")
      .eq("id", proposalId)
      .single();

    if (fetchError || !proposal) {
      return { error: fetchError?.message ?? "Proposal not found" };
    }

    const existingMeta = (proposal.metadata ?? {}) as Record<string, unknown>;
    const { error: updateError } = await supabase
      .from("knowledge_objects")
      .update({
        metadata: {
          ...existingMeta,
          proposed: false,
          status: "rejected",
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    if (updateError) {
      return { error: updateError.message };
    }

    return { data: { success: true } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to reject proposal" };
  }
}
