"use client";

import { useState, useCallback } from "react";
import {
  Play,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  CircleDot,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlanStep {
  id: string;
  order: number;
  description: string;
  agentName: string;
  estimatedImpact: "low" | "medium" | "high";
  requiresApproval: boolean;
}

export interface ExecutionPlan {
  id: string;
  title: string;
  description?: string;
  steps: PlanStep[];
}

interface PlanPreviewDialogProps {
  plan: ExecutionPlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecute: (plan: ExecutionPlan) => void;
  onReject: () => void;
}

// ---------------------------------------------------------------------------
// Impact badge helper
// ---------------------------------------------------------------------------

const IMPACT_STYLES: Record<string, { bg: string; text: string }> = {
  low: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  medium: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
  },
  high: {
    bg: "bg-red-500/10 dark:bg-red-500/20",
    text: "text-red-700 dark:text-red-400",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PlanPreviewDialog({
  plan,
  open,
  onOpenChange,
  onExecute,
  onReject,
}: PlanPreviewDialogProps) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editedSteps, setEditedSteps] = useState<Record<string, string>>({});
  const [editBuffer, setEditBuffer] = useState("");

  const sortedSteps = [...plan.steps].sort((a, b) => a.order - b.order);
  const approvalCount = sortedSteps.filter((s) => s.requiresApproval).length;

  const handleStartEdit = useCallback(
    (step: PlanStep) => {
      setEditingStepId(step.id);
      setEditBuffer(editedSteps[step.id] ?? step.description);
    },
    [editedSteps],
  );

  const handleSaveEdit = useCallback(() => {
    if (editingStepId && editBuffer.trim()) {
      setEditedSteps((prev) => ({ ...prev, [editingStepId]: editBuffer.trim() }));
    }
    setEditingStepId(null);
    setEditBuffer("");
  }, [editingStepId, editBuffer]);

  const handleCancelEdit = useCallback(() => {
    setEditingStepId(null);
    setEditBuffer("");
  }, []);

  const handleExecute = useCallback(() => {
    const finalSteps = sortedSteps.map((step) => ({
      ...step,
      description: editedSteps[step.id] ?? step.description,
    }));
    onExecute({ ...plan, steps: finalSteps });
  }, [plan, sortedSteps, editedSteps, onExecute]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan.title}</DialogTitle>
          {plan.description && (
            <DialogDescription>{plan.description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Summary bar */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{sortedSteps.length} steps</span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            <ShieldAlert className="size-3" />
            {approvalCount} require{approvalCount !== 1 ? "" : "s"} approval
          </span>
        </div>

        {/* Steps list */}
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {sortedSteps.map((step, idx) => {
            const impact = IMPACT_STYLES[step.estimatedImpact] ?? IMPACT_STYLES.low;
            const isEditing = editingStepId === step.id;
            const displayDescription = editedSteps[step.id] ?? step.description;

            return (
              <div
                key={step.id}
                className="flex gap-3 rounded-lg border border-border p-3"
              >
                {/* Step number */}
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {idx + 1}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-1.5">
                      <textarea
                        value={editBuffer}
                        onChange={(e) => setEditBuffer(e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                      />
                      <div className="flex gap-1.5">
                        <Button size="xs" onClick={handleSaveEdit}>
                          Save
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-snug">{displayDescription}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CircleDot className="size-3" />
                          {step.agentName}
                        </span>
                        <Badge
                          className={cn(
                            "border-transparent text-[0.65rem] px-1.5 h-4",
                            impact.bg,
                            impact.text,
                          )}
                        >
                          {step.estimatedImpact} impact
                        </Badge>
                        {step.requiresApproval && (
                          <Badge className="border-transparent bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-[0.65rem] px-1.5 h-4">
                            <ShieldCheck className="size-3 mr-0.5" />
                            Approval
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Edit button */}
                {!isEditing && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => handleStartEdit(step)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" onClick={onReject} />}
          >
            <X className="size-4 mr-1" />
            Reject Plan
          </DialogClose>
          <Button onClick={handleExecute}>
            <Play className="size-4 mr-1" />
            Execute Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { PlanPreviewDialog };
export type { PlanPreviewDialogProps };
