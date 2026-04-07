"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  ChevronRight,
  Clock,
  Rocket,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons/page-skeletons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { ApprovalQueue } from "@/components/approvals/approval-queue";
import {
  mockApprovalCards as rawMockApprovals,
  mockActivityFeed as mockActivityFeed,
  mockContinueWorking as mockContinueWorking,
} from "@/lib/mock-data";
import type { ActivityFeedItem, ContinueWorkingItem } from "@/lib/mock-data";
import { getApprovals, resolveApproval } from "@/lib/approvals/actions";
import { getInitiatives } from "@/lib/initiatives/actions";
import { fetchRecentEvents } from "@/lib/events/actions";
import type { Approval, Initiative, AppEvent } from "@/types";
import {
  Bot,
  CheckCircle2,
  Brain,
  Zap,
  FileText,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Map mock approval data to the shape expected by ApprovalQueue
const mockApprovals = rawMockApprovals.map((a) => ({
  id: a.id,
  title: a.title,
  category: a.category,
  status: "pending" as const,
  requestedBy: a.requestedBy.name,
  initiative: a.initiative,
  createdAt: undefined as string | undefined,
}));

type ApprovalDisplayCategory = "content" | "communication" | "execution" | "workflow" | "integration";

/** Transform server Approval[] into the shape ApprovalQueue expects */
function transformApprovals(
  serverApprovals: Approval[]
) {
  return serverApprovals.map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category as ApprovalDisplayCategory,
    status: "pending" as const,
    requestedBy: a.requested_by,
    initiative: a.initiative_id,
    createdAt: a.created_at as string | undefined,
  }));
}

/** Transform server Initiative[] into ContinueWorkingItem[] */
function transformInitiatives(
  initiatives: Initiative[]
): ContinueWorkingItem[] {
  const typeMap: Record<string, ContinueWorkingItem["type"]> = {
    "abm-campaign": "abm-campaign",
    "aeo-campaign": "aeo-campaign",
    custom: "custom",
  };
  return initiatives.slice(0, 3).map((ini) => ({
    id: ini.id,
    title: ini.title,
    type: typeMap[ini.type] ?? "custom",
    progress: ini.status === "completed" ? 100 : ini.status === "active" ? 50 : ini.status === "planning" ? 20 : 0,
    lastActivity: ini.goal ?? "No description",
    lastActivityTime: timeAgo(ini.updated_at),
  }));
}

/** Transform server AppEvent[] into ActivityFeedItem[] */
function transformEvents(events: AppEvent[]): ActivityFeedItem[] {
  const iconMap: Record<string, { icon: LucideIcon; iconColor: string; iconBg: string }> = {
    "approval.requested": { icon: CheckCircle2, iconColor: "text-warning", iconBg: "bg-warning/10" },
    "approval.resolved": { icon: CheckCircle2, iconColor: "text-success", iconBg: "bg-success/10" },
    "work_item.created": { icon: FileText, iconColor: "text-muted-foreground", iconBg: "bg-muted" },
    "work_item.updated": { icon: Zap, iconColor: "text-warning", iconBg: "bg-warning/10" },
    "agent.run_started": { icon: Bot, iconColor: "text-primary", iconBg: "bg-primary/10" },
    "agent.run_completed": { icon: Bot, iconColor: "text-success", iconBg: "bg-success/10" },
    "agent.run_failed": { icon: Bot, iconColor: "text-destructive", iconBg: "bg-destructive/10" },
  };

  const defaultIcon = { icon: Brain, iconColor: "text-info", iconBg: "bg-info/10" };

  return events.map((ev) => {
    const mapping = iconMap[ev.type] ?? defaultIcon;
    const desc = ev.metadata
      ? `${ev.actor_id} ${(ev.metadata as Record<string, string>).action ?? ev.type} on ${ev.entity_type}`
      : `${ev.type} by ${ev.actor_id}`;
    return {
      id: ev.id,
      icon: mapping.icon,
      iconColor: mapping.iconColor,
      iconBg: mapping.iconBg,
      description: desc,
      timestamp: timeAgo(ev.created_at),
    };
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

const typeLabels: Record<string, string> = {
  "abm-campaign": "ABM",
  "aeo-campaign": "AEO",
  custom: "Custom",
};

const typeBadgeColors: Record<string, string> = {
  "abm-campaign": "bg-primary/10 text-primary",
  "aeo-campaign": "bg-info/10 text-info",
  custom: "bg-muted text-muted-foreground",
};

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Mini sparkline placeholder (pure CSS)
// ---------------------------------------------------------------------------

function MiniSparkline({ trend }: { trend: "up" | "down" | "flat" }) {
  const bars =
    trend === "up"
      ? [30, 45, 35, 55, 50, 70, 80]
      : trend === "down"
        ? [70, 65, 55, 60, 45, 35, 30]
        : [50, 55, 48, 52, 50, 53, 51];

  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-primary/60 transition-all"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini area chart placeholder (CSS-only "risk" visual)
// ---------------------------------------------------------------------------

function MiniRiskChart() {
  return (
    <div className="relative h-10 w-full overflow-hidden rounded-md">
      <div className="absolute inset-0 bg-gradient-to-t from-destructive/20 to-transparent" />
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M0 35 L15 28 L30 32 L45 20 L60 25 L75 15 L100 18"
          fill="none"
          stroke="var(--destructive)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
        <path
          d="M0 35 L15 28 L30 32 L45 20 L60 25 L75 15 L100 18 L100 40 L0 40 Z"
          fill="var(--destructive)"
          opacity="0.08"
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CommandCenterPage() {
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState(mockApprovals);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>(mockActivityFeed);
  const [continueWorking, setContinueWorking] = useState<ContinueWorkingItem[]>(mockContinueWorking);
  const [initiativeCount, setInitiativeCount] = useState(3);

  // Fetch real data on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [approvalsResult, initiativesResult, eventsResult] = await Promise.all([
          getApprovals({ workspaceId: "default", status: "pending", limit: 5 }),
          getInitiatives("default"),
          fetchRecentEvents("default", 10),
        ]);

        if (cancelled) return;

        // Approvals
        if (approvalsResult.data && approvalsResult.data.length > 0) {
          setApprovals(transformApprovals(approvalsResult.data));
        }

        // Initiatives -> Continue Working + count
        if (initiativesResult.data && initiativesResult.data.length > 0) {
          setInitiativeCount(initiativesResult.data.length);
          const active = initiativesResult.data.filter(
            (i) => i.status === "active" || i.status === "planning"
          );
          if (active.length > 0) {
            setContinueWorking(transformInitiatives(active));
          }
        }

        // Events -> Activity Feed
        if (eventsResult && eventsResult.length > 0) {
          setActivityFeed(transformEvents(eventsResult));
        }
      } catch (err) {
        console.error("[CommandCenter] Failed to fetch data:", err);
        // Keep mock data on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const handleApprove = useCallback(async (id: string) => {
    const result = await resolveApproval({
      approvalId: id,
      status: "approved",
      reviewedBy: "user",
    });
    if (!result.error) {
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    const result = await resolveApproval({
      approvalId: id,
      status: "rejected",
      reviewedBy: "user",
    });
    if (!result.error) {
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    }
  }, []);

  const handleRequestChanges = useCallback(async (id: string, feedback: string) => {
    const result = await resolveApproval({
      approvalId: id,
      status: "changes_requested",
      reviewedBy: "user",
      feedback,
    });
    if (!result.error) {
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    }
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col gap-8 p-6 pb-12 max-w-6xl mx-auto">
      {/* ---- Page Header ---- */}
      <div>
        <p className="text-sm text-muted-foreground">{formatDate()}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight mt-1">
          Welcome back, Luke
        </h1>
        <p className="text-muted-foreground mt-0.5">Command Center</p>
      </div>

      {/* ---- At-a-Glance Cards ---- */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Active Initiatives */}
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Active Initiatives
            </CardTitle>
            <CardAction>
              <Activity className="h-4 w-4 text-muted-foreground/50" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-semibold tracking-tight">{initiativeCount}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-success" />
                <span className="text-success font-medium">+1</span> this week
              </p>
            </div>
            <MiniSparkline trend="up" />
          </CardContent>
        </Card>

        {/* Campaign Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Campaign Health
            </CardTitle>
            <CardAction>
              <ShieldAlert className="h-4 w-4 text-destructive/50" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-3xl font-semibold tracking-tight">
                  2{" "}
                  <span className="text-sm font-normal text-destructive">
                    at risk
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  1 on track, 0 blocked
                </p>
              </div>
            </div>
            <MiniRiskChart />
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Upcoming
            </CardTitle>
            <CardAction>
              <CalendarClock className="h-4 w-4 text-muted-foreground/50" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Rocket className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  Product Launch v3.2
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Launch date: Apr 18, 2026
                </p>
                <p className="text-xs text-muted-foreground">
                  13 days away &middot; 8 tasks remaining
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ---- Approvals Queue ---- */}
      <section>
        <ApprovalQueue
          approvals={approvals}
          maxItems={5}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestChanges={handleRequestChanges}
        />
      </section>

      {/* ---- Two-column: Activity + Continue Working ---- */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Recent Activity */}
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Recent Activity
            </h2>
            <Button variant="ghost" size="sm">
              View all
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {activityFeed.map((event) => {
                  const Icon = event.icon;
                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${event.iconBg}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${event.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm leading-snug">
                          {event.description}
                        </p>
                      </div>
                      <span className="shrink-0 pt-0.5 text-xs text-muted-foreground whitespace-nowrap">
                        {event.timestamp}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Continue Working */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Continue Working
            </h2>
          </div>

          <div className="flex flex-col gap-3">
              {continueWorking.map((item) => (
                <Card
                  key={item.id}
                  size="sm"
                  className="group/continue cursor-pointer hover:ring-primary/30 transition-all"
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${typeBadgeColors[item.type] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {typeLabels[item.type] ?? "Other"}
                      </span>
                      <CardTitle className="truncate text-sm">
                        {item.title}
                      </CardTitle>
                    </div>
                    <CardAction>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/continue:opacity-100 transition-opacity" />
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Progress value={item.progress}>
                      <ProgressLabel className="text-xs text-muted-foreground sr-only">
                        Progress
                      </ProgressLabel>
                      <ProgressValue />
                    </Progress>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="truncate">{item.lastActivity}</span>
                      <span className="shrink-0">&middot; {item.lastActivityTime}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </section>
      </div>
    </div>
  );
}
