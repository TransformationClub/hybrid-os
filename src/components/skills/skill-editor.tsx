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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, X } from "lucide-react";

// ---------- Types ----------

export interface SkillFormData {
  name: string;
  purpose: string;
  description: string;
  workflow: Array<{
    id: string;
    order: number;
    label: string;
    agentId: string;
    action: string;
  }>;
  agents: string[];
  tools: string[];
  qualityBar: string;
  escalationRules: string;
  isActive: boolean;
}

interface SkillEditorProps {
  skill?: {
    id: string;
    name: string;
    purpose: string;
    description?: string | null;
    workflow: Array<{
      id: string;
      order: number;
      label: string;
      agent_id?: string;
      action: string;
    }>;
    agents: string[];
    tools: string[];
    quality_bar?: string | null;
    escalation_rules?: string | null;
    is_active: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: SkillFormData) => void;
}

// ---------- Constants ----------

const AVAILABLE_AGENTS = [
  { id: "orchestrator", label: "Orchestrator" },
  { id: "campaign-strategist", label: "Campaign Strategist" },
  { id: "content-writer", label: "Content Writer" },
  { id: "researcher", label: "Researcher" },
  { id: "qa-reviewer", label: "QA Reviewer" },
  { id: "optimizer", label: "Optimizer" },
];

const AVAILABLE_TOOLS = [
  { id: "searchKnowledge", label: "Search Knowledge" },
  { id: "createWorkItem", label: "Create Work Item" },
  { id: "updateWorkItem", label: "Update Work Item" },
  { id: "requestApproval", label: "Request Approval" },
  { id: "generateContent", label: "Generate Content" },
  { id: "updateSecondBrain", label: "Update Second Brain" },
];

// ---------- Helpers ----------

function createStepId() {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyStep(order: number) {
  return {
    id: createStepId(),
    order,
    label: "",
    agentId: "",
    action: "",
  };
}

// ---------- Component ----------

export function SkillEditor({
  skill,
  open,
  onOpenChange,
  onSave,
}: SkillEditorProps) {
  const isEditing = !!skill;

  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [workflow, setWorkflow] = useState<SkillFormData["workflow"]>([
    emptyStep(1),
  ]);
  const [agents, setAgents] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [qualityBar, setQualityBar] = useState("");
  const [escalationRules, setEscalationRules] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Reset form when dialog opens or skill changes
  useEffect(() => {
    if (open) {
      if (skill) {
        setName(skill.name);
        setPurpose(skill.purpose);
        setDescription(skill.description ?? "");
        setWorkflow(
          skill.workflow.length > 0
            ? skill.workflow.map((s) => ({
                id: s.id,
                order: s.order,
                label: s.label,
                agentId: s.agent_id ?? "",
                action: s.action,
              }))
            : [emptyStep(1)]
        );
        setAgents(skill.agents ?? []);
        setTools(skill.tools ?? []);
        setQualityBar(skill.quality_bar ?? "");
        setEscalationRules(skill.escalation_rules ?? "");
        setIsActive(skill.is_active);
      } else {
        setName("");
        setPurpose("");
        setDescription("");
        setWorkflow([emptyStep(1)]);
        setAgents([]);
        setTools([]);
        setQualityBar("");
        setEscalationRules("");
        setIsActive(true);
      }
    }
  }, [open, skill]);

  const canSave = name.trim() !== "" && purpose.trim() !== "";

  function handleSave() {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      purpose: purpose.trim(),
      description,
      workflow: workflow.map((step, i) => ({ ...step, order: i + 1 })),
      agents,
      tools,
      qualityBar,
      escalationRules,
      isActive,
    });
    onOpenChange(false);
  }

  function addStep() {
    setWorkflow((prev) => [...prev, emptyStep(prev.length + 1)]);
  }

  function removeStep(id: string) {
    setWorkflow((prev) => {
      if (prev.length <= 1) return prev;
      return prev
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  function updateStep(
    id: string,
    field: "label" | "agentId" | "action",
    value: string
  ) {
    setWorkflow((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  function toggleAgent(agentId: string) {
    setAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((a) => a !== agentId)
        : [...prev, agentId]
    );
  }

  function toggleTool(toolId: string) {
    setTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((t) => t !== toolId)
        : [...prev, toolId]
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Skill" : "Create Skill"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this skill's workflow and configuration."
              : "Define a new skill with its workflow steps and quality criteria."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Name + Purpose row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="se-name">Name *</Label>
              <Input
                id="se-name"
                placeholder="e.g. Campaign Brief Builder"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="se-purpose">Purpose *</Label>
              <Input
                id="se-purpose"
                placeholder="e.g. Generate a campaign brief from inputs"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="se-description">Description</Label>
            <Textarea
              id="se-description"
              placeholder="Detailed explanation of what this skill does..."
              className="min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Workflow Builder */}
          <div className="flex flex-col gap-1.5">
            <Label>Workflow Steps</Label>
            <div className="flex flex-col gap-3 rounded-lg border border-border p-3 bg-muted/30">
              {workflow.map((step, index) => (
                <div
                  key={step.id}
                  className="relative flex flex-col gap-2 rounded-md border border-border bg-background p-3"
                >
                  {/* Step header */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-4 shrink-0 text-muted-foreground cursor-grab" />
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <Input
                      placeholder="Step label"
                      className="flex-1"
                      value={step.label}
                      onChange={(e) =>
                        updateStep(step.id, "label", e.target.value)
                      }
                    />
                    <Select
                      value={step.agentId || undefined}
                      onValueChange={(v) => updateStep(step.id, "agentId", v ?? "")}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Assign agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_AGENTS.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {workflow.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeStep(step.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X />
                        <span className="sr-only">Remove step</span>
                      </Button>
                    )}
                  </div>

                  {/* Action description */}
                  <Textarea
                    placeholder="Describe the action this step performs..."
                    className="min-h-[60px] text-sm"
                    value={step.action}
                    onChange={(e) =>
                      updateStep(step.id, "action", e.target.value)
                    }
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStep}
                className="self-start"
              >
                <Plus data-icon="inline-start" />
                Add Step
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Define the ordered steps agents will follow when executing this
              skill.
            </p>
          </div>

          {/* Agents */}
          <div className="flex flex-col gap-1.5">
            <Label>Agents</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_AGENTS.map((agent) => {
                const selected = agents.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => toggleAgent(agent.id)}
                  >
                    <Badge
                      variant={selected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selected ? "" : "hover:bg-muted"
                      )}
                    >
                      {agent.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to toggle which agents participate in this skill.
            </p>
          </div>

          {/* Tools */}
          <div className="flex flex-col gap-1.5">
            <Label>Tools</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TOOLS.map((tool) => {
                const selected = tools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                  >
                    <Badge
                      variant={selected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selected ? "" : "hover:bg-muted"
                      )}
                    >
                      {tool.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to toggle tools available during this skill.
            </p>
          </div>

          {/* Quality Bar */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="se-quality">Quality Bar</Label>
            <Textarea
              id="se-quality"
              placeholder="What defines done for this skill?"
              className="min-h-[80px]"
              value={qualityBar}
              onChange={(e) => setQualityBar(e.target.value)}
            />
          </div>

          {/* Escalation Rules */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="se-escalation">Escalation Rules</Label>
            <Textarea
              id="se-escalation"
              placeholder="What happens when a step fails?"
              className="min-h-[80px]"
              value={escalationRules}
              onChange={(e) => setEscalationRules(e.target.value)}
            />
          </div>

          {/* Active toggle */}
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "flex h-9 w-fit items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors",
                isActive
                  ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {isActive ? "Active" : "Inactive"}
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing ? "Save Changes" : "Create Skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
