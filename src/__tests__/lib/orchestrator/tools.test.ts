import { describe, it, expect, vi } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: false,
  createClient: vi.fn(),
}));

vi.mock("@/lib/retrieval/pgvector-adapter", () => ({
  PgVectorRetrievalAdapter: vi.fn(),
}));

vi.mock("@/lib/events/logger", () => ({
  logApprovalEvent: vi.fn().mockResolvedValue(undefined),
  logWorkItemEvent: vi.fn().mockResolvedValue(undefined),
}));

// ai SDK tool() returns an object with an execute function
vi.mock("ai", () => ({
  tool: ({ execute, inputSchema }: { execute: Function; inputSchema: unknown }) => ({
    execute,
    inputSchema,
  }),
}));

import { orchestratorTools } from "@/lib/orchestrator/tools";

describe("orchestratorTools (mock mode)", () => {
  it("searchKnowledge returns mock results", async () => {
    const result = await orchestratorTools.searchKnowledge.execute(
      { query: "brand voice", types: undefined, maxResults: 5 },
      { toolCallId: "test", messages: [], abortSignal: undefined as never }
    );
    expect(result.success).toBe(true);
    expect(result.results).toBeInstanceOf(Array);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty("title");
    expect(result.results[0]).toHaveProperty("snippet");
  });

  it("createWorkItem returns mock work item", async () => {
    const result = await orchestratorTools.createWorkItem.execute(
      {
        initiativeId: "init-1",
        title: "Write blog post",
        description: "Draft a post about AI marketing",
        type: "task" as const,
        status: "todo" as const,
        assignedAgent: "content-writer",
        dueDate: undefined,
      },
      { toolCallId: "test", messages: [], abortSignal: undefined as never }
    );
    expect(result.success).toBe(true);
    expect(result.workItem).toBeDefined();
    expect(result.workItem!.title).toBe("Write blog post");
    expect(result.workItem!.initiative_id).toBe("init-1");
    expect(result.workItem!.id).toMatch(/^wi_mock_/);
  });

  it("requestApproval returns mock approval", async () => {
    const result = await orchestratorTools.requestApproval.execute(
      {
        initiativeId: "init-1",
        title: "Publish campaign email",
        description: "Final draft of the Q2 campaign email",
        category: "content" as const,
        workItemId: undefined,
      },
      { toolCallId: "test", messages: [], abortSignal: undefined as never }
    );
    expect(result.success).toBe(true);
    expect(result.approval).toBeDefined();
    expect(result.approval!.title).toBe("Publish campaign email");
    expect(result.approval!.status).toBe("pending");
    expect(result.approval!.id).toMatch(/^apr_mock_/);
  });

  it("generateContent requires approval before execution", async () => {
    const result = await orchestratorTools.generateContent.execute(
      {
        initiativeId: "init-1",
        contentType: "blog_post" as const,
        title: "AI in Marketing",
        brief: "Write about how AI transforms marketing workflows",
        outline: undefined,
      },
      { toolCallId: "test", messages: [], abortSignal: undefined as never }
    );
    expect(result.awaitingApproval).toBe(true);
    expect(result.approvalId).toBeDefined();
    expect(result.message).toContain("Awaiting approval");
  });
});
