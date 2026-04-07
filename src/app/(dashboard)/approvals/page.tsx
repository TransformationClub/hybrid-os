"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { ShieldCheck, Filter, Inbox, CheckCircle2, XCircle, Check } from "lucide-react";
import { ApprovalListSkeleton } from "@/components/skeletons/page-skeletons";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineApprovalCard } from "@/components/approvals/inline-approval-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { mockApprovalCards as rawApprovals } from "@/lib/mock-data";

// ---------- Server actions ----------

import { getApprovals, resolveApproval, batchResolveApprovals } from "@/lib/approvals/actions";
import type { Approval } from "@/types";

// ---------- Realtime ----------

import { useRealtimeSubscription } from "@/hooks/use-realtime";

// ---------- Optimistic updates ----------

import { optimisticUpdate } from "@/lib/optimistic";

// ---------------------------------------------------------------------------
// Display shape for the approvals page
// ---------------------------------------------------------------------------

type ApprovalCategory =
  | "content"
  | "workflow"
  | "execution"
  | "integration"
  | "communication";

interface ApprovalItem {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  requestedBy: string;
  initiative?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Mock data fallback (matches original page structure)
// ---------------------------------------------------------------------------

const mockApprovals: ApprovalItem[] = [
  // Map existing mock approval cards (all pending)
  ...rawApprovals.map((a) => ({
    id: a.id,
    title: a.title,
    description: null as string | null,
    category: a.category,
    status: "pending" as const,
    requestedBy: a.requestedBy.name,
    initiative: a.initiative,
    createdAt: undefined as string | undefined,
  })),
  // Additional approvals in various states
  {
    id: "apr-5",
    title: "HubSpot workflow automation setup",
    description: "Configure lead scoring workflow with 5-stage nurture sequence.",
    category: "integration",
    status: "approved",
    requestedBy: "Campaign Agent",
    initiative: "ABM Enterprise Push",
    createdAt: "2026-04-04T14:30:00Z",
  },
  {
    id: "apr-6",
    title: "Blog series: AI in Marketing (5 posts)",
    description:
      "Five-part blog series covering AI agent use cases in modern marketing teams.",
    category: "content",
    status: "approved",
    requestedBy: "Content Agent",
    initiative: "Q2 AEO Content Blitz",
    createdAt: "2026-04-03T09:15:00Z",
  },
  {
    id: "apr-7",
    title: "Campaign budget reallocation request",
    description: "Shift $5K from paid social to ABM direct mail for Q2.",
    category: "execution",
    status: "rejected",
    requestedBy: "Campaign Agent",
    initiative: "ABM Enterprise Push",
    createdAt: "2026-04-02T16:45:00Z",
  },
  {
    id: "apr-8",
    title: "Partner co-marketing email draft",
    description:
      "Joint announcement email with TechPartner Inc for integration launch.",
    category: "communication",
    status: "changes_requested",
    requestedBy: "Email Agent",
    initiative: "Product Launch v3.2",
    createdAt: "2026-04-01T11:00:00Z",
  },
  {
    id: "apr-9",
    title: "Agent delegation workflow update",
    description:
      "Updated workflow rules for auto-delegating research tasks to Researcher agent.",
    category: "workflow",
    status: "pending",
    requestedBy: "Orchestrator",
    initiative: "Q2 AEO Content Blitz",
    createdAt: "2026-04-05T08:20:00Z",
  },
  {
    id: "apr-10",
    title: "Slack integration notification rules",
    description:
      "Configure which agent events trigger Slack notifications in #marketing-ops.",
    category: "integration",
    status: "changes_requested",
    requestedBy: "Sarah Kim",
    initiative: "ABM Enterprise Push",
    createdAt: "2026-03-30T13:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Transform server Approval to display ApprovalItem
// ---------------------------------------------------------------------------

function transformApproval(a: Approval): ApprovalItem {
  return {
    id: a.id,
    title: a.title,
    description: a.description ?? null,
    category: a.category,
    status: a.status,
    requestedBy: a.requested_by,
    initiative: a.initiative_id,
    createdAt: a.created_at,
  };
}

// ---------------------------------------------------------------------------
// Status tab configuration
// ---------------------------------------------------------------------------

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "changes_requested", label: "Changes Requested" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "content", label: "Content" },
  { value: "workflow", label: "Workflow" },
  { value: "execution", label: "Execution" },
  { value: "integration", label: "Integration" },
  { value: "communication", label: "Communication" },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchResolving, setBatchResolving] = useState(false);

  // Fetch approvals from server actions
  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getApprovals({ workspaceId: "default" });
      if (result.data && result.data.length > 0) {
        setApprovals(result.data.map(transformApproval));
      } else {
        // Fallback to mock data
        setApprovals(mockApprovals);
      }
    } catch {
      // Fallback to mock data on error
      setApprovals(mockApprovals);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // ---- Supabase Realtime: live-update approvals list ----
  useRealtimeSubscription<Approval>({
    table: "approvals",
    filter: { column: "workspace_id", value: "default" },
    onInsert: useCallback((record: Approval) => {
      setApprovals((prev) => {
        if (prev.some((a) => a.id === record.id)) return prev;
        return [transformApproval(record), ...prev];
      });
    }, []),
    onUpdate: useCallback((record: Approval) => {
      setApprovals((prev) =>
        prev.map((a) => (a.id === record.id ? transformApproval(record) : a))
      );
    }, []),
  });

  const filteredApprovals = useMemo(() => {
    return approvals.filter((a) => {
      const matchesStatus =
        statusFilter === "all" || a.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" ||
        a.category.toLowerCase() === categoryFilter;
      return matchesStatus && matchesCategory;
    });
  }, [statusFilter, categoryFilter, approvals]);

  const handleApprove = useCallback(async (id: string) => {
    // Optimistic: immediately show as approved
    let snapshot: ApprovalItem[] = [];
    setApprovals((prev) => {
      snapshot = prev;
      return optimisticUpdate(prev, id, { status: "approved" });
    });
    setResolving(id);
    try {
      const result = await resolveApproval({
        approvalId: id,
        status: "approved",
        reviewedBy: "current-user",
      });
      if (result.error) {
        // Rollback on server error
        setApprovals(snapshot);
        console.error("Failed to approve:", result.error);
      }
    } catch (err) {
      setApprovals(snapshot);
      console.error("Failed to approve:", err);
    } finally {
      setResolving(null);
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    // Optimistic: immediately show as rejected
    let snapshot: ApprovalItem[] = [];
    setApprovals((prev) => {
      snapshot = prev;
      return optimisticUpdate(prev, id, { status: "rejected" });
    });
    setResolving(id);
    try {
      const result = await resolveApproval({
        approvalId: id,
        status: "rejected",
        reviewedBy: "current-user",
      });
      if (result.error) {
        setApprovals(snapshot);
        console.error("Failed to reject:", result.error);
      }
    } catch (err) {
      setApprovals(snapshot);
      console.error("Failed to reject:", err);
    } finally {
      setResolving(null);
    }
  }, []);

  const handleRequestChanges = useCallback(async (id: string, feedback: string) => {
    let snapshot: ApprovalItem[] = [];
    setApprovals((prev) => {
      snapshot = prev;
      return optimisticUpdate(prev, id, { status: "changes_requested" });
    });
    setResolving(id);
    try {
      const result = await resolveApproval({
        approvalId: id,
        status: "changes_requested",
        reviewedBy: "current-user",
        feedback,
      });
      if (result.error) {
        setApprovals(snapshot);
        console.error("Failed to request changes:", result.error);
      }
    } catch (err) {
      setApprovals(snapshot);
      console.error("Failed to request changes:", err);
    } finally {
      setResolving(null);
    }
  }, []);

  // -- Batch selection handlers --

  const pendingFilteredApprovals = useMemo(
    () => filteredApprovals.filter((a) => a.status === "pending"),
    [filteredApprovals],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const pendingIds = pendingFilteredApprovals.map((a) => a.id);
      const allSelected = pendingIds.every((id) => prev.has(id));
      if (allSelected) {
        // Deselect all
        return new Set();
      }
      return new Set(pendingIds);
    });
  }, [pendingFilteredApprovals]);

  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;
    // Optimistic: immediately mark all selected as approved
    let snapshot: ApprovalItem[] = [];
    setApprovals((prev) => {
      snapshot = prev;
      return prev.map((a) =>
        selectedIds.has(a.id) ? { ...a, status: "approved" } : a
      );
    });
    const clearedIds = new Set(selectedIds);
    setSelectedIds(new Set());
    setBatchResolving(true);
    try {
      const result = await batchResolveApprovals({
        approvalIds: Array.from(clearedIds),
        status: "approved",
        reviewedBy: "current-user",
      });
      if (result.error) {
        setApprovals(snapshot);
        setSelectedIds(clearedIds);
        console.error("Batch approve failed:", result.error);
      }
    } catch (err) {
      setApprovals(snapshot);
      setSelectedIds(clearedIds);
      console.error("Batch approve failed:", err);
    } finally {
      setBatchResolving(false);
    }
  }, [selectedIds]);

  const handleBatchReject = useCallback(async () => {
    if (selectedIds.size === 0) return;
    // Optimistic: immediately mark all selected as rejected
    let snapshot: ApprovalItem[] = [];
    setApprovals((prev) => {
      snapshot = prev;
      return prev.map((a) =>
        selectedIds.has(a.id) ? { ...a, status: "rejected" } : a
      );
    });
    const clearedIds = new Set(selectedIds);
    setSelectedIds(new Set());
    setBatchResolving(true);
    try {
      const result = await batchResolveApprovals({
        approvalIds: Array.from(clearedIds),
        status: "rejected",
        reviewedBy: "current-user",
      });
      if (result.error) {
        setApprovals(snapshot);
        setSelectedIds(clearedIds);
        console.error("Batch reject failed:", result.error);
      }
    } catch (err) {
      setApprovals(snapshot);
      setSelectedIds(clearedIds);
      console.error("Batch reject failed:", err);
    } finally {
      setBatchResolving(false);
    }
  }, [selectedIds]);

  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    setCategoryFilter("all");
  }, []);

  // Count by status for tab badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: approvals.length };
    for (const a of approvals) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return counts;
  }, [approvals]);

  return (
    <div className="flex flex-col gap-6 p-6 pb-12 max-w-4xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Approvals"
        description="Review and manage approval requests from agents and team members."
      />

      {loading ? (
        <ApprovalListSkeleton />
      ) : (
        /* Status Tabs */
        <Tabs
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as string)}
        >
          <TabsList variant="line">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {(statusCounts[tab.value] ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[0.65rem] font-semibold text-muted-foreground">
                    {statusCounts[tab.value]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Filter Row */}
          <div className="flex items-center gap-3 pt-1">
            {/* Select All checkbox (only when pending items exist) */}
            {pendingFilteredApprovals.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-background transition-colors hover:border-foreground/30"
                aria-label="Select all pending approvals"
              >
                {pendingFilteredApprovals.length > 0 &&
                  pendingFilteredApprovals.every((a) => selectedIds.has(a.id)) && (
                    <Check className="size-3.5 text-foreground" />
                  )}
              </button>
            )}

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {categoryFilter !== "all" && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear filters
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground">
              {filteredApprovals.length} result
              {filteredApprovals.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Shared content panel for all tabs (filtering is state-driven) */}
          {STATUS_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {filteredApprovals.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No approvals found"
                  description="There are no approvals matching the current filters. Try adjusting your filters or check back later."
                  action={{
                    label: "Clear filters",
                    onClick: handleClearFilters,
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredApprovals.map((approval) => (
                    <div key={approval.id} className="flex items-start gap-2">
                      {/* Selection checkbox for pending items */}
                      {approval.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => toggleSelect(approval.id)}
                          className="mt-4 flex size-5 shrink-0 items-center justify-center rounded border border-border bg-background transition-colors hover:border-foreground/30"
                          aria-label={`Select ${approval.title}`}
                        >
                          {selectedIds.has(approval.id) && (
                            <Check className="size-3.5 text-foreground" />
                          )}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <InlineApprovalCard
                          approval={approval}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onRequestChanges={handleRequestChanges}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Floating batch action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-popover px-4 py-3 shadow-lg ring-1 ring-foreground/5">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            onClick={handleBatchApprove}
            disabled={batchResolving}
          >
            <CheckCircle2 data-icon="inline-start" />
            Approve Selected ({selectedIds.size})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBatchReject}
            disabled={batchResolving}
          >
            <XCircle data-icon="inline-start" />
            Reject Selected ({selectedIds.size})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
