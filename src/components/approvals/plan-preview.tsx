"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Pause,
  Play,
  X,
  ChevronDown,
  ChevronRight,
  Bot,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

interface PlanStep {
  id: string;
  title: string;
  description?: string;
  agent?: string;
  status: StepStatus;
  output?: string;
}

interface PlanPreviewProps {
  title: string;
  description?: string;
  steps: PlanStep[];
  status: "preview" | "executing" | "paused" | "completed" | "cancelled";
  onApprove?: () => void;
  onReject?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onEditStep?: (stepId: string, updates: Partial<PlanStep>) => void;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Step status icon
// ---------------------------------------------------------------------------

const stepStatusIcon: Record<StepStatus, React.ReactNode> = {
  pending: <Circle className="size-4 text-muted-foreground" />,
  running: <Loader2 className="size-4 animate-spin text-primary" />,
  completed: <CheckCircle2 className="size-4 text-emerald-500" />,
  failed: <X className="size-4 text-red-500" />,
  skipped: <Circle className="size-4 text-muted-foreground/50" />,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PlanPreview({
  title,
  description,
  steps,
  status,
  onApprove,
  onReject,
  onPause,
  onResume,
  onCancel,
  compact = false,
}: PlanPreviewProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const isPreview = status === "preview";
  const isExecuting = status === "executing";
  const isPaused = status === "paused";
  const isDone = status === "completed" || status === "cancelled";

  return (
    <Card
      size={compact ? "sm" : "default"}
      className={cn(
        "border-primary/20 bg-primary/[0.02]",
        isExecuting && "ring-1 ring-primary/30"
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="size-3" />
          </div>
          <CardTitle className={compact ? "text-sm" : undefined}>
            {title}
          </CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}

        {/* Progress indicator */}
        {!isPreview && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isDone && status === "cancelled"
                    ? "bg-muted-foreground"
                    : "bg-primary"
                )}
                style={{
                  width: `${steps.length > 0 ? (completedCount / steps.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedCount}/{steps.length}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className={cn(compact && "py-0")}>
        {/* Steps list */}
        <div className="flex flex-col">
          {steps.map((step, i) => {
            const isExpanded = expandedStep === step.id;
            const isLast = i === steps.length - 1;

            return (
              <div key={step.id} className="relative flex gap-3">
                {/* Vertical connector line */}
                {!isLast && (
                  <div className="absolute left-[7.5px] top-6 bottom-0 w-px bg-border" />
                )}

                {/* Status icon */}
                <div className="relative z-10 mt-0.5 shrink-0">
                  {stepStatusIcon[step.status]}
                </div>

                {/* Step content */}
                <div className={cn("min-w-0 flex-1 pb-4", isLast && "pb-0")}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStep(isExpanded ? null : step.id)
                    }
                    className="flex w-full items-start gap-1.5 text-left"
                  >
                    <span
                      className={cn(
                        "text-sm font-medium leading-snug",
                        step.status === "completed" && "text-muted-foreground line-through",
                        step.status === "skipped" && "text-muted-foreground/50 line-through"
                      )}
                    >
                      {step.title}
                    </span>
                    {step.agent && (
                      <Badge
                        variant="outline"
                        className="ml-auto shrink-0 text-[0.6rem] h-4 px-1"
                      >
                        {step.agent}
                      </Badge>
                    )}
                    {(step.description || step.output) && (
                      isExpanded ? (
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
                      ) : (
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground mt-0.5" />
                      )
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-1.5 space-y-1.5">
                      {step.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      )}
                      {step.output && (
                        <div className="rounded-md bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground leading-relaxed">
                          {step.output}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        {isPreview && (
          <>
            <Button
              size={compact ? "xs" : "sm"}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onApprove}
            >
              <CheckCircle2 data-icon="inline-start" />
              Approve & Execute
            </Button>
            <Button
              size={compact ? "xs" : "sm"}
              variant="outline"
              onClick={onReject}
            >
              <X data-icon="inline-start" />
              Reject
            </Button>
          </>
        )}

        {isExecuting && (
          <>
            <Button
              size={compact ? "xs" : "sm"}
              variant="outline"
              onClick={onPause}
            >
              <Pause data-icon="inline-start" />
              Pause
            </Button>
            <Button
              size={compact ? "xs" : "sm"}
              variant="destructive"
              onClick={onCancel}
            >
              <X data-icon="inline-start" />
              Cancel
            </Button>
          </>
        )}

        {isPaused && (
          <>
            <Button
              size={compact ? "xs" : "sm"}
              onClick={onResume}
            >
              <Play data-icon="inline-start" />
              Resume
            </Button>
            <Button
              size={compact ? "xs" : "sm"}
              variant="destructive"
              onClick={onCancel}
            >
              <X data-icon="inline-start" />
              Cancel
            </Button>
          </>
        )}

        {isDone && (
          <Badge
            variant="secondary"
            className={cn(
              status === "completed"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {status === "completed" ? "Completed" : "Cancelled"}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}

export { PlanPreview };
export type { PlanPreviewProps, PlanStep, StepStatus };
