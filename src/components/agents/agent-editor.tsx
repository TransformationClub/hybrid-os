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

// ---------- Types ----------

export interface AgentFormData {
  name: string;
  role: string;
  description: string;
  tone: string;
  riskLevel: "low" | "medium" | "high";
  canExecute: boolean;
  requiresApproval: boolean;
  tools: string[];
  systemPrompt: string;
  isActive: boolean;
}

interface AgentEditorProps {
  agent?: {
    id: string;
    name: string;
    role: string;
    description?: string | null;
    tone?: string | null;
    risk_level: string;
    can_execute: boolean;
    requires_approval: boolean;
    tools: string[];
    system_prompt?: string | null;
    is_active: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AgentFormData) => void;
}

// ---------- Constants ----------

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "collaborative", label: "Collaborative" },
  { value: "direct", label: "Direct" },
  { value: "creative", label: "Creative" },
  { value: "analytical", label: "Analytical" },
];

const AVAILABLE_TOOLS = [
  { id: "searchKnowledge", label: "Search Knowledge" },
  { id: "createWorkItem", label: "Create Work Item" },
  { id: "updateWorkItem", label: "Update Work Item" },
  { id: "requestApproval", label: "Request Approval" },
  { id: "generateContent", label: "Generate Content" },
  { id: "updateSecondBrain", label: "Update Second Brain" },
];

const RISK_LEVELS: { value: "low" | "medium" | "high"; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// ---------- Helpers ----------

function riskColor(level: string) {
  switch (level) {
    case "low":
      return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700";
    case "high":
      return "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700";
    default:
      return "";
  }
}

// ---------- Component ----------

export function AgentEditor({
  agent,
  open,
  onOpenChange,
  onSave,
}: AgentEditorProps) {
  const isEditing = !!agent;

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("professional");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("low");
  const [canExecute, setCanExecute] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [tools, setTools] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Reset form when dialog opens or agent changes
  useEffect(() => {
    if (open) {
      if (agent) {
        setName(agent.name);
        setRole(agent.role);
        setDescription(agent.description ?? "");
        setTone(agent.tone ?? "professional");
        setRiskLevel(
          (agent.risk_level as "low" | "medium" | "high") || "low"
        );
        setCanExecute(agent.can_execute);
        setRequiresApproval(agent.requires_approval);
        setTools(agent.tools ?? []);
        setSystemPrompt(agent.system_prompt ?? "");
        setIsActive(agent.is_active);
      } else {
        setName("");
        setRole("");
        setDescription("");
        setTone("professional");
        setRiskLevel("low");
        setCanExecute(false);
        setRequiresApproval(true);
        setTools([]);
        setSystemPrompt("");
        setIsActive(true);
      }
    }
  }, [open, agent]);

  const canSave = name.trim() !== "" && role.trim() !== "";

  function handleSave() {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      role: role.trim(),
      description,
      tone,
      riskLevel,
      canExecute,
      requiresApproval,
      tools,
      systemPrompt,
      isActive,
    });
    onOpenChange(false);
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
            {isEditing ? "Edit Agent" : "Create Agent"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this agent's configuration and capabilities."
              : "Define a new agent with its role, permissions, and tools."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Name + Role row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ae-name">Name *</Label>
              <Input
                id="ae-name"
                placeholder="e.g. Content Strategist"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ae-role">Role *</Label>
              <Input
                id="ae-role"
                placeholder="e.g. content-strategist"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ae-description">Description</Label>
            <Textarea
              id="ae-description"
              placeholder="What does this agent do?"
              className="min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Tone + Active row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v ?? "collaborative")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={cn(
                  "flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                {isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          {/* Risk Level */}
          <div className="flex flex-col gap-1.5">
            <Label>Risk Level</Label>
            <div className="flex gap-2">
              {RISK_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setRiskLevel(level.value)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    riskLevel === level.value
                      ? riskColor(level.value)
                      : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Can Execute</Label>
              <button
                type="button"
                onClick={() => setCanExecute((v) => !v)}
                className={cn(
                  "flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
                  canExecute
                    ? "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                {canExecute ? "Yes" : "No"}
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Requires Approval</Label>
              <button
                type="button"
                onClick={() => setRequiresApproval((v) => !v)}
                className={cn(
                  "flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
                  requiresApproval
                    ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                {requiresApproval ? "Yes" : "No"}
              </button>
            </div>
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
                        selected
                          ? ""
                          : "hover:bg-muted"
                      )}
                    >
                      {tool.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to toggle tools this agent can use.
            </p>
          </div>

          {/* System Prompt */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ae-prompt">System Prompt</Label>
            <Textarea
              id="ae-prompt"
              placeholder="You are a marketing agent that..."
              className="min-h-[180px] font-mono text-sm"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing ? "Save Changes" : "Create Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
