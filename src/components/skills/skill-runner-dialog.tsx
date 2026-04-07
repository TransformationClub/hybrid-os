"use client";

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Loader2,
  Circle,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import type { Skill } from "@/types";
import type { SkillRunResult, SkillRunEvent } from "@/lib/skills/mock-runner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepStatus = "pending" | "running" | "completed" | "failed";

interface StepState {
  id: string;
  label: string;
  status: StepStatus;
  output?: unknown;
}

type RunPhase = "idle" | "running" | "completed" | "failed" | "cancelled";

interface SkillRunnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
  workspaceId: string;
  initiativeId?: string;
  onExecute: (
    skill: Skill,
    context: { skillId: string; workspaceId: string; initiativeId?: string; inputs: Record<string, unknown> },
    onEvent: (event: SkillRunEvent) => void,
  ) => Promise<SkillRunResult>;
  onSaveFeedback?: (params: {
    workspaceId: string;
    skillId: string;
    rating: "up" | "down";
    text?: string;
    runStatus?: string;
    totalDuration?: number;
    stepCount?: number;
  }) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Step Status Icon
// ---------------------------------------------------------------------------

function StepStatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "pending":
      return <Circle className="size-4 text-muted-foreground" />;
    case "running":
      return <Loader2 className="size-4 text-blue-500 animate-spin" />;
    case "completed":
      return <Check className="size-4 text-emerald-500" />;
    case "failed":
      return <X className="size-4 text-red-500" />;
  }
}

// ---------------------------------------------------------------------------
// Collapsible Step Output
// ---------------------------------------------------------------------------

function StepOutput({ output }: { output: unknown }) {
  const [expanded, setExpanded] = useState(false);

  if (!output) return null;

  const text =
    typeof output === "string"
      ? output
      : JSON.stringify(output, null, 2);

  return (
    <div className="ml-8 mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        View output
      </button>
      {expanded && (
        <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          {text.slice(0, 2000)}
          {text.length > 2000 && "\n... (truncated)"}
        </pre>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback Section (Part D)
// ---------------------------------------------------------------------------

function FeedbackSection({
  skillId,
  workspaceId,
  result,
  onSaveFeedback,
}: {
  skillId: string;
  workspaceId: string;
  result: SkillRunResult | null;
  onSaveFeedback?: (params: {
    workspaceId: string;
    skillId: string;
    rating: "up" | "down";
    text?: string;
    runStatus?: string;
    totalDuration?: number;
    stepCount?: number;
  }) => Promise<void>;
}) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!rating) return;

    try {
      await onSaveFeedback?.({
        workspaceId,
        skillId,
        rating,
        text: feedbackText || undefined,
        runStatus: result?.status,
        totalDuration: result?.totalDuration,
        stepCount: result?.stepResults.length,
      });
    } catch {
      // Best-effort logging
    }

    setSaved(true);
  }, [rating, feedbackText, skillId, workspaceId, result, onSaveFeedback]);

  if (saved) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        <Check className="size-4 text-emerald-500" />
        Feedback saved. Thanks!
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">How did this run go?</p>
      <div className="flex items-center gap-2">
        <Button
          variant={rating === "up" ? "default" : "outline"}
          size="sm"
          onClick={() => setRating("up")}
        >
          <ThumbsUp className="size-3.5" data-icon="inline-start" />
          Good
        </Button>
        <Button
          variant={rating === "down" ? "destructive" : "outline"}
          size="sm"
          onClick={() => setRating("down")}
        >
          <ThumbsDown className="size-3.5" data-icon="inline-start" />
          Needs work
        </Button>
      </div>
      <Textarea
        placeholder="Optional: share what could be improved..."
        value={feedbackText}
        onChange={(e) => setFeedbackText(e.target.value)}
        rows={2}
        className="text-sm"
      />
      <Button size="sm" onClick={handleSave} disabled={!rating}>
        Save Feedback
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dialog
// ---------------------------------------------------------------------------

export function SkillRunnerDialog({
  open,
  onOpenChange,
  skill,
  workspaceId,
  initiativeId,
  onExecute,
  onSaveFeedback,
}: SkillRunnerDialogProps) {
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [steps, setSteps] = useState<StepState[]>([]);
  const [result, setResult] = useState<SkillRunResult | null>(null);
  const cancelledRef = useRef(false);

  // Compute progress
  const completedCount = steps.filter(
    (s) => s.status === "completed" || s.status === "failed",
  ).length;
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  // ---- Start execution ----
  const handleRun = useCallback(async () => {
    if (!skill) return;

    cancelledRef.current = false;
    setResult(null);

    // Initialize step states from the skill workflow
    const initialSteps: StepState[] = skill.workflow.map((ws) => ({
      id: ws.id,
      label: ws.label,
      status: "pending" as StepStatus,
    }));
    setSteps(initialSteps);
    setPhase("running");

    const onEvent = (event: SkillRunEvent) => {
      if (cancelledRef.current) return;

      if (event.type === "step_started" && event.stepId) {
        setSteps((prev) =>
          prev.map((s) =>
            s.id === event.stepId ? { ...s, status: "running" } : s,
          ),
        );
      }

      if (event.type === "step_completed" && event.stepId) {
        setSteps((prev) =>
          prev.map((s) =>
            s.id === event.stepId
              ? { ...s, status: "completed", output: event.data }
              : s,
          ),
        );
      }

      if (event.type === "step_failed" && event.stepId) {
        setSteps((prev) =>
          prev.map((s) =>
            s.id === event.stepId
              ? { ...s, status: "failed", output: event.data }
              : s,
          ),
        );
      }
    };

    try {
      const runResult = await onExecute(
        skill,
        {
          skillId: skill.id,
          workspaceId,
          initiativeId,
          inputs: {},
        },
        onEvent,
      );

      if (cancelledRef.current) {
        setPhase("cancelled");
        return;
      }

      setResult(runResult);
      setPhase(runResult.status === "completed" ? "completed" : "failed");
    } catch {
      setPhase("failed");
    }
  }, [skill, workspaceId, initiativeId]);

  // ---- Cancel execution ----
  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    setPhase("cancelled");
  }, []);

  // ---- Reset when dialog closes ----
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        // Reset state when closing
        setPhase("idle");
        setSteps([]);
        setResult(null);
        cancelledRef.current = false;
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  if (!skill) return null;

  const isTerminal = phase === "completed" || phase === "failed" || phase === "cancelled";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {phase === "idle" && `Run: ${skill.name}`}
            {phase === "running" && `Running: ${skill.name}`}
            {phase === "completed" && `Completed: ${skill.name}`}
            {phase === "failed" && `Failed: ${skill.name}`}
            {phase === "cancelled" && `Cancelled: ${skill.name}`}
          </DialogTitle>
          <DialogDescription>
            {phase === "idle" && `${skill.workflow.length} steps will be executed.`}
            {phase === "running" && "Executing workflow steps..."}
            {phase === "completed" && "All steps completed successfully."}
            {phase === "failed" && "Workflow encountered errors."}
            {phase === "cancelled" && "Execution was cancelled."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar (visible during and after run) */}
        {phase !== "idle" && (
          <Progress value={progressPercent}>
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedCount}/{steps.length} steps
            </span>
          </Progress>
        )}

        {/* Step list */}
        {steps.length > 0 && (
          <div className="max-h-64 overflow-auto space-y-1">
            {steps.map((step, i) => (
              <div key={step.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    step.status === "running" && "bg-blue-50 dark:bg-blue-950/20",
                    step.status === "failed" && "bg-red-50 dark:bg-red-950/20",
                  )}
                >
                  <StepStatusIcon status={step.status} />
                  <span className="flex-1 truncate">
                    <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                    {step.label}
                  </span>
                  {step.status === "completed" && (
                    <Badge variant="outline" className="text-[10px]">
                      Done
                    </Badge>
                  )}
                  {step.status === "failed" && (
                    <Badge variant="destructive" className="text-[10px]">
                      Failed
                    </Badge>
                  )}
                </div>
                {(step.status === "completed" || step.status === "failed") &&
                  step.output ? <StepOutput output={step.output} /> : null}
              </div>
            ))}
          </div>
        )}

        {/* Completion summary */}
        {phase === "completed" && result && (
          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="size-4" />
                Workflow completed in{" "}
                {result.totalDuration < 1000
                  ? `${result.totalDuration}ms`
                  : `${(result.totalDuration / 1000).toFixed(1)}s`}
              </div>
              {result.stepResults.length > 0 && (
                <p className="mt-1 text-emerald-600 dark:text-emerald-500">
                  {result.stepResults.filter((s) => s.status === "completed").length} of{" "}
                  {result.stepResults.length} steps completed successfully.
                </p>
              )}
            </div>

            {/* Post-execution feedback (Part D) */}
            <FeedbackSection
              skillId={skill.id}
              workspaceId={workspaceId}
              result={result}
              onSaveFeedback={onSaveFeedback}
            />
          </div>
        )}

        {/* Failure summary */}
        {phase === "failed" && (
          <div className="space-y-3">
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-red-700 dark:text-red-400">
                <AlertCircle className="size-4" />
                Workflow failed
              </div>
              {result?.stepResults.some((s) => s.error) && (
                <p className="mt-1 text-red-600 dark:text-red-500">
                  {result.stepResults.find((s) => s.error)?.error}
                </p>
              )}
            </div>

            <FeedbackSection
              skillId={skill.id}
              workspaceId={workspaceId}
              result={result}
              onSaveFeedback={onSaveFeedback}
            />
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          {phase === "idle" && (
            <Button onClick={handleRun}>
              Run Skill
            </Button>
          )}
          {phase === "running" && (
            <Button variant="destructive" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          {isTerminal && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
