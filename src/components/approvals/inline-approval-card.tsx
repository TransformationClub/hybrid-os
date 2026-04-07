"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Shield,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";

// ---------------------------------------------------------------------------
// Category color mapping
// ---------------------------------------------------------------------------

const CATEGORY_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  content: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
    label: "Content",
  },
  workflow: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-700 dark:text-purple-400",
    label: "Workflow",
  },
  execution: {
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    text: "text-orange-700 dark:text-orange-400",
    label: "Execution",
  },
  integration: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-700 dark:text-cyan-400",
    label: "Integration",
  },
  communication: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Communication",
  },
};

const DEFAULT_CATEGORY_STYLE = {
  bg: "bg-muted",
  text: "text-muted-foreground",
  label: "Other",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InlineApprovalCardProps {
  approval: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    status: string;
    requestedBy: string;
    createdAt?: string;
  };
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onRequestChanges?: (id: string, feedback: string) => void;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function InlineApprovalCard({
  approval,
  onApprove,
  onReject,
  onRequestChanges,
  compact = false,
}: InlineApprovalCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  const isPending = approval.status.toLowerCase() === "pending";
  const categoryKey = approval.category.toLowerCase();
  const category = CATEGORY_STYLES[categoryKey] ?? DEFAULT_CATEGORY_STYLE;

  const handleRequestChanges = () => {
    if (showFeedback && feedback.trim()) {
      onRequestChanges?.(approval.id, feedback.trim());
      setFeedback("");
      setShowFeedback(false);
    } else {
      setShowFeedback(true);
    }
  };

  return (
    <Card
      size={compact ? "sm" : "default"}
      className={cn(
        "transition-shadow hover:ring-foreground/15",
        compact && "gap-2"
      )}
    >
      {/* Header: category badge + requested by */}
      <CardHeader className={cn("flex-row items-center gap-2", compact && "gap-1.5")}>
        <Badge
          className={cn(
            "border-transparent font-medium",
            category.bg,
            category.text,
            compact && "h-4 px-1.5 text-[0.65rem]"
          )}
        >
          {category.label}
        </Badge>

        <span
          className={cn(
            "ml-auto flex items-center gap-1 text-muted-foreground",
            compact ? "text-[0.7rem]" : "text-xs"
          )}
        >
          <Shield className={cn(compact ? "size-3" : "size-3.5")} />
          {approval.requestedBy}
        </span>
      </CardHeader>

      {/* Body: title + description */}
      <CardContent className={cn(compact && "py-0")}>
        <p
          className={cn(
            "font-semibold leading-snug",
            compact ? "text-sm" : "text-base"
          )}
        >
          {approval.title}
        </p>
        {approval.description && (
          <p
            className={cn(
              "mt-1 line-clamp-2 text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {approval.description}
          </p>
        )}

        {/* Timestamp */}
        {approval.createdAt && (
          <span
            className={cn(
              "mt-1.5 flex items-center gap-1 text-muted-foreground",
              compact ? "text-[0.65rem]" : "text-xs"
            )}
          >
            <Clock className="size-3" />
            {new Date(approval.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </CardContent>

      {/* Footer: action buttons or resolved status */}
      <CardFooter
        className={cn(
          "flex-col items-stretch gap-2",
          compact && "p-2"
        )}
      >
        {isPending ? (
          <>
            <div className="flex items-center gap-2">
              <Button
                size={compact ? "xs" : "sm"}
                className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                onClick={() => onApprove?.(approval.id)}
              >
                <CheckCircle2 data-icon="inline-start" />
                Approve
              </Button>

              <Button
                size={compact ? "xs" : "sm"}
                variant="destructive"
                onClick={() => onReject?.(approval.id)}
              >
                <XCircle data-icon="inline-start" />
                Reject
              </Button>

              <Button
                size={compact ? "xs" : "sm"}
                variant="outline"
                onClick={handleRequestChanges}
              >
                <MessageSquare data-icon="inline-start" />
                Changes
              </Button>
            </div>

            {showFeedback && (
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe the changes needed..."
                  rows={2}
                  className={cn(
                    "w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50",
                    compact && "text-xs"
                  )}
                />
                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    onClick={handleRequestChanges}
                    disabled={!feedback.trim()}
                  >
                    Submit
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setShowFeedback(false);
                      setFeedback("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <StatusBadge
            status={approval.status}
            size={compact ? "sm" : "default"}
          />
        )}
      </CardFooter>
    </Card>
  );
}

export { InlineApprovalCard, CATEGORY_STYLES };
export type { InlineApprovalCardProps };
