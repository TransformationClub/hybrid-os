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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { renderMarkdown } from "@/lib/markdown";
import type { KnowledgeObject, KnowledgeType } from "@/types";

// ---------- Types ----------

export interface KnowledgeFormData {
  title: string;
  type: KnowledgeType;
  path: string;
  content: string;
  source: "user" | "agent" | "system";
}

interface KnowledgeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledge?: KnowledgeObject | null;
  defaultPath?: string;
  onSave: (data: KnowledgeFormData) => void;
}

// ---------- Constants ----------

const KNOWLEDGE_TYPES: { value: KnowledgeType; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "team", label: "Team" },
  { value: "brand", label: "Brand" },
  { value: "customer", label: "Customer" },
  { value: "product", label: "Product" },
  { value: "strategy", label: "Strategy" },
  { value: "reference", label: "Reference" },
  { value: "skill", label: "Skill" },
  { value: "agent", label: "Agent" },
];

// ---------- Component ----------

export function KnowledgeEditor({
  open,
  onOpenChange,
  knowledge,
  defaultPath,
  onSave,
}: KnowledgeEditorProps) {
  const isEditing = !!knowledge;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<KnowledgeType>("reference");
  const [path, setPath] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState<"user" | "agent" | "system">("user");
  const [activeTab, setActiveTab] = useState<string>("raw");

  // Reset form when dialog opens or knowledge changes
  useEffect(() => {
    if (open) {
      if (knowledge) {
        setTitle(knowledge.title);
        setType(knowledge.type);
        setPath(knowledge.path);
        setContent(knowledge.content);
        setSource(knowledge.source);
      } else {
        setTitle("");
        setType("reference");
        setPath(defaultPath || "");
        setContent("");
        setSource("user");
      }
      setActiveTab("raw");
    }
  }, [open, knowledge, defaultPath]);

  const canSave = title.trim() !== "" && path.trim() !== "";

  function handleSave() {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      type,
      path: path.trim(),
      content,
      source,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Knowledge" : "Add Knowledge"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this knowledge object in your Second Brain."
              : "Create a new knowledge object in your Second Brain."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ke-title">Title</Label>
            <Input
              id="ke-title"
              placeholder="e.g. Brand Voice Guidelines"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Type + Source row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as KnowledgeType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KNOWLEDGE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Source</Label>
              <Select
                value={source}
                onValueChange={(v) => setSource(v as "user" | "agent" | "system")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Path */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ke-path">Path</Label>
            <Input
              id="ke-path"
              placeholder="e.g. context/brand"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
          </div>

          {/* Content with raw/preview tabs */}
          <div className="flex flex-col gap-1.5">
            <Label>Content</Label>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="raw">Raw</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="raw">
                <Textarea
                  placeholder="Write markdown content..."
                  className="min-h-[300px] font-mono text-sm"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </TabsContent>

              <TabsContent value="preview">
                <div
                  className="min-h-[300px] rounded-lg border bg-muted/30 p-4 text-sm prose-sm"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(content) || '<p class="text-muted-foreground">Nothing to preview</p>',
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Last updated (edit mode only) */}
          {isEditing && knowledge && (
            <p className="text-xs text-muted-foreground">
              Last updated: {knowledge.updated_at}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
