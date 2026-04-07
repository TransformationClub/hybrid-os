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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------- Types ----------

export interface WorkItemFormData {
  title: string;
  description: string;
  type: "task" | "deliverable" | "approval" | "blocker";
  status: string;
  priority: "low" | "medium" | "high" | "";
  assignedAgent: string;
  dueDate: string;
}

interface CreateWorkItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WorkItemFormData) => void;
  defaultStatus?: string;
}

// ---------- Constants ----------

const WORK_ITEM_TYPES: { value: WorkItemFormData["type"]; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "deliverable", label: "Deliverable" },
  { value: "approval", label: "Approval" },
  { value: "blocker", label: "Blocker" },
];

const STATUSES = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const PRIORITIES: { value: WorkItemFormData["priority"]; label: string }[] = [
  { value: "", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const AGENTS = [
  { value: "unassigned", label: "Unassigned" },
  { value: "orchestrator", label: "Orchestrator" },
  { value: "campaign-strategist", label: "Campaign Strategist" },
  { value: "content-writer", label: "Content Writer" },
  { value: "researcher", label: "Researcher" },
  { value: "qa-reviewer", label: "QA Reviewer" },
  { value: "optimizer", label: "Optimizer" },
];

// ---------- Component ----------

export function CreateWorkItemDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultStatus,
}: CreateWorkItemDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WorkItemFormData["type"]>("task");
  const [status, setStatus] = useState(defaultStatus ?? "todo");
  const [priority, setPriority] = useState<WorkItemFormData["priority"]>("");
  const [assignedAgent, setAssignedAgent] = useState("unassigned");
  const [dueDate, setDueDate] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setType("task");
      setStatus(defaultStatus ?? "todo");
      setPriority("");
      setAssignedAgent("unassigned");
      setDueDate("");
    }
  }, [open, defaultStatus]);

  const canCreate = title.trim() !== "";

  function handleCreate() {
    if (!canCreate) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      type,
      status,
      priority,
      assignedAgent: assignedAgent === "unassigned" ? "" : assignedAgent,
      dueDate,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Work Item</DialogTitle>
          <DialogDescription>
            Add a new work item to the initiative.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cwi-title">Title *</Label>
            <Input
              id="cwi-title"
              placeholder="e.g. Draft landing page copy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Type + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setType((v ?? "task") as WorkItemFormData["type"])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_ITEM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v ?? "todo")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority + Agent row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) =>
                  setPriority(
                    (v ?? "") as WorkItemFormData["priority"]
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Assigned Agent</Label>
              <Select
                value={assignedAgent}
                onValueChange={(v) => setAssignedAgent(v ?? "unassigned")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {AGENTS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cwi-due">Due Date</Label>
            <Input
              id="cwi-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cwi-desc">Description</Label>
            <Textarea
              id="cwi-desc"
              placeholder="Optional details or context"
              className="min-h-[72px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            Create Work Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
