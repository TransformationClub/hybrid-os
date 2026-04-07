"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  GitCompare,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProposedUpdates,
  approveProposedUpdate,
  rejectProposedUpdate,
  type ProposedUpdate,
} from "@/lib/brain/proposed-updates-actions";

// ------------------------------------------------------------
// Simple inline diff (reuses same approach as version-history)
// ------------------------------------------------------------

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
}

function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.push({ type: "unchanged", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.push({ type: "added", text: newLines[j - 1] });
      j--;
    } else {
      diff.push({ type: "removed", text: oldLines[i - 1] });
      i--;
    }
  }

  diff.reverse();
  return diff;
}

function InlineDiff({
  oldContent,
  newContent,
}: {
  oldContent: string;
  newContent: string;
}) {
  const lines = computeLineDiff(oldContent, newContent);

  return (
    <div className="rounded-md border bg-muted/20 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
      {lines.map((line, idx) => (
        <div
          key={idx}
          className={cn(
            "px-3 py-0.5 whitespace-pre-wrap break-all",
            line.type === "added" &&
              "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
            line.type === "removed" &&
              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
            line.type === "unchanged" && "text-muted-foreground"
          )}
        >
          <span className="inline-block w-5 select-none text-right mr-2 opacity-50">
            {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
          </span>
          {line.text || "\u00A0"}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Proposal card
// ------------------------------------------------------------

function ProposalCard({
  proposal,
  onApprove,
  onReject,
}: {
  proposal: ProposedUpdate;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionInProgress, setActionInProgress] = useState(false);

  const hasDiff = !!proposal.existing_content;

  const date = new Date(proposal.created_at);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const handleApprove = async () => {
    setActionInProgress(true);
    onApprove(proposal.id);
  };

  const handleReject = async () => {
    setActionInProgress(true);
    onReject(proposal.id, rejectionReason || undefined);
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <div className="px-4 pt-4 pb-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="secondary"
                className="text-[11px] capitalize shrink-0"
              >
                {proposal.type}
              </Badge>
              {hasDiff && (
                <Badge
                  variant="secondary"
                  className="text-[11px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0"
                >
                  Update
                </Badge>
              )}
              {!hasDiff && (
                <Badge
                  variant="secondary"
                  className="text-[11px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0"
                >
                  New
                </Badge>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-snug">
              {proposal.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {proposal.path}
            </p>
          </div>
        </div>

        {/* Reason */}
        <div className="mt-2 flex items-start gap-1.5">
          <AlertCircle className="size-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {proposal.reason}
          </p>
        </div>

        {/* Meta row */}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/70">
          <span className="inline-flex items-center gap-1">
            <Bot className="size-3" />
            {proposal.proposed_by}
          </span>
          <span>
            {formattedDate} at {formattedTime}
          </span>
        </div>

        {/* Expandable content preview */}
        <div className="mt-3">
          <button
            onClick={() => {
              setExpanded(!expanded);
              if (!expanded) setShowDiff(false);
            }}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            <FileText className="size-3" />
            Preview content
          </button>

          {expanded && (
            <div className="mt-2 space-y-2">
              {hasDiff && (
                <div className="flex gap-2">
                  <Button
                    variant={showDiff ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowDiff(!showDiff)}
                  >
                    <GitCompare className="size-3 mr-1" />
                    {showDiff ? "Hide diff" : "Show diff"}
                  </Button>
                </div>
              )}

              {showDiff && hasDiff ? (
                <InlineDiff
                  oldContent={proposal.existing_content!}
                  newContent={proposal.content}
                />
              ) : (
                <div className="rounded-md border bg-muted/20 p-3 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {proposal.content}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          {rejecting ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                placeholder="Reason for rejection (optional)"
                className="h-8 text-xs flex-1"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleReject();
                  if (e.key === "Escape") setRejecting(false);
                }}
                autoFocus
              />
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs"
                onClick={handleReject}
                disabled={actionInProgress}
              >
                Reject
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setRejecting(false);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={handleApprove}
                disabled={actionInProgress}
              >
                <Check className="size-3 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setRejecting(true)}
                disabled={actionInProgress}
              >
                <X className="size-3 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------
// Main component
// ------------------------------------------------------------

export function ProposedUpdates() {
  const [proposals, setProposals] = useState<ProposedUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProposals = useCallback(async () => {
    const result = await getProposedUpdates();
    if (result.data) {
      setProposals(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleApprove = useCallback(
    async (id: string) => {
      const result = await approveProposedUpdate(id);
      if (result.data?.success) {
        setProposals((prev) => prev.filter((p) => p.id !== id));
      }
    },
    []
  );

  const handleReject = useCallback(
    async (id: string, reason?: string) => {
      const result = await rejectProposedUpdate(id, reason);
      if (result.data?.success) {
        setProposals((prev) => prev.filter((p) => p.id !== id));
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        Loading proposals...
      </div>
    );
  }

  if (proposals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">
          Proposed Updates
        </h3>
        <Badge variant="secondary" className="text-[11px]">
          {proposals.length} pending
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </div>
  );
}
