"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Save, Trash2, Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";

// ---------- Types ----------

interface WorkItemDetailProps {
  item: {
    id: string;
    title: string;
    description?: string | null;
    type: string;
    status: string;
    priority?: string | null;
    assigned_to?: string | null;
    assigned_agent?: string | null;
    due_date?: string | null;
    created_at: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (id: string, updates: Record<string, unknown>) => void;
  onDelete?: (id: string) => void;
}

// ---------- Constants ----------

const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
] as const;

const TYPE_OPTIONS = [
  { value: "task", label: "Task" },
  { value: "deliverable", label: "Deliverable" },
  { value: "approval", label: "Approval" },
  { value: "blocker", label: "Blocker" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

const typeColors: Record<string, string> = {
  task: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  deliverable:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  approval:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  blocker: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

// ---------- Component ----------

export function WorkItemDetail({
  item,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: WorkItemDetailProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("backlog");
  const [type, setType] = useState("task");
  const [priority, setPriority] = useState("none");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedAgent, setAssignedAgent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [descriptionMode, setDescriptionMode] = useState<"raw" | "preview">(
    "raw"
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync local state when item changes
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description ?? "");
      setStatus(item.status);
      setType(item.type);
      setPriority(item.priority ?? "none");
      setAssignedTo(item.assigned_to ?? "");
      setAssignedAgent(item.assigned_agent ?? "");
      setDueDate(item.due_date ?? "");
      setDescriptionMode("raw");
      setConfirmDelete(false);
      setDirty(false);
    }
  }, [item]);

  if (!item) return null;

  function markDirty() {
    setDirty(true);
  }

  function handleSave() {
    if (!item || !onUpdate) return;
    onUpdate(item.id, {
      title,
      description: description || null,
      status,
      type,
      priority: priority === "none" ? null : priority,
      assigned_to: assignedTo || null,
      assigned_agent: assignedAgent || null,
      due_date: dueDate || null,
    });
    setDirty(false);
  }

  function handleDelete() {
    if (!item || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(item.id);
    setConfirmDelete(false);
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setConfirmDelete(false);
      setDescriptionMode("raw");
    }
    onOpenChange(nextOpen);
  }

  const createdDate = new Date(item.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const typeColor =
    typeColors[item.type] ||
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader className="pr-10">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2">
            <Badge
              className={cn(
                "border-transparent font-medium capitalize",
                typeColor
              )}
            >
              {item.type}
            </Badge>
            <StatusBadge status={status} />
          </div>

          {/* Editable title */}
          <SheetTitle className="sr-only">Work Item Details</SheetTitle>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            className="text-base font-semibold border-transparent hover:border-input focus-visible:border-ring px-1 -mx-1 h-auto py-1"
            placeholder="Work item title"
          />
          <SheetDescription className="sr-only">
            View and edit work item details
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable body */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-6">
            {/* Status + Type row */}
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Status">
                <Select
                  value={status}
                  onValueChange={(val) => {
                    if (val) { setStatus(val); markDirty(); }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <FieldGroup label="Type">
                <Select
                  value={type}
                  onValueChange={(val) => {
                    if (val) { setType(val); markDirty(); }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>

            {/* Priority + Due date row */}
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Priority">
                <Select
                  value={priority}
                  onValueChange={(val) => {
                    if (val) { setPriority(val); markDirty(); }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>

              <FieldGroup label="Due Date">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    markDirty();
                  }}
                />
              </FieldGroup>
            </div>

            {/* Assignment row */}
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Assigned To">
                <Input
                  value={assignedTo}
                  onChange={(e) => {
                    setAssignedTo(e.target.value);
                    markDirty();
                  }}
                  placeholder="User name"
                />
              </FieldGroup>

              <FieldGroup label="Assigned Agent">
                <Input
                  value={assignedAgent}
                  onChange={(e) => {
                    setAssignedAgent(e.target.value);
                    markDirty();
                  }}
                  placeholder="Agent name"
                />
              </FieldGroup>
            </div>

            {/* Description */}
            <FieldGroup
              label="Description"
              trailing={
                <div className="flex items-center gap-1">
                  <Button
                    variant={descriptionMode === "raw" ? "secondary" : "ghost"}
                    size="icon-xs"
                    onClick={() => setDescriptionMode("raw")}
                    aria-label="Edit markdown"
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant={
                      descriptionMode === "preview" ? "secondary" : "ghost"
                    }
                    size="icon-xs"
                    onClick={() => setDescriptionMode("preview")}
                    aria-label="Preview markdown"
                  >
                    <Eye className="size-3" />
                  </Button>
                </div>
              }
            >
              {descriptionMode === "raw" ? (
                <Textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    markDirty();
                  }}
                  placeholder="Add a description (supports markdown)"
                  className="min-h-32 text-sm"
                />
              ) : (
                <div
                  className="min-h-32 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html:
                      renderMarkdown(description) ||
                      '<p class="text-muted-foreground italic">No description</p>',
                  }}
                />
              )}
            </FieldGroup>
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="border-t px-4 py-3">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground">
              Created {createdDate}
            </span>

            <div className="flex items-center gap-2">
              {/* Delete */}
              {onDelete &&
                (confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <Trash2 className="size-3.5 mr-1.5" />
                    Delete
                  </Button>
                ))}

              {/* Save */}
              {onUpdate && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!dirty || !title.trim()}
                >
                  <Save className="size-3.5 mr-1.5" />
                  Save
                </Button>
              )}
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---------- Field Group helper ----------

function FieldGroup({
  label,
  children,
  trailing,
}: {
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        {trailing}
      </div>
      {children}
    </div>
  );
}
