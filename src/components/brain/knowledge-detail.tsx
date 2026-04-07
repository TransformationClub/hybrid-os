"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, ChevronRight, User, Bot, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderMarkdown } from "@/lib/markdown";
import type { KnowledgeObject } from "@/types";

// ---------- Types ----------

interface KnowledgeDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledge: KnowledgeObject | null;
  onEdit: () => void;
  onDelete: () => void;
}

// ---------- Helpers ----------

const sourceConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  user: {
    label: "User",
    icon: User,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  agent: {
    label: "Agent",
    icon: Bot,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  system: {
    label: "System",
    icon: Monitor,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
};

const typeColors: Record<string, string> = {
  company:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  brand: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  customer:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  product: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  strategy:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  reference:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  team: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  skill:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  agent:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

// ---------- Component ----------

export function KnowledgeDetail({
  open,
  onOpenChange,
  knowledge,
  onEdit,
  onDelete,
}: KnowledgeDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!knowledge) return null;

  const src = sourceConfig[knowledge.source] || sourceConfig.user;
  const SrcIcon = src.icon;
  const typeColor = typeColors[knowledge.type] || typeColors.reference;

  // Build path breadcrumb segments
  const pathSegments = knowledge.path.split("/").filter(Boolean);

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete();
    setConfirmDelete(false);
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) setConfirmDelete(false);
    onOpenChange(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader className="pr-10">
          {/* Actions row */}
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-3.5 mr-1.5" />
              Edit
            </Button>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  Confirm Delete
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
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 className="size-3.5 mr-1.5" />
                Delete
              </Button>
            )}
          </div>

          <SheetTitle>{knowledge.title}</SheetTitle>
          <SheetDescription className="sr-only">
            Knowledge object details
          </SheetDescription>

          {/* Badges */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                typeColor
              )}
            >
              {knowledge.type}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                src.color
              )}
            >
              <SrcIcon className="size-3" />
              {src.label}
            </span>
          </div>

          {/* Path breadcrumb */}
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            {pathSegments.map((segment, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" />}
                <span className="capitalize">{segment}</span>
              </span>
            ))}
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1 px-4">
          <div
            className="text-sm leading-relaxed pb-6"
            dangerouslySetInnerHTML={{
              __html:
                renderMarkdown(knowledge.content) ||
                '<p class="text-muted-foreground italic">No content</p>',
            }}
          />
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Last updated: {knowledge.updated_at}
        </div>
      </SheetContent>
    </Sheet>
  );
}
