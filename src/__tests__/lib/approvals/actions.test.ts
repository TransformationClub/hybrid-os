import { describe, it, expect, vi } from "vitest";

// Mock Supabase so the actions run in mock mode
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: false,
  createClient: vi.fn(),
}));

import {
  createApproval,
  resolveApproval,
  getApprovals,
  getPendingApprovalsCount,
  batchResolveApprovals,
} from "@/lib/approvals/actions";

describe("approval server actions (mock mode)", () => {
  it("createApproval returns a mock approval", async () => {
    const result = await createApproval({
      workspaceId: "ws-1",
      initiativeId: "init-1",
      title: "Approve blog post",
      description: "Final review of the blog post draft",
      category: "content",
      requestedBy: "orchestrator",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBe("Approve blog post");
    expect(result.data!.category).toBe("content");
    expect(result.data!.initiative_id).toBe("init-1");
    expect(result.data!.status).toBe("pending");
    expect(result.data!.id).toBeDefined();
  });

  it("resolveApproval returns an updated approval", async () => {
    const result = await resolveApproval({
      approvalId: "apr-123",
      status: "approved",
      reviewedBy: "luke",
      feedback: "Looks good!",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBe("apr-123");
    expect(result.data!.status).toBe("approved");
    expect(result.data!.reviewed_by).toBe("luke");
    expect(result.data!.resolved_at).toBeDefined();
  });

  it("getApprovals returns a mock list", async () => {
    const result = await getApprovals({
      workspaceId: "ws-1",
      status: "pending",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data!.length).toBe(3);
    result.data!.forEach((approval) => {
      expect(approval.status).toBe("pending");
    });
  });

  it("getPendingApprovalsCount returns a mock count", async () => {
    const result = await getPendingApprovalsCount("ws-1");

    expect(result.error).toBeUndefined();
    expect(result.data).toBe(5);
  });

  it("batchResolveApprovals returns a mock list of resolved approvals", async () => {
    const ids = ["apr-1", "apr-2", "apr-3"];
    const result = await batchResolveApprovals({
      approvalIds: ids,
      status: "approved",
      reviewedBy: "luke",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.length).toBe(3);
    result.data!.forEach((approval, i) => {
      expect(approval.id).toBe(ids[i]);
      expect(approval.status).toBe("approved");
      expect(approval.reviewed_by).toBe("luke");
      expect(approval.resolved_at).toBeDefined();
    });
  });
});
