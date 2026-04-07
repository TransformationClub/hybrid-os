import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Integration tests for server actions in mock mode
//
// All server action modules use "use server" and check
// `isSupabaseConfigured`. When it's false they return mock data.
// We mock the Supabase module to ensure mock-mode paths execute.
// ============================================================

// Mock the Supabase server module so actions stay in mock mode
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: false,
  createClient: vi.fn(() => {
    throw new Error("Supabase should not be called in mock mode");
  }),
}));

// Mock next/navigation to avoid server-only errors
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set: vi.fn(),
  })),
  headers: vi.fn(() => new Map()),
}));

// Mock event logger to prevent side-effects
vi.mock("@/lib/events/logger", () => ({
  logWorkItemEvent: vi.fn(),
  logAgentEvent: vi.fn(),
  logEvent: vi.fn(),
}));

// Mock workspace seed
vi.mock("@/lib/workspace/seed", () => ({
  seedWorkspaceDefaults: vi.fn(() => Promise.resolve()),
}));

// ------------------------------------------------------------------
// Initiative actions
// ------------------------------------------------------------------

describe("Initiative server actions (mock mode)", () => {
  it("getInitiatives returns an array of initiatives", async () => {
    const { getInitiatives } = await import(
      "@/lib/initiatives/actions"
    );
    const result = await getInitiatives("mock-workspace");
    expect(result.error).toBeUndefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data!.length).toBeGreaterThan(0);
  });

  it("getInitiatives excludes archived initiatives", async () => {
    const { getInitiatives } = await import(
      "@/lib/initiatives/actions"
    );
    const result = await getInitiatives("mock-workspace");
    for (const init of result.data!) {
      expect(init.status).not.toBe("archived");
    }
  });

  it("createInitiative returns an initiative with expected fields", async () => {
    const { createInitiative } = await import(
      "@/lib/initiatives/actions"
    );
    const result = await createInitiative({
      workspaceId: "ws-1",
      name: "Test Initiative",
      type: "custom",
      goal: "Test goal",
    });
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBe("Test Initiative");
    expect(result.data!.type).toBe("custom");
    expect(result.data!.id).toBeDefined();
    expect(result.data!.workspace_id).toBe("ws-1");
  });

  it("getInitiative returns a specific initiative by ID", async () => {
    const { getInitiative } = await import(
      "@/lib/initiatives/actions"
    );
    const result = await getInitiative("init-001");
    expect(result.error).toBeUndefined();
    expect(result.data!.id).toBe("init-001");
  });

  it("getInitiative returns error for non-existent ID", async () => {
    const { getInitiative } = await import(
      "@/lib/initiatives/actions"
    );
    const result = await getInitiative("nonexistent");
    expect(result.error).toBeDefined();
  });

  it("archiveInitiative returns success", async () => {
    const { archiveInitiative } = await import(
      "@/lib/initiatives/actions"
    );
    const result = await archiveInitiative("init-001");
    expect(result.error).toBeUndefined();
    expect(result.data!.success).toBe(true);
  });

  it("deleteInitiative returns success", async () => {
    const { deleteInitiative } = await import(
      "@/lib/initiatives/actions"
    );
    const result = await deleteInitiative("init-001");
    expect(result.error).toBeUndefined();
    expect(result.data!.success).toBe(true);
  });
});

// ------------------------------------------------------------------
// Work Item actions
// ------------------------------------------------------------------

describe("Work Item server actions (mock mode)", () => {
  it("getWorkItems returns items for a given initiative", async () => {
    const { getWorkItems } = await import(
      "@/lib/initiatives/actions"
    );
    const result = await getWorkItems("init-001");
    expect(result.error).toBeUndefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data!.length).toBeGreaterThan(0);
    for (const item of result.data!) {
      expect(item.initiative_id).toBe("init-001");
    }
  });

  it("createWorkItem returns a work item with expected shape", async () => {
    const { createWorkItem } = await import(
      "@/lib/initiatives/actions"
    );
    const result = await createWorkItem({
      initiativeId: "init-001",
      title: "Write tests",
      type: "task",
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.title).toBe("Write tests");
    expect(result.data!.type).toBe("task");
    expect(result.data!.status).toBe("todo");
    expect(result.data!.id).toBeDefined();
  });

  it("moveWorkItem returns updated status", async () => {
    const { moveWorkItem } = await import(
      "@/lib/initiatives/actions"
    );
    const result = await moveWorkItem({
      workItemId: "wi-001",
      newStatus: "in_progress",
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.status).toBe("in_progress");
  });
});

// ------------------------------------------------------------------
// Approval actions
// ------------------------------------------------------------------

describe("Approval server actions (mock mode)", () => {
  it("getApprovals returns an array of approvals", async () => {
    const { getApprovals } = await import(
      "@/lib/approvals/actions"
    );
    const result = await getApprovals({ workspaceId: "mock-workspace" });
    expect(result.error).toBeUndefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data!.length).toBe(3);
  });

  it("resolveApproval returns approval with resolved status", async () => {
    const { resolveApproval } = await import(
      "@/lib/approvals/actions"
    );
    const result = await resolveApproval({
      approvalId: "appr-001",
      status: "approved",
      reviewedBy: "user-1",
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.status).toBe("approved");
    expect(result.data!.reviewed_by).toBe("user-1");
    expect(result.data!.resolved_at).toBeDefined();
  });

  it("createApproval returns an approval with expected fields", async () => {
    const { createApproval } = await import(
      "@/lib/approvals/actions"
    );
    const result = await createApproval({
      workspaceId: "ws-1",
      initiativeId: "init-001",
      title: "Review draft",
      description: "Please review the content draft",
      category: "content",
      requestedBy: "user-1",
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.title).toBe("Review draft");
    expect(result.data!.category).toBe("content");
    expect(result.data!.status).toBe("pending");
  });

  it("batchResolveApprovals resolves multiple approvals", async () => {
    const { batchResolveApprovals } = await import(
      "@/lib/approvals/actions"
    );
    const result = await batchResolveApprovals({
      approvalIds: ["a1", "a2", "a3"],
      status: "approved",
      reviewedBy: "user-1",
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.length).toBe(3);
    for (const appr of result.data!) {
      expect(appr.status).toBe("approved");
    }
  });

  it("getPendingApprovalsCount returns a number", async () => {
    const { getPendingApprovalsCount } = await import(
      "@/lib/approvals/actions"
    );
    const result = await getPendingApprovalsCount("mock-workspace");
    expect(result.error).toBeUndefined();
    expect(typeof result.data).toBe("number");
    expect(result.data).toBe(5);
  });
});

// ------------------------------------------------------------------
// Agent actions
// ------------------------------------------------------------------

describe("Agent server actions (mock mode)", () => {
  it("getAgents returns an array of agents", async () => {
    const { getAgents } = await import("@/lib/agents/actions");
    const result = await getAgents("mock-workspace");
    expect(result.error).toBeUndefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data!.length).toBeGreaterThan(0);
  });

  it("getAgents includes default agent names", async () => {
    const { getAgents } = await import("@/lib/agents/actions");
    const result = await getAgents("mock-workspace");
    const names = result.data!.map((a) => a.name);
    expect(names).toContain("Orchestrator");
    expect(names).toContain("Content Writer");
    expect(names).toContain("Researcher");
  });

  it("createAgent returns an agent with provided fields", async () => {
    const { createAgent } = await import("@/lib/agents/actions");
    const result = await createAgent({
      workspaceId: "ws-1",
      name: "Test Agent",
      role: "tester",
      riskLevel: "low",
      canExecute: false,
      requiresApproval: true,
      tools: ["testing"],
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe("Test Agent");
    expect(result.data!.role).toBe("tester");
    expect(result.data!.risk_level).toBe("low");
  });

  it("getAgent returns a single agent by ID", async () => {
    const { getAgent } = await import("@/lib/agents/actions");
    const result = await getAgent("agent-123");
    expect(result.error).toBeUndefined();
    expect(result.data!.id).toBe("agent-123");
  });
});

// ------------------------------------------------------------------
// Skill actions
// ------------------------------------------------------------------

describe("Skill server actions (mock mode)", () => {
  it("getSkills returns an array of skills", async () => {
    const { getSkills } = await import("@/lib/skills/actions");
    const result = await getSkills("mock-workspace");
    expect(result.error).toBeUndefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data!.length).toBeGreaterThan(0);
  });

  it("getSkills includes default skill names", async () => {
    const { getSkills } = await import("@/lib/skills/actions");
    const result = await getSkills("mock-workspace");
    const names = result.data!.map((s) => s.name);
    expect(names).toContain("Campaign Planning");
    expect(names).toContain("AEO Campaign");
  });

  it("createSkill returns a skill with expected shape", async () => {
    const { createSkill } = await import("@/lib/skills/actions");
    const result = await createSkill({
      workspaceId: "ws-1",
      name: "Test Skill",
      purpose: "Testing purposes",
      workflow: [],
      agents: [],
      tools: [],
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.name).toBe("Test Skill");
    expect(result.data!.purpose).toBe("Testing purposes");
    expect(result.data!.is_active).toBe(true);
  });

  it("getSkill returns a single skill by ID", async () => {
    const { getSkill } = await import("@/lib/skills/actions");
    const result = await getSkill("skill-123");
    expect(result.error).toBeUndefined();
    expect(result.data!.id).toBe("skill-123");
  });
});

// ------------------------------------------------------------------
// Chat actions
// ------------------------------------------------------------------

describe("Chat server actions (mock mode)", () => {
  it("saveChatMessage returns a mock ID", async () => {
    const { saveChatMessage } = await import("@/lib/chat/actions");
    const result = await saveChatMessage({
      initiativeId: "init-001",
      workspaceId: "ws-1",
      role: "user",
      content: "Hello",
      parts: [],
    });
    expect(result.error).toBeUndefined();
    expect(result.data!.id).toBeDefined();
    expect(result.data!.id).toMatch(/^mock-msg-/);
  });

  it("getChatHistory returns empty array in mock mode", async () => {
    const { getChatHistory } = await import("@/lib/chat/actions");
    const result = await getChatHistory("init-001");
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([]);
  });
});
