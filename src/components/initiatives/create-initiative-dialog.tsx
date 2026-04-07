"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Target, Users, Sparkles, ArrowLeft } from "lucide-react";

// ---------- Types ----------

export interface InitiativeFormData {
  name: string;
  type: "aeo_campaign" | "abm_campaign" | "custom";
  goal: string;
  brief: string;
  successCriteria: string;
}

interface CreateInitiativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InitiativeFormData) => void;
}

// ---------- Constants ----------

const INITIATIVE_TYPES: {
  value: InitiativeFormData["type"];
  label: string;
  description: string;
  icon: typeof Target;
}[] = [
  {
    value: "aeo_campaign",
    label: "AEO Campaign",
    description: "AI Engine Optimization content strategy",
    icon: Target,
  },
  {
    value: "abm_campaign",
    label: "ABM Campaign",
    description: "Account-based marketing campaign",
    icon: Users,
  },
  {
    value: "custom",
    label: "Custom",
    description: "Custom initiative with flexible workflow",
    icon: Sparkles,
  },
];

// ---------- Component ----------

export function CreateInitiativeDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateInitiativeDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<InitiativeFormData["type"] | null>(null);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [brief, setBrief] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setType(null);
      setName("");
      setGoal("");
      setBrief("");
      setSuccessCriteria("");
    }
  }, [open]);

  const canCreate = name.trim() !== "" && type !== null;

  function handleTypeSelect(value: InitiativeFormData["type"]) {
    setType(value);
    setStep(2);
  }

  function handleBack() {
    setStep(1);
  }

  function handleCreate() {
    if (!canCreate || !type) return;
    onSubmit({
      name: name.trim(),
      type,
      goal: goal.trim(),
      brief: brief.trim(),
      successCriteria: successCriteria.trim(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Initiative</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Choose the type of initiative you want to create."
              : "Fill in the details for your new initiative."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          /* ---- Step 1: Type Selection ---- */
          <div className="flex flex-col gap-3">
            {INITIATIVE_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeSelect(t.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    "hover:border-primary/40 hover:bg-muted/50",
                    type === t.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* ---- Step 2: Details Form ---- */
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-name">Name *</Label>
              <Input
                id="ci-name"
                placeholder="e.g. Q2 AEO Content Sprint"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-goal">Goal</Label>
              <Textarea
                id="ci-goal"
                placeholder="What do you want to achieve?"
                className="min-h-[72px]"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-brief">Brief</Label>
              <Textarea
                id="ci-brief"
                placeholder="Campaign brief or context"
                className="min-h-[72px]"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ci-success">Success Criteria</Label>
              <Textarea
                id="ci-success"
                placeholder="How will you measure success?"
                className="min-h-[72px]"
                value={successCriteria}
                onChange={(e) => setSuccessCriteria(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 2 ? (
            <>
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="size-4" data-icon="inline-start" />
                Back
              </Button>
              <Button onClick={handleCreate} disabled={!canCreate}>
                Create Initiative
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
