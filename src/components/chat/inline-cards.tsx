"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface ApprovalResult {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  initiative_id?: string;
  work_item_id?: string;
  created_at?: string;
}

interface WorkItemResult {
  id: string;
  title: string;
  type: string;
  status: string;
  initiative_id?: string;
  assigned_agent?: string;
  due_date?: string;
  created_at?: string;
}

interface ContentResult {
  id: string;
  title: string;
  content_type: string;
  brief?: string;
  outline?: string;
  status: string;
  message?: string;
  initiative_id?: string;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// ApprovalCard
// ---------------------------------------------------------------------------

const categoryColors: Record<string, string> = {
  content:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  workflow:
    "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  execution:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  integration:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  communication:
    "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
};

export function ApprovalCard({
  approval,
  onAction,
}: {
  approval: ApprovalResult;
  onAction?: (action: "approve" | "reject", id: string) => void;
}) {
  return (
    <Card
      size="sm"
      className="w-full max-w-[280px] border-l-2 border-l-amber-400 dark:border-l-amber-500"
    >
      <CardContent className="flex flex-col gap-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold leading-snug">{approval.title}</p>
          <Badge
            variant="secondary"
            className={`shrink-0 text-[9px] ${categoryColors[approval.category] ?? ""}`}
          >
            {approval.category}
          </Badge>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
          {approval.description}
        </p>
        {approval.status === "pending" && onAction && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <Button
              size="xs"
              className="h-5 gap-1 text-[10px]"
              onClick={() => onAction("approve", approval.id)}
            >
              <CheckCircle2 className="size-3" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="xs"
              className="h-5 gap-1 text-[10px]"
              onClick={() => onAction("reject", approval.id)}
            >
              <XCircle className="size-3" />
              Reject
            </Button>
          </div>
        )}
        {approval.status !== "pending" && (
          <Badge
            variant="secondary"
            className={`w-fit text-[9px] ${
              approval.status === "approved"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {approval.status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// WorkItemCard
// ---------------------------------------------------------------------------

const typeBadgeColor: Record<string, string> = {
  task: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  deliverable:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  approval:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  blocker: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusBadgeColor: Record<string, string> = {
  backlog: "bg-muted text-muted-foreground",
  todo: "bg-muted text-muted-foreground",
  in_progress:
    "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  review:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function WorkItemCard({
  workItem,
  onAction,
}: {
  workItem: WorkItemResult;
  onAction?: (action: "view", id: string) => void;
}) {
  return (
    <Card
      size="sm"
      className="w-full max-w-[280px] border-l-2 border-l-sky-400 dark:border-l-sky-500"
    >
      <CardContent className="flex flex-col gap-2 pt-3">
        <p className="text-xs font-semibold leading-snug">{workItem.title}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="secondary"
            className={`text-[9px] ${typeBadgeColor[workItem.type] ?? ""}`}
          >
            {workItem.type}
          </Badge>
          <Badge
            variant="secondary"
            className={`text-[9px] ${statusBadgeColor[workItem.status] ?? ""}`}
          >
            {workItem.status.replace("_", " ")}
          </Badge>
          {workItem.assigned_agent && (
            <span className="text-[9px] text-muted-foreground">
              {workItem.assigned_agent}
            </span>
          )}
        </div>
        {onAction && (
          <Button
            variant="ghost"
            size="xs"
            className="h-5 w-fit gap-1 text-[10px] text-muted-foreground"
            onClick={() => onAction("view", workItem.id)}
          >
            <ExternalLink className="size-2.5" />
            View on Board
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ContentCard
// ---------------------------------------------------------------------------

const contentTypeLabels: Record<string, string> = {
  blog_post: "Blog Post",
  email: "Email",
  social_post: "Social Post",
  ad_copy: "Ad Copy",
  landing_page: "Landing Page",
  case_study: "Case Study",
  whitepaper: "Whitepaper",
  other: "Content",
};

export function ContentCard({
  deliverable,
  onAction,
}: {
  deliverable: ContentResult;
  onAction?: (action: "expand" | "collapse", id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    onAction?.(next ? "expand" : "collapse", deliverable.id);
  };

  return (
    <Card
      size="sm"
      className="w-full max-w-[280px] border-l-2 border-l-violet-400 dark:border-l-violet-500"
    >
      <CardContent className="flex flex-col gap-2 pt-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold leading-snug">
            {deliverable.title}
          </p>
          <Badge variant="secondary" className="shrink-0 text-[9px]">
            {contentTypeLabels[deliverable.content_type] ??
              deliverable.content_type}
          </Badge>
        </div>
        {deliverable.message && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {deliverable.message}
          </p>
        )}
        {deliverable.brief && (
          <>
            <Button
              variant="ghost"
              size="xs"
              className="h-5 w-fit gap-1 text-[10px] text-muted-foreground"
              onClick={handleToggle}
            >
              {expanded ? (
                <ChevronUp className="size-2.5" />
              ) : (
                <ChevronDown className="size-2.5" />
              )}
              {expanded ? "Hide Preview" : "Show Preview"}
            </Button>
            {expanded && (
              <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-border pt-2">
                {deliverable.brief}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
