"use client";

import { Shield } from "lucide-react";

import { cn } from "@/lib/utils";
import { InlineApprovalCard } from "./inline-approval-card";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApprovalQueueProps {
  approvals: Array<{
    id: string;
    title: string;
    description?: string | null;
    category: string;
    status: string;
    requestedBy: string;
    createdAt?: string;
    initiative?: string;
  }>;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onRequestChanges?: (id: string, feedback: string) => void;
  maxItems?: number;
  emptyMessage?: string;
  compact?: boolean;
  onViewAll?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ApprovalQueue({
  approvals,
  onApprove,
  onReject,
  onRequestChanges,
  maxItems,
  emptyMessage = "No approvals waiting. You're all caught up.",
  compact = false,
  onViewAll,
  className,
}: ApprovalQueueProps) {
  const visibleApprovals = maxItems
    ? approvals.slice(0, maxItems)
    : approvals;
  const hasMore = maxItems ? approvals.length > maxItems : false;

  if (approvals.length === 0) {
    return (
      <div className={cn("flex flex-col items-center gap-3 py-8 text-center", className)}>
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Shield className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className={cn(
            "font-heading font-medium",
            compact ? "text-sm" : "text-base"
          )}
        >
          Approvals
          <span className="ml-1.5 text-muted-foreground">
            ({approvals.length})
          </span>
        </h3>

        {(hasMore || onViewAll) && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-primary hover:underline"
          >
            View All
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {visibleApprovals.map((approval) => (
          <InlineApprovalCard
            key={approval.id}
            approval={approval}
            onApprove={onApprove}
            onReject={onReject}
            onRequestChanges={onRequestChanges}
            compact={compact}
          />
        ))}
      </div>

      {/* Overflow indicator */}
      {hasMore && (
        <p className="text-center text-xs text-muted-foreground">
          +{approvals.length - (maxItems ?? 0)} more
        </p>
      )}
    </div>
  );
}

export { ApprovalQueue };
export type { ApprovalQueueProps };
